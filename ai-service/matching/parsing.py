"""Structured signals extracted from CV and offer text.

Everything here is deterministic and rule based, so every number in a match
result can be traced back to a piece of text.
"""

import re
from dataclasses import dataclass
from datetime import date

from .taxonomy import (
    DEFAULT_CANDIDATE_LANGUAGE_LEVEL,
    DEFAULT_REQUIRED_LANGUAGE_LEVEL,
    EDUCATION_LEVELS,
    LANGUAGE_LEVELS,
    LANGUAGES,
    SENIORITY_YEARS,
    SKILLS,
)

# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

_BEFORE = r"(?<![a-z0-9+#])"
_AFTER = r"(?![a-z0-9+#])"


def normalize(text):
    """Lower-case and unify punctuation, keeping line breaks (they carry structure)."""
    text = (text or "").lower()
    text = text.replace("’", "'").replace("‘", "'")
    text = re.sub(r"[‐-―−]", "-", text)
    text = text.replace(" ", " ").replace("\t", " ")
    return re.sub(r"[ ]{2,}", " ", text)


def _phrase_pattern(phrase):
    if phrase.startswith("re:"):
        return re.compile(phrase[3:])
    body = r"\s+".join(re.escape(part) for part in phrase.split())
    return re.compile(_BEFORE + body + _AFTER)


def _contains_any(text, patterns):
    return any(p.search(text) for p in patterns)


def split_sentences(text):
    """Lines, then sentences inside a line. Bullets become their own segment."""
    segments = []
    for line in normalize(text).splitlines():
        line = line.strip(" -*•●▪>")
        if not line:
            continue
        for part in re.split(r"(?<=[.;!?])\s+(?=[a-z0-9(])", line):
            part = part.strip()
            if part:
                segments.append(part)
    return segments


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------

_SKILL_PATTERNS = {key: [_phrase_pattern(a) for a in skill.aliases] for key, skill in SKILLS.items()}


def extract_skills(text):
    """Canonical keys of the skills literally present in the text.

    Longest match wins: "spring" inside "spring boot" is part of the Spring
    Boot mention, not a separate Spring requirement (Spring Boot implies
    Spring anyway).
    """
    norm = normalize(text)
    spans = {}
    for key, patterns in _SKILL_PATTERNS.items():
        found = [m.span() for p in patterns for m in p.finditer(norm)]
        if found:
            spans[key] = found
    def swallowed(span, key):
        return any(other != key and s[0] <= span[0] and span[1] <= s[1] and (s[1] - s[0]) > (span[1] - span[0])
                   for other, other_spans in spans.items() for s in other_spans)
    return {key for key, found in spans.items() if not all(swallowed(span, key) for span in found)}


def expand_implied(skills):
    """Add every skill implied by the given ones (Spring Boot => Spring => Java)."""
    result = set(skills)
    stack = list(skills)
    while stack:
        for implied in SKILLS[stack.pop()].implies:
            if implied not in result:
                result.add(implied)
                stack.append(implied)
    return result


def related_skill(target, candidate_skills):
    """A candidate skill that transfers partially to `target`, if any."""
    for skill in sorted(candidate_skills):
        if target in SKILLS[skill].related or skill in SKILLS[target].related:
            return skill
    return None


_NICE_MARKERS = [_phrase_pattern(p) for p in [
    "nice to have", "nice-to-have", "a plus", "is a plus", "would be a plus", "bonus", "preferred",
    "is an advantage", "an asset", "appreciated", "desirable", "ideally", "optional", "familiarity with",
    "un plus", "un atout", "atout", "atouts", "apprécié", "appréciée", "appréciés", "appréciées", "souhaité",
    "souhaitée", "souhaités", "souhaitées", "souhaitable", "idéalement", "optionnel", "est un avantage",
]]
_REQUIRED_HEADER_MARKERS = [_phrase_pattern(p) for p in [
    "requirements", "required", "must have", "must-have", "qualifications", "what you bring", "your profile",
    "profil recherché", "profil", "compétences requises", "exigences", "prérequis", "responsibilities",
    "missions", "vos missions", "about the role", "the role",
]]


