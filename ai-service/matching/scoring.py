"""Combines the parsed signals into an explainable 0-100 match score.

overall = weighted average of the categories that apply to this offer.
A category the offer doesn't mention (e.g. no education requirement) is left
out and the remaining weights are rescaled, so a CV is never penalised - or
rewarded - for something the offer doesn't ask for.
"""

from . import ALGORITHM_VERSION
from .wording import count_of, min_years, years
from .parsing import (
    candidate_education,
    candidate_experience,
    candidate_languages,
    classify_offer_skills,
    expand_implied,
    extract_skills,
    related_skill,
    required_education,
    required_experience,
    required_languages,
    years_of,
)
from .recommendations import RecommendationContext
from .taxonomy import SKILLS

WEIGHTS = {"skills": 0.45, "experience": 0.20, "education": 0.10, "languages": 0.10, "relevance": 0.15}
NICE_TO_HAVE_WEIGHT = 0.5   # a nice-to-have skill counts half as much as a required one
RELATED_SKILL_CREDIT = 0.5  # a neighbouring skill (MySQL for PostgreSQL) earns half credit


def _display(key):
    return SKILLS[key].display


def _skills_category(cv_text, title, description):
    direct = extract_skills(cv_text)
    candidate = expand_implied(direct)
    required, nice = classify_offer_skills(title, description)

    matched, partial, missing_required, missing_nice = [], [], [], []
    earned = possible = 0.0
    for key in sorted(required | nice, key=_display):
        requirement = "required" if key in required else "nice_to_have"
        weight = 1.0 if requirement == "required" else NICE_TO_HAVE_WEIGHT
        possible += weight
        if key in candidate:
            earned += weight
            entry = {"skill": _display(key), "requirement": requirement}
            if key not in direct:
                implied_by = next(d for d in sorted(direct) if key in expand_implied({d}))
                entry["via"] = _display(implied_by)
            matched.append(entry)
            continue
        neighbour = related_skill(key, candidate)
        if neighbour:
            earned += weight * RELATED_SKILL_CREDIT
            partial.append({"skill": _display(key), "via": _display(neighbour), "requirement": requirement})
        elif requirement == "required":
            missing_required.append(_display(key))
        else:
            missing_nice.append(_display(key))

    offered = required | nice
    extra = sorted({_display(k) for k in direct - offered})[:12]
    req_hits = sum(1 for m in matched if m["requirement"] == "required")
    req_partial = sum(1 for p in partial if p["requirement"] == "required")
    nice_hits = sum(1 for m in matched if m["requirement"] == "nice_to_have")

    category = {
        "applicable": bool(offered),
        "score": round(100 * earned / possible) if possible else None,
        "required_count": len(required),
        "nice_to_have_count": len(nice),
        "summary": (
            count_of(req_hits, len(required), "required skill")
            + (f" ({req_partial} partially)" if req_partial else "")
            + (f", {nice_hits} of {len(nice)} nice-to-have" if nice else "")
            if offered else "The offer lists no recognizable skills."
        ),
    }
    details = {
        "matched": matched,
        "partial": partial,
        "missing_required": missing_required,
        "missing_nice_to_have": missing_nice,
        "other_candidate_skills": extra,
    }
    return category, details


def _mentions_any(text, offer_skills):
    have = expand_implied(extract_skills(text))
    return any(key in have or related_skill(key, have) for key in offer_skills)


def _experience_category(cv_text, title, description, offer_skills):
    """Only experience relevant to the offer counts: a role (or an "N years of
    experience in ..." statement) is relevant when it mentions at least one of
    the offer's skills. Twelve years as a chef are not experience for a Java
    role. If the offer lists no recognizable skills, every role counts."""
    exp = candidate_experience(cv_text)
    relevant = (lambda text: True) if not offer_skills else (lambda text: _mentions_any(text, offer_skills))

    relevant_roles = [r for r in exp.roles if relevant(r.text)]
    relevant_stated = [s.years for s in exp.statements if relevant(s.sentence)]
    dated = years_of(relevant_roles)
    stated = max(relevant_stated, default=0.0)
    candidate_years = max(dated, stated)
    source = "none" if candidate_years == 0 else ("dates" if dated >= stated else "statement")
    total_years = max(years_of(exp.roles), max((s.years for s in exp.statements), default=0.0))

    need = required_experience(title, description)
    applicable = bool(need.years)
    score = None
    if applicable:
        score = 100 if candidate_years >= need.years else round(100 * candidate_years / need.years)

    if not applicable:
        summary = "The offer doesn't require a minimum amount of experience."
    elif total_years == 0:
        summary = f"Requires {min_years(need.years)}; no dated experience found in the CV."
    elif candidate_years == 0:
        summary = f"Requires {min_years(need.years)}; none of the CV's {years(total_years)} relate to this offer's skills."
    elif candidate_years < total_years:
        summary = (f"Requires {min_years(need.years)}; the CV shows about {years(candidate_years)} of relevant "
                   f"experience ({years(total_years)} in total).")
    else:
        summary = f"Requires {min_years(need.years)}; the CV shows about {years(candidate_years)}."
    return {
        "applicable": applicable,
        "score": score,
        "required_years": need.years,
        "required_source": need.source,
        "candidate_years": candidate_years,
        "candidate_total_years": total_years,
        "candidate_source": source,
        "summary": summary,
    }


