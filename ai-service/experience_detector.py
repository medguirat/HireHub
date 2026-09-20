# =========================================================
# experience_detector.py
# But : deviner le niveau d'expérience demandé (Junior, Senior...)
# =========================================================

import re


def detect_experience_level(description: str) -> str:
    """
    Cherche des indices dans le texte pour deviner le niveau requis.
    """
    text = description.lower()

    # Cherche un motif du type "5 years" ou "3+ ans"
    # \d+   -> un ou plusieurs chiffres
    # \+?   -> un "+" optionnel
    # \s*   -> des espaces optionnels
    match = re.search(r'(\d+)\+?\s*(years?|ans?)', text)
    years = int(match.group(1)) if match else None

    if "senior" in text or (years is not None and years >= 5):
        return "Senior"
    if "junior" in text or (years is not None and years <= 2):
        return "Junior"
    if "intern" in text or "stage" in text:
        return "Internship"

    return "Mid-level"


if __name__ == "__main__":
    print(detect_experience_level("Looking for a senior engineer, 6+ years of experience"))
    print(detect_experience_level("Junior position, no experience required"))
    print(detect_experience_level("We need a solid developer for our team"))