def classify_offer_skills(title, description):
    """Split the offer's skills into required and nice-to-have.

    A skill is nice-to-have when it appears under a "Nice to have:"-style
    heading or in a sentence with a marker such as "is a plus"; everything
    else, and anything in the title, is required.
    """
    required = set(extract_skills(title))
    nice = set()
    mode = "required"
    for raw_line in normalize(description).splitlines():
        line = raw_line.strip(" -*•●▪>")
        if not line:
            continue
        # "Nice to have: Kubernetes, AWS" -> heading and content on one line.
        head, sep, rest = line.partition(":")
        if sep and len(head) <= 40:
            if _contains_any(head, _NICE_MARKERS):
                mode = "nice"
            elif _contains_any(head, _REQUIRED_HEADER_MARKERS):
                mode = "required"
            if not rest.strip():
                continue
            line_mode, content = mode, rest
        else:
            line_mode, content = mode, line
        for sentence in split_sentences(content):
            is_nice = line_mode == "nice" or _contains_any(sentence, _NICE_MARKERS)
            (nice if is_nice else required).update(extract_skills(sentence))
    return required, nice - required


# ---------------------------------------------------------------------------
# Experience
# ---------------------------------------------------------------------------

_MONTHS = {
    "jan": 1, "janv": 1, "january": 1, "janvier": 1,
    "feb": 2, "fev": 2, "fév": 2, "fevr": 2, "févr": 2, "february": 2, "fevrier": 2, "février": 2,
    "mar": 3, "march": 3, "mars": 3,
    "apr": 4, "avr": 4, "april": 4, "avril": 4,
    "may": 5, "mai": 5,
    "jun": 6, "june": 6, "juin": 6,
    "jul": 7, "juil": 7, "juill": 7, "july": 7, "juillet": 7,
    "aug": 8, "aout": 8, "août": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9, "septembre": 9,
    "oct": 10, "october": 10, "octobre": 10,
    "nov": 11, "november": 11, "novembre": 11,
    "dec": 12, "déc": 12, "december": 12, "décembre": 12,
}
_MONTH_RE = "|".join(sorted((re.escape(m) for m in _MONTHS), key=len, reverse=True))
_DATE = (r"(?:(?P<{p}mon>" + _MONTH_RE + r")\.?\s+|(?P<{p}num>\d{{1,2}})\s*[/.-]\s*)?(?P<{p}year>(?:19|20)\d{{2}})")
_PRESENT = (r"(?P<present>present|current|now|today|aujourd'hui|actuel(?:lement)?|en cours|ce jour|présent"
            r"|maintenant)")
_RANGE_RE = re.compile(
    _DATE.format(p="s") + r"\s*(?:-|to|à|au|until|jusqu'à|jusqu'au)\s*(?:" + _DATE.format(p="e") + "|" + _PRESENT + ")"
)
# "Depuis mars 2022" / "since 2021": an ongoing role written without an end.
_SINCE_RE = re.compile(r"(?:depuis|since)\s+" + _DATE.format(p="s"))
_EXPLICIT_YEARS_RE = re.compile(
    r"(\d{1,2})\s*\+?\s*(?:years?|yrs?|ans?|années?)\s+(?:of\s+|d'\s*)?(?:professional\s+|solid\s+)?"
    r"(?:experience|expérience)"
    # "expérience de 4 ans", "experience of 5 years"
    r"|(?:experience|expérience)\s+(?:professionnelle\s+|professional\s+)?(?:de|of)\s+(\d{1,2})\s*\+?\s*"
    r"(?:years?|yrs?|ans?|années?)"
)

_EXPERIENCE_HEADINGS = [_phrase_pattern(p) for p in [
    "experience", "experiences", "expérience", "expériences", "work history", "employment",
    "professional background", "parcours professionnel", "emplois", "career",
    "internships", "internship", "stages", "stage",
]]
_EDUCATION_HEADINGS = [_phrase_pattern(p) for p in [
    "education", "formation", "formations", "études", "diplômes", "academic", "cursus", "parcours académique",
]]
_OTHER_HEADINGS = [_phrase_pattern(p) for p in [
    "projects", "projets", "certifications", "certificates", "skills", "compétences", "languages", "langues",
    "interests", "centres d'intérêt", "summary", "profil", "profile", "contact", "references", "volunteer",
    "bénévolat", "awards", "hobbies", "loisirs", "publications",
]]
_EDUCATION_CONTEXT = [_phrase_pattern(p) for p in [
    "university", "université", "universite", "école", "ecole", "school", "faculté", "faculty", "institut",
    "institute", "lycée", "college", "degree", "diplôme", "diploma", "bachelor", "master", "licence",
    "baccalauréat", "student", "étudiant",
]]


