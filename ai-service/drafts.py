"""Draft texts for profiles, built only from what the user already entered.

- Company description: from the company profile fields (and the description
  imported from the company's website, if any).
- Candidate bio: from the candidate's headline, experience, skills, education.

A template assembles the facts; nothing is added. If an OpenAI-compatible LLM
is configured (e.g. a local Ollama, same LLM_* variables as the
recommendations), it may rewrite those facts into smoother prose, under a
strict "no new facts" instruction. Its answer is then checked, and any number,
link or marketing claim that isn't in the facts makes us fall back to the
template. `ai_assisted` is true only when the LLM's text is actually returned.
"""

import json
import logging
import os
import re
import urllib.request
from datetime import date

log = logging.getLogger("hirehub.drafts")

MAX_DRAFT_CHARS = 1500

# Marketing words an LLM likes to add; allowed only if the user's own text uses them.
_PUFFERY = [
    "leading", "leader", "innovative", "innovation", "world-class", "cutting-edge", "passionate",
    "pioneering", "best", "top", "award", "renowned", "premier", "excellence", "excellent",
    "outstanding", "exceptional", "unparalleled", "dynamic", "results-oriented", "expert",
    "trusted", "proven", "state-of-the-art", "revolutionary", "unique", "number one", "#1",
]


class NotEnoughData(Exception):
    pass


def _clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _join(items):
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


def _sentence(text):
    text = _clean(text)
    if not text:
        return ""
    return text if text[-1] in ".!?" else text + "."


# ---------------------------------------------------------------------------
# Company description
# ---------------------------------------------------------------------------

COMPANY_FIELDS = ("companyName", "companyType", "industry", "headquarters", "offices", "foundedYear",
                  "companySize", "mission", "vision", "companyValues", "technologies", "websiteDescription")


def company_facts(data):
    return {k: _clean(data.get(k)) for k in COMPANY_FIELDS if _clean(data.get(k))}


def company_template(facts):
    name = facts.get("companyName") or "The company"
    kind = facts.get("companyType")
    industry = facts.get("industry")
    paragraphs = []

    if facts.get("websiteDescription"):
        paragraphs.append(_sentence(facts["websiteDescription"]))

    intro = []
    if kind and industry:
        intro.append(f"{name} is a {kind} working in {industry}.")
    elif kind:
        intro.append(f"{name} is a {kind}.")
    elif industry:
        intro.append(f"{name} works in {industry}.")
    founded, hq = facts.get("foundedYear"), facts.get("headquarters")
    if founded and hq:
        intro.append(f"Founded in {founded}, it is based in {hq}.")
    elif founded:
        intro.append(f"It was founded in {founded}.")
    elif hq:
        intro.append(f"It is based in {hq}.")
    if facts.get("offices"):
        intro.append(f"It also has offices in {facts['offices']}.")
    if facts.get("companySize"):
        size = facts["companySize"]
        intro.append(f"Team size: {size}." if re.fullmatch(r"[\d\s,.+\-–]+", size) else f"It has {size}.")
    if intro:
        paragraphs.append(" ".join(intro))

    labelled = [("Mission", facts.get("mission")), ("Vision", facts.get("vision")),
                ("Values", facts.get("companyValues")), ("Technologies we use", facts.get("technologies"))]
    lines = [f"{label}: {_sentence(value)}" for label, value in labelled if value]
    if lines:
        paragraphs.append("\n".join(lines))

    if not paragraphs:
        raise NotEnoughData("Add a few company details first (industry, headquarters, mission...), "
                            "then draft a description from them.")
    return "\n\n".join(paragraphs)


# ---------------------------------------------------------------------------
# Candidate bio
# ---------------------------------------------------------------------------

