"""French (and mixed French/English) CVs and offers must parse as well as English ones."""

from datetime import date

from matching.parsing import (
    candidate_education,
    candidate_experience,
    candidate_languages,
    classify_offer_skills,
    extract_skills,
    required_education,
    required_experience,
    required_languages,
    years_of,
)

TODAY = date(2026, 9, 15)


# ---- experience ------------------------------------------------------------

def test_french_statements_of_experience():
    assert [s.years for s in candidate_experience("Développeur avec 5 ans d'expérience en Java.", TODAY).statements] == [5]
    assert [s.years for s in candidate_experience("Plus de 3 années d’expérience.", TODAY).statements] == [3]
    assert [s.years for s in candidate_experience("Expérience de 4 ans en développement web.", TODAY).statements] == [4]


def test_french_date_ranges():
    cv = """Expériences professionnelles
Développeur - A
févr. 2020 – déc. 2021
Développeur - B
janv. 2022 – présent"""
    exp = candidate_experience(cv, TODAY)
    assert len(exp.roles) == 2
    # Feb 2020 - Dec 2021 (23 months) + Jan 2022 - Sep 2026 (57 months)
    assert years_of(exp.roles) == round(80 / 12, 1)


def test_depuis_means_until_today():
    exp = candidate_experience("Expérience\nDéveloppeuse chez X\nDepuis mars 2025", TODAY)
    assert years_of(exp.roles) == round(19 / 12, 1)  # Mar 2025 .. Sep 2026


def test_internships_section_counts_as_experience():
    exp = candidate_experience("Stages\nStage PFE - Acme\nfévr. 2024 - juin 2024", TODAY)
    assert len(exp.roles) == 1


def test_french_required_experience():
    assert required_experience("Développeur", "3 ans d'expérience minimum en backend").years == 3
    assert required_experience("Développeur", "Expérience de 5 ans minimum exigée.").years == 5
    assert required_experience("Développeur", "Au moins 2 années d'expérience.").years == 2
    assert required_experience("Développeur Java confirmé", "Rejoignez-nous.").source == "seniority:mid"


# ---- education -------------------------------------------------------------

def test_french_degrees():
    assert candidate_education("Formation\nLicence en informatique - ISIMS")[0] == 3
    assert candidate_education("Formation\nMaster en génie logiciel")[0] == 4
    assert candidate_education("Formation\nDoctorat en intelligence artificielle")[0] == 5
    assert candidate_education("Formation\nBac+5 en informatique")[0] == 4
    assert candidate_education("Formation\nBaccalauréat mathématiques, 2015")[0] == 1


def test_ingenieur_is_a_degree_only_under_education():
    assert candidate_education("Formation\nIngénieur en informatique - ENIS, 2018")[0] == 4
    cv = "Expérience\nIngénieur logiciel - Acme\n2020 - 2023\nFormation\nLicence en informatique"
    assert candidate_education(cv)[0] == 3


def test_french_offer_education():
    assert required_education("Diplôme Bac+5 (école d'ingénieur ou master)")[0] == 4
    assert required_education("Niveau Bac+3 minimum")[0] == 3


# ---- languages -------------------------------------------------------------

def test_french_language_levels():
    langs = candidate_languages("Langues\nFrançais : courant, Anglais : bon niveau, Arabe : langue maternelle")
    assert (langs["french"].level, langs["english"].level, langs["arabic"].level) == \
        ("fluent", "professional", "native")
    assert candidate_languages("Excellente maîtrise du français")["french"].level == "fluent"
    assert candidate_languages("Très bonne maîtrise de l'anglais")["english"].level == "professional"
    assert candidate_languages("Anglais (notions), Allemand (débutant)")["english"].level == "basic"


def test_french_offer_languages():
    assert required_languages("Anglais courant exigé.")["english"].level == "fluent"
    assert required_languages("Bonne maîtrise de l'anglais.")["english"].level == "professional"
    assert required_languages("Nous sommes une société française en croissance.") == {}


# ---- skills ----------------------------------------------------------------

def test_french_skill_names():
    text = ("Méthodes agiles, intégration continue, tests unitaires, services web, API REST, "
            "bases de données relationnelles, tests automatisés, gestion d'équipe, relation client, "
            "réseaux sociaux, référencement naturel")
    found = extract_skills(text)
    assert {"agile", "ci/cd", "unit testing", "rest api", "sql", "test automation", "team management",
            "customer support", "digital marketing", "seo"} <= found


def test_french_offer_sections():
    required, nice = classify_offer_skills(
        "Développeur Java",
        "Profil recherché :\n- Spring Boot et PostgreSQL\nAtouts :\n- Kubernetes\nCompétences appréciées : Kafka\n"
        "La connaissance de Docker serait un plus.",
    )
    assert required == {"java", "spring boot", "postgresql"}
    assert nice == {"kubernetes", "kafka", "docker"}