def _heading_kind(line):
    """'experience', 'education', 'other' or None for lines that look like section headings.

    "Languages: Java, Python" inside a role is content, not a heading: a
    heading is short and has nothing after its colon.
    """
    head, sep, rest = line.partition(":")
    if sep and rest.strip():
        return None
    stripped = head.strip(" #*=-")
    if not stripped or len(stripped.split()) > 4 or re.search(r"\d{4}", stripped):
        return None
    if _contains_any(stripped, _EDUCATION_HEADINGS):
        return "education"
    if _contains_any(stripped, _EXPERIENCE_HEADINGS):
        return "experience"
    if _contains_any(stripped, _OTHER_HEADINGS):
        return "other"
    return None


def _month_index(mon, num, year, is_end):
    """Months since year 0. Year-only dates use mid-year so "2019 - 2021" counts ~2 years, not 3."""
    year = int(year)
    if mon:
        month = _MONTHS[mon.rstrip(".")]
    elif num and 1 <= int(num) <= 12:
        month = int(num)
    else:
        month = 6 if is_end else 7
    return year * 12 + month


def _ranges_in(line, today):
    ranges = []
    for m in _RANGE_RE.finditer(line):
        start = _month_index(m.group("smon"), m.group("snum"), m.group("syear"), False)
        if m.group("present"):
            end = today.year * 12 + today.month
        else:
            end = _month_index(m.group("emon"), m.group("enum"), m.group("eyear"), True)
        if not (1970 * 12 <= start <= today.year * 12 + today.month + 1):
            continue
        end = min(end, today.year * 12 + today.month)
        if end < start:
            end = start + 5  # same year given twice ("2021 - 2021"): count about half a year
        ranges.append((start, end))
    if not ranges:
        for m in _SINCE_RE.finditer(line):
            start = _month_index(m.group("smon"), m.group("snum"), m.group("syear"), False)
            end = today.year * 12 + today.month
            if 1970 * 12 <= start <= end:
                ranges.append((start, end))
    return ranges


def _merged_months(ranges):
    total = 0
    current = None
    for start, end in sorted(ranges):
        if current and start <= current[1] + 1:
            current = (current[0], max(current[1], end))
        else:
            if current:
                total += current[1] - current[0] + 1
            current = (start, end)
    if current:
        total += current[1] - current[0] + 1
    return total


@dataclass
class Role:
    start: int           # month index
    end: int
    text: str            # the role's title line, dates and description


@dataclass
class ExperienceStatement:
    years: float
    sentence: str        # e.g. "backend engineer with 7 years of experience in java"


@dataclass
class CandidateExperience:
    roles: list
    statements: list


def candidate_experience(cv_text, today=None):
    """Dated roles and explicit "N years of experience" statements found in the CV.

    Date ranges count only inside an experience section, or - when the CV has
    no recognizable sections - on lines that don't look like education. A
    role's text is its title line, its dates and the lines below them.
    """
    today = today or date.today()
    section = None
    has_headings = False
    roles = []
    current = None
    previous_line = ""
    for line in normalize(cv_text).splitlines():
        kind = _heading_kind(line)
        if kind:
            section, has_headings, current = kind, True, None
            continue
        found = _ranges_in(line, today)
        counts = section == "experience" or (not has_headings and not _contains_any(line, _EDUCATION_CONTEXT))
        if found and counts:
            current = []
            text_lines = [previous_line, line]
            for start, end in found:
                roles.append(Role(start, end, ""))
                current.append(roles[-1])
            for role in current:
                role.text = "\n".join(text_lines)
        elif current and line.strip():
            for role in current:
                role.text += "\n" + line
        if line.strip():
            previous_line = line

    statements = []
    for sentence in split_sentences(cv_text):
        for groups in _EXPLICIT_YEARS_RE.findall(sentence):
            n = int(next(g for g in groups if g))
            if n <= 45:
                statements.append(ExperienceStatement(float(n), sentence))
    return CandidateExperience(roles, statements)


def years_of(roles):
    return round(_merged_months([(r.start, r.end) for r in roles]) / 12, 1)


_REQUIRED_YEARS_RE = re.compile(
    r"(?:at least|minimum|min\.?|au moins|plus de|more than)?\s*(\d{1,2})\s*(?:\+|or more|ou plus)?\s*"
    r"(?:(?:-|to|à)\s*\d{1,2}\s*)?(?:years?|yrs?|ans?|années?)"
)
_EXPERIENCE_WORD = re.compile(r"experience|expérience|exp\.")


@dataclass
class RequiredExperience:
    years: float | None
    source: str          # "stated", "seniority:<level>" or "none"