def _parse_date(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _month_year(d):
    return d.strftime("%b %Y") if d else ""


def bio_facts(data, today=None):
    today = today or date.today()
    experiences = []
    total_months = 0
    for exp in data.get("experiences") or []:
        position, company = _clean(exp.get("position")), _clean(exp.get("company"))
        start, end = _parse_date(exp.get("startDate")), _parse_date(exp.get("endDate"))
        if not (position and company):
            continue
        if start:
            stop = end or today
            total_months += max(0, (stop.year - start.year) * 12 + stop.month - start.month)
        experiences.append({"position": position, "company": company, "start": start, "end": end})
    experiences.sort(key=lambda e: (e["end"] is None, e["start"] or date.min), reverse=True)
    facts = {
        "headline": _clean(data.get("headline")),
        "skills": [s for s in (_clean(s) for s in data.get("skills") or []) if s],
        "experiences": experiences,
        "education": _clean(data.get("education")),
        "years": total_months // 12,
    }
    return facts


def bio_template(facts):
    sentences = []
    headline = facts["headline"] or (facts["experiences"][0]["position"] if facts["experiences"] else "")
    years = facts["years"]
    if headline and years >= 1:
        sentences.append(f"{headline} with {years} year{'s' if years > 1 else ''} of experience.")
    elif headline:
        sentences.append(_sentence(headline))

    for i, exp in enumerate(facts["experiences"][:3]):
        if exp["end"] is None:
            since = f" since {_month_year(exp['start'])}" if exp["start"] else ""
            sentences.append(f"Currently {exp['position']} at {exp['company']}{since}.")
        else:
            period = f" ({_month_year(exp['start'])} – {_month_year(exp['end'])})" if exp["start"] else ""
            prefix = "Previously" if i > 0 or any(e["end"] is None for e in facts["experiences"]) else "Most recently"
            sentences.append(f"{prefix} {exp['position']} at {exp['company']}{period}.")

    if facts["skills"]:
        sentences.append(f"Skills: {_join(facts['skills'][:12])}.")
    if facts["education"]:
        sentences.append(f"Education: {_sentence(facts['education'])}")

    if not sentences:
        raise NotEnoughData("Add your headline, experience or skills first, then draft your bio from them.")
    return " ".join(sentences)


def bio_facts_for_llm(facts):
    return {
        "headline": facts["headline"],
        "years_of_experience": facts["years"],
        "experience": [
            {"position": e["position"], "company": e["company"],
             "from": _month_year(e["start"]), "to": _month_year(e["end"]) or "present"}
            for e in facts["experiences"][:5]
        ],
        "skills": facts["skills"][:15],
        "education": facts["education"],
    }


# ---------------------------------------------------------------------------
# Optional LLM rewrite, with a guard against added facts
# ---------------------------------------------------------------------------

def _numbers(text):
    return set(re.findall(r"\d+", text))


def introduces_new_facts(output, source_text):
    """True if the rewrite contains a number, link or marketing claim absent from the input."""
    source = source_text.lower()
    out = output.lower()
    if _numbers(output) - _numbers(source_text):
        return True
    if re.search(r"https?://|www\.", out) and not re.search(r"https?://|www\.", source):
        return True
    def has(text, word):
        return re.search(rf"(?<![\w-]){re.escape(word)}(?![\w-])", text) is not None
    return any(has(out, word) and not has(source, word) for word in _PUFFERY)


class LlmRewriter:
    name = "llm"

    def __init__(self, base_url, model, api_key=None, timeout=20.0):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

    def rewrite(self, kind, facts, draft):
        what = ("a company description of 3 to 5 sentences, in the third person" if kind == "company"
                else "a professional profile summary of 2 to 4 sentences, in the first person")
        prompt = (
            f"Rewrite the draft below into {what}, in the same language as the draft. Use ONLY the facts "
            "given. Do not add any skill, number, date, name, achievement, claim or praise that is not in the "
            "facts (no words like 'leading', 'innovative', 'passionate'). Leave out anything not stated. "
            "Reply with the text only.\n\nFACTS:\n"
            + json.dumps(facts, ensure_ascii=False, default=str) + "\n\nDRAFT:\n" + draft
        )
        body = json.dumps({"model": self.model, "temperature": 0.2,
                           "messages": [{"role": "user", "content": prompt}]}).encode()
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(f"{self.base_url}/chat/completions", data=body, headers=headers)
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            payload = json.loads(response.read())
        return payload["choices"][0]["message"]["content"].strip()


def get_rewriter():
    base_url = os.getenv("LLM_BASE_URL", "").strip()
    model = os.getenv("LLM_MODEL", "").strip()
    if not (base_url and model):
        return None
    return LlmRewriter(base_url, model, os.getenv("LLM_API_KEY") or None,
                       float(os.getenv("LLM_TIMEOUT_SECONDS", "20")))


def _finish(kind, facts_for_llm, template_text, rewriter):
    if rewriter is not None:
        try:
            text = _clean(rewriter.rewrite(kind, facts_for_llm, template_text).replace("\n", " \n "))
            text = re.sub(r" ?\n ?", "\n", text)
            source = json.dumps(facts_for_llm, ensure_ascii=False, default=str) + " " + template_text
            if text and len(text) <= MAX_DRAFT_CHARS and not introduces_new_facts(text, source):
                return {"text": text, "ai_assisted": True}
            log.warning("LLM %s draft rejected (empty, too long or added facts); using the template", kind)
        except Exception as exc:  # the LLM is optional: any failure means the template
            log.warning("LLM %s draft failed, using the template: %s", kind, exc)
    return {"text": template_text, "ai_assisted": False}


def draft_company(data, rewriter=None):
    facts = company_facts(data)
    return _finish("company", facts, company_template(facts), rewriter) | {"used": sorted(facts)}


def draft_bio(data, rewriter=None, today=None):
    facts = bio_facts(data, today)
    template_text = bio_template(facts)
    used = [k for k in ("headline", "experiences", "skills", "education") if facts[k]]
    return _finish("bio", bio_facts_for_llm(facts), template_text, rewriter) | {"used": used}
