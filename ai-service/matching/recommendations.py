"""Advice on how to improve an application.

Recommendations are text only: they are produced *after* the score and can
never change it. Rule-based by default; an optional LLM provider can be
plugged in through `RecommendationProvider`.

Enabling an LLM (any OpenAI-compatible chat endpoint, e.g. a local Ollama):
    LLM_BASE_URL=http://localhost:11434/v1
    LLM_MODEL=llama3.1:8b
    LLM_API_KEY=...            # only if the server requires one
    LLM_TIMEOUT_SECONDS=20
If the LLM fails, times out or answers badly, rule-based advice is used.
"""

import json
import logging
import os
import urllib.request
from dataclasses import dataclass, field
from typing import Protocol

from .wording import min_years, years

log = logging.getLogger(__name__)

MIN_RECOMMENDATIONS = 2
MAX_RECOMMENDATIONS = 4


@dataclass
class RecommendationContext:
    offer_title: str
    overall_score: int
    matched_skills: list = field(default_factory=list)          # display names
    partial_skills: list = field(default_factory=list)          # (offer skill, candidate skill) display names
    missing_required: list = field(default_factory=list)
    missing_nice_to_have: list = field(default_factory=list)
    required_years: float | None = None
    candidate_years: float = 0.0                                 # years relevant to this offer
    candidate_total_years: float = 0.0                           # all years found in the CV
    required_education: str | None = None
    candidate_education: str | None = None
    education_gap: bool = False
    language_gaps: list = field(default_factory=list)          # (language, required level, candidate level or None)
    relevance_score: int = 0


class RecommendationProvider(Protocol):
    name: str

    def recommend(self, context: RecommendationContext) -> list[str]:
        ...


def _join(items):
    items = list(items)
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


class RuleBasedRecommendationProvider:
    """Turns the largest gaps of the breakdown into concrete advice, most important first."""

    name = "rules"

    def recommend(self, c: RecommendationContext) -> list[str]:
        advice = []

        if c.missing_required:
            top = c.missing_required[:3]
            advice.append(
                f"The offer requires {_join(top)}, which your CV doesn't mention. If you have used "
                f"{'it' if len(top) == 1 else 'them'}, add a concrete example (project, context, result); "
                f"otherwise a small hands-on project before applying would close the gap."
            )

        if c.partial_skills:
            wanted, have = c.partial_skills[0]
            advice.append(
                f"Your CV mentions {have}, but the offer asks for {wanted}. If you have worked with "
                f"{wanted}, name it explicitly - recruiters and screening tools look for the exact term."
            )

        if c.required_years and c.candidate_years < c.required_years:
            if c.candidate_total_years == 0:
                advice.append(
                    f"The offer asks for {min_years(c.required_years)} of experience, but no dated experience was "
                    f"found in your CV. Add start and end dates to each role (e.g. \"Jan 2021 - Mar 2023\")."
                )
            elif c.candidate_years == 0:
                key_skills = _join((c.missing_required + c.matched_skills)[:2]) or "the offer's skills"
                advice.append(
                    f"The offer asks for {min_years(c.required_years)} of relevant experience; none of the roles in "
                    f"your CV mention {key_skills}. If you used them at work, describe it in the relevant role."
                )
            else:
                advice.append(
                    f"The offer asks for {min_years(c.required_years)} of experience; your CV shows about "
                    f"{years(c.candidate_years)}. Include internships, freelance work and projects with dates so all "
                    f"of your relevant experience counts."
                )

        if c.education_gap and c.required_education:
            if c.candidate_education:
                advice.append(
                    f"The offer asks for a {c.required_education}; your CV shows a {c.candidate_education}. "
                    f"Highlight certifications or experience that demonstrate an equivalent level."
                )
            else:
                advice.append(
                    f"The offer asks for a {c.required_education}, and no degree was found in your CV. "
                    f"Add an Education section with your diplomas and their dates."
                )

        for language, required_level, candidate_level in c.language_gaps[:1]:
            if candidate_level:
                advice.append(
                    f"The offer expects {required_level} {language}; your CV indicates {candidate_level}. "
                    f"If your level is higher, state it precisely (e.g. C1) or mention a certificate."
                )
            else:
                advice.append(
                    f"The offer requires {language}, which your CV doesn't list. Add a Languages section "
                    f"with your level (e.g. B2, C1, fluent)."
                )

        if c.relevance_score < 50:
            advice.append(
                f"Your CV's summary and role descriptions don't closely reflect a \"{c.offer_title}\" position. "
                f"Rewrite your summary around this role's main responsibilities."
            )

        if c.missing_nice_to_have:
            advice.append(
                f"Nice-to-have skills for this role: {_join(c.missing_nice_to_have[:3])}. Mentioning any of them "
                f"would make your application stand out."
            )

        # Strong applications still get specific, useful advice.
        if len(advice) < MIN_RECOMMENDATIONS and c.matched_skills:
            advice.append(
                f"Quantify your results with {_join(c.matched_skills[:2])} (e.g. performance gains, users "
                f"served, delivery time) - it turns a skills list into evidence."
            )
        if len(advice) < MIN_RECOMMENDATIONS:
            advice.append(
                f"Put the experience most relevant to \"{c.offer_title}\" at the top of your CV so it is "
                f"the first thing a recruiter reads."
            )
        if len(advice) < MIN_RECOMMENDATIONS:
            advice.append("Add a short cover letter explaining why this specific role interests you.")

        return advice[:MAX_RECOMMENDATIONS]