def required_experience(title, description):
    """Minimum years the offer asks for: an explicit number, else a seniority keyword."""
    stated = []
    for sentence in split_sentences(description) + split_sentences(title):
        if _EXPERIENCE_WORD.search(sentence):
            stated += [int(n) for n in _REQUIRED_YEARS_RE.findall(sentence) if 0 < int(n) <= 20]
    if stated:
        return RequiredExperience(float(max(stated)), "stated")

    for text in (normalize(title), normalize(description)):
        for level, years, patterns in _SENIORITY_PATTERNS:
            if _contains_any(text, patterns):
                return RequiredExperience(float(years), f"seniority:{level}")
    return RequiredExperience(None, "none")


_SENIORITY_PATTERNS = [(level, years, [_phrase_pattern(p) for p in phrases])
                       for level, years, phrases in SENIORITY_YEARS]


# ---------------------------------------------------------------------------
# Education
# ---------------------------------------------------------------------------

_EDUCATION_PATTERNS = [(level, label, [_phrase_pattern(p) for p in phrases])
                       for level, label, phrases in EDUCATION_LEVELS]


def education_levels(text):
    norm = normalize(text)
    return {(level, label) for level, label, patterns in _EDUCATION_PATTERNS if _contains_any(norm, patterns)}


# "Ingénieur" alone is both a degree and a job title ("Ingénieur logiciel"); it
# only counts as a degree inside an Education / Formation section.
_ENGINEER_DEGREE = [_phrase_pattern(p) for p in ["ingénieur", "ingenieur"]]
_ENGINEER_DEGREE_LEVEL = next(e for e in EDUCATION_LEVELS if e[0] == 4)[:2]


def candidate_education(cv_text):
    """Highest education level the CV mentions, as (level, label); (0, None) if none."""
    found = education_levels(cv_text)
    section = None
    for line in normalize(cv_text).splitlines():
        kind = _heading_kind(line)
        if kind:
            section = kind
        elif section == "education" and _contains_any(line, _ENGINEER_DEGREE):
            found.add(_ENGINEER_DEGREE_LEVEL)
    return max(found) if found else (0, None)


def required_education(description):
    """Lowest level the offer accepts ("Bachelor's or Master's" -> Bachelor's); None if not mentioned."""
    found = education_levels(description)
    return min(found) if found else None


# ---------------------------------------------------------------------------
# Languages
# ---------------------------------------------------------------------------

_LANGUAGE_PATTERNS = {key: (display, [_phrase_pattern(a) for a in aliases]) for key, (display, aliases) in LANGUAGES.items()}
_LEVEL_PATTERNS = [(name, value, [_phrase_pattern(k) for k in keywords]) for name, value, keywords in LANGUAGE_LEVELS]
_LANGUAGE_CONTEXT = [_phrase_pattern(p) for p in [
    "language", "languages", "langue", "langues", "speak", "speaking", "spoken", "written", "écrit", "oral",
    "parlé", "proficiency", "maîtrise", "maitrise", "command", "communication", "niveau", "level",
]]


def _level_in(part):
    for name, value, patterns in _LEVEL_PATTERNS:
        if _contains_any(part, patterns):
            return name, value
    return None


# "English (C1), French (native) | Arabic - native": each language only takes
# the level written in its own piece of the list.
_LIST_SEPARATOR = re.compile(r"[,;|•·]|\s-\s|\s+(?:and|et)\s+")


@dataclass
class LanguageSkill:
    key: str
    display: str
    level: str
    value: float


def _languages_in(text, default_level, require_context):
    result = {}
    for sentence in split_sentences(text):
        if require_context and not (_contains_any(sentence, _LANGUAGE_CONTEXT) or _level_in(sentence)):
            continue
        for part in _LIST_SEPARATOR.split(sentence):
            for key, (display, patterns) in _LANGUAGE_PATTERNS.items():
                if not _contains_any(part, patterns):
                    continue
                level = _level_in(part) or default_level
                if key not in result or level[1] > result[key].value:
                    result[key] = LanguageSkill(key, display, level[0], level[1])
    return result


def candidate_languages(cv_text):
    """Languages in the CV with the best proficiency stated next to each."""
    return _languages_in(cv_text, DEFAULT_CANDIDATE_LANGUAGE_LEVEL, require_context=False)


def required_languages(description):
    """Languages the offer asks for - only where the sentence is about language
    ability, so "a French company" doesn't become a French requirement."""
    return _languages_in(description, DEFAULT_REQUIRED_LANGUAGE_LEVEL, require_context=True)