def _education_category(cv_text, description):
    need = required_education(description)
    have_level, have_label = candidate_education(cv_text)
    if need is None:
        return {"applicable": False, "score": None, "required_level": None, "candidate_level": have_label,
                "summary": "The offer doesn't specify an education level."}
    need_level, need_label = need
    score = 100 if have_level >= need_level else round(100 * have_level / need_level)
    summary = (f"Requires {need_label}; the CV shows {have_label}." if have_label
               else f"Requires {need_label}; no degree found in the CV.")
    return {"applicable": True, "score": score, "required_level": need_label, "candidate_level": have_label,
            "summary": summary}


def _languages_category(cv_text, description):
    need = required_languages(description)
    have = candidate_languages(cv_text)
    if not need:
        return {"applicable": False, "score": None, "languages": [],
                "summary": "The offer doesn't mention language requirements."}
    rows = []
    for key, req in sorted(need.items()):
        cand = have.get(key)
        score = 0 if cand is None else round(100 * min(1.0, cand.value / req.value))
        rows.append({"language": req.display, "required_level": req.level,
                     "candidate_level": cand.level if cand else None, "score": score})
    met = sum(1 for r in rows if r["score"] == 100)
    return {
        "applicable": True,
        "score": round(sum(r["score"] for r in rows) / len(rows)),
        "languages": rows,
        "summary": f"{count_of(met, len(rows), 'required language')} at the expected level.",
    }


def compute_match(cv_text, offer_title, offer_description, semantic_scorer, recommendation_provider):
    offer_title = (offer_title or "").strip()
    offer_description = offer_description or ""

    skills, skill_details = _skills_category(cv_text, offer_title, offer_description)
    offer_skills = set().union(*classify_offer_skills(offer_title, offer_description))
    experience = _experience_category(cv_text, offer_title, offer_description, offer_skills)
    education = _education_category(cv_text, offer_description)
    languages = _languages_category(cv_text, offer_description)
    relevance_values = semantic_scorer.relevance(cv_text, offer_title, offer_description)
    relevance = {
        "applicable": True,
        "score": relevance_values["score"],
        "raw_similarity": relevance_values["raw_similarity"],
        "summary": "How closely the CV's content covers the offer's statements (semantic similarity).",
    }

    categories = {"skills": skills, "experience": experience, "education": education,
                  "languages": languages, "relevance": relevance}
    active_weight = sum(WEIGHTS[name] for name, cat in categories.items() if cat["applicable"])
    for name, cat in categories.items():
        cat["weight"] = WEIGHTS[name]
        cat["effective_weight"] = round(WEIGHTS[name] / active_weight, 3) if cat["applicable"] else 0.0
    overall = round(sum(cat["score"] * cat["effective_weight"] for cat in categories.values() if cat["applicable"]))

    # Skills named in the offer title are the core of the role: list them first.
    title_skills = {_display(k) for k in extract_skills(offer_title)}
    matched_required = [m["skill"] for m in skill_details["matched"] if m["requirement"] == "required"]
    matched_required.sort(key=lambda name: name not in title_skills)

    context = RecommendationContext(
        offer_title=offer_title,
        overall_score=overall,
        matched_skills=matched_required,
        partial_skills=[(p["skill"], p["via"]) for p in skill_details["partial"]],
        missing_required=skill_details["missing_required"],
        missing_nice_to_have=skill_details["missing_nice_to_have"],
        required_years=experience["required_years"] if experience["applicable"] else None,
        candidate_years=experience["candidate_years"],
        candidate_total_years=experience["candidate_total_years"],
        required_education=education["required_level"],
        candidate_education=education["candidate_level"],
        education_gap=bool(education["applicable"] and education["score"] < 100),
        language_gaps=[(r["language"], r["required_level"], r["candidate_level"])
                       for r in languages.get("languages", []) if r["score"] < 100],
        relevance_score=relevance["score"],
    )
    recommendations, source = recommendation_provider.recommend_with_source(context)

    return {
        "algorithm_version": ALGORITHM_VERSION,
        "overall_score": overall,
        "categories": categories,
        "skills": skill_details,
        "recommendations": recommendations,
        "recommendations_source": source,
    }