class OpenAICompatibleRecommendationProvider:
    """Any server exposing POST {base_url}/chat/completions (Ollama, LM Studio, vLLM, llama.cpp...)."""

    name = "llm"

    def __init__(self, base_url, model, api_key=None, timeout=20.0):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

    def _prompt(self, c: RecommendationContext):
        facts = {
            "offer_title": c.offer_title,
            "overall_score": c.overall_score,
            "matched_skills": c.matched_skills,
            "partially_matched_skills": [f"has {have}, offer asks {wanted}" for wanted, have in c.partial_skills],
            "missing_required_skills": c.missing_required,
            "missing_nice_to_have_skills": c.missing_nice_to_have,
            "required_years": c.required_years,
            "candidate_relevant_years": c.candidate_years,
            "candidate_total_years": c.candidate_total_years,
            "required_education": c.required_education,
            "candidate_education": c.candidate_education,
            "language_gaps": [{"language": l, "required": r, "candidate": cl} for l, r, cl in c.language_gaps],
        }
        return (
            "You advise a job candidate on improving their application. Using ONLY these facts, write "
            f"{MIN_RECOMMENDATIONS} to {MAX_RECOMMENDATIONS} concrete, specific recommendations, most important "
            "first. Do not invent skills or experience. Reply with a JSON array of strings and nothing else.\n"
            + json.dumps(facts, ensure_ascii=False)
        )

    def recommend(self, context: RecommendationContext) -> list[str]:
        body = json.dumps({
            "model": self.model,
            "temperature": 0.2,
            "messages": [{"role": "user", "content": self._prompt(context)}],
        }).encode()
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(f"{self.base_url}/chat/completions", data=body, headers=headers)
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            payload = json.loads(response.read())
        content = payload["choices"][0]["message"]["content"].strip()
        if content.startswith("```"):
            content = content.strip("`").removeprefix("json").strip()
        items = json.loads(content)
        if not isinstance(items, list):
            raise ValueError("LLM did not return a JSON array")
        items = [str(i).strip() for i in items if isinstance(i, str) and i.strip()]
        items = [i if len(i) <= 400 else i[:397] + "..." for i in items]
        if len(items) < MIN_RECOMMENDATIONS:
            raise ValueError("LLM returned too few recommendations")
        return items[:MAX_RECOMMENDATIONS]


class FallbackRecommendationProvider:
    """Tries `primary`; on any failure uses `fallback`. Reports which one answered."""

    def __init__(self, primary, fallback):
        self.primary = primary
        self.fallback = fallback
        self.name = primary.name if primary is fallback else f"{primary.name} (fallback: {fallback.name})"

    def recommend_with_source(self, context):
        try:
            return self.primary.recommend(context), self.primary.name
        except Exception as exc:  # the LLM is optional: any failure means rule-based advice
            log.warning("Recommendation provider %s failed, using %s: %s", self.primary.name, self.fallback.name, exc)
            return self.fallback.recommend(context), self.fallback.name


def get_recommendation_provider():
    rules = RuleBasedRecommendationProvider()
    base_url = os.getenv("LLM_BASE_URL", "").strip()
    model = os.getenv("LLM_MODEL", "").strip()
    if not (base_url and model):
        return FallbackRecommendationProvider(rules, rules)  # LLM disabled (default)
    llm = OpenAICompatibleRecommendationProvider(
        base_url, model, os.getenv("LLM_API_KEY") or None, float(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
    )
    return FallbackRecommendationProvider(llm, rules)
