from datetime import date

from matching.parsing import (
    candidate_education,
    candidate_experience,
    candidate_languages,
    classify_offer_skills,
    expand_implied,
    extract_skills,
    required_education,
    required_experience,
    required_languages,
    years_of,
)

TODAY = date(2026, 9, 15)


# ---- skills ----------------------------------------------------------------

def test_synonyms_normalize_to_one_skill():
    assert extract_skills("5 years of JS and ReactJS") == {"javascript", "react"}
    assert extract_skills("Worked with Postgres and k8s") == {"postgresql", "kubernetes"}


def test_java_is_not_found_inside_javascript():
    assert "java" not in extract_skills("JavaScript developer")


def test_spring_inside_spring_boot_is_one_skill():
    assert extract_skills("Built services with Spring Boot") == {"spring boot"}
    assert extract_skills("Spring MVC and Spring Boot") == {"spring", "spring boot"}


def test_ambiguous_words_are_not_skills():
    assert extract_skills("the rest of the team, a tree node, spring 2023 semester, tableau de bord") == set()


def test_implied_skills():
    assert expand_implied({"spring boot"}) == {"spring boot", "spring", "java"}
    assert expand_implied({"next.js"}) >= {"react", "javascript"}


def test_offer_required_and_nice_to_have():
    required, nice = classify_offer_skills(
        "React Developer",
        "Requirements:\n- TypeScript and CSS\n- Git\nNice to have:\n- Next.js\n- Jest\nDocker is a plus.",
    )
    assert required == {"react", "typescript", "css", "git"}
    assert nice == {"next.js", "jest", "docker"}


def test_inline_nice_to_have_heading():
    required, nice = classify_offer_skills("Reporting Analyst", "Must have: SQL, Excel\nNice to have: Tableau, Python")
    assert required == {"sql", "excel"}
    assert nice == {"tableau", "python"}


# ---- experience ------------------------------------------------------------

def test_dated_roles_are_summed_and_overlaps_merged():
    cv = """Experience
Backend Developer - A
Jan 2020 - Dec 2021
Freelance - B
Jun 2021 - Jun 2022"""
    exp = candidate_experience(cv, today=TODAY)
    assert len(exp.roles) == 2
    assert years_of(exp.roles) == 2.5  # Jan 2020 - Jun 2022, overlap counted once


def test_present_counts_until_today_and_french_dates_work():
    exp = candidate_experience("Expérience professionnelle\nDéveloppeur\njanvier 2024 - aujourd'hui", today=TODAY)
    assert years_of(exp.roles) == round(33 / 12, 1)  # Jan 2024 .. Sep 2026, both months included


def test_education_dates_are_not_experience():
    cv = """Education
Master in Computer Science, 2015 - 2020
Experience
Developer
2021 - 2023"""
    exp = candidate_experience(cv, today=TODAY)
    assert len(exp.roles) == 1


def test_role_text_includes_title_and_description():
    cv = "Experience\nJava Developer - Acme\nMar 2022 - Mar 2024\n- Built APIs with Spring Boot"
    role = candidate_experience(cv, today=TODAY).roles[0]
    assert "java developer" in role.text and "spring boot" in role.text


def test_explicit_statement_is_captured():
    exp = candidate_experience("Engineer with 7 years of experience in Java.", today=TODAY)
    assert [s.years for s in exp.statements] == [7.0]


def test_required_experience_stated_or_from_seniority():
    assert required_experience("Developer", "At least 3 years of experience with Java").years == 3
    assert required_experience("Developer", "3-5 years of professional experience").years == 3
    senior = required_experience("Senior Data Engineer", "Build pipelines.")
    assert (senior.years, senior.source) == (5, "seniority:senior")
    assert required_experience("Developer", "Build things.").years is None


def test_leading_a_project_does_not_make_an_offer_senior():
    assert required_experience("Developer", "You will lead the migration project.").years is None


# ---- education -------------------------------------------------------------

def test_education_levels():
    assert candidate_education("Licence en informatique, puis Master en génie logiciel")[0] == 4
    assert candidate_education("Bachelor of Science in Economics")[0] == 3
    assert candidate_education("Certified Scrum Master")[0] == 0
    assert required_education("Bachelor's or Master's degree in computer science")[0] == 3
    assert required_education("No degree needed, just passion") is None


# ---- languages -------------------------------------------------------------

def test_each_language_keeps_its_own_level():
    langs = candidate_languages("Languages\nEnglish (B1), French (C1), Arabic (native)")
    assert (langs["english"].level, langs["french"].level, langs["arabic"].level) == \
        ("intermediate", "fluent", "native")


def test_offer_language_requirements_need_language_context():
    assert required_languages("We are a French company building software.") == {}
    need = required_languages("Fluent English and good French are required.")
    assert need["english"].level == "fluent"
    assert need["french"].level == "professional"
