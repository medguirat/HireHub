"""End-to-end scoring on realistic fixtures, using the real embedding model."""

import pytest

from tests import fixtures as f


@pytest.fixture(scope="module")
def java(match):
    return {
        "strong": match(f.CV_JAVA_SENIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA),
        "partial": match(f.CV_JAVA_JUNIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA),
        "poor": match(f.CV_CHEF, f.OFFER_JAVA_TITLE, f.OFFER_JAVA),
    }


def test_scores_are_ordered_strong_partial_poor(java):
    strong, partial, poor = (java[k]["overall_score"] for k in ("strong", "partial", "poor"))
    assert strong > partial > poor
    assert strong >= 80
    assert 30 <= partial <= 70
    assert poor <= 20


def test_missing_skills_are_exactly_the_gaps(java):
    skills = java["partial"]["skills"]
    assert skills["missing_required"] == ["Docker", "Hibernate / JPA", "Microservices", "REST APIs"]
    assert skills["missing_nice_to_have"] == ["AWS", "Kafka", "Kubernetes"]
    assert {(p["skill"], p["via"]) for p in skills["partial"]} == {("Spring Boot", "Spring"), ("PostgreSQL", "MySQL")}
    assert java["strong"]["skills"]["missing_required"] == []


def test_same_cv_scores_differently_on_different_offers(match):
    on_java = match(f.CV_JAVA_SENIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA)
    on_data = match(f.CV_JAVA_SENIOR, f.OFFER_DATA_TITLE, f.OFFER_DATA)
    assert on_java["overall_score"] - on_data["overall_score"] >= 30
    assert on_java["skills"]["missing_required"] != on_data["skills"]["missing_required"]


def test_different_cvs_score_differently_on_the_same_offer(match):
    analyst = match(f.CV_DATA_ANALYST, f.OFFER_DATA_TITLE, f.OFFER_DATA)
    backend = match(f.CV_JAVA_SENIOR, f.OFFER_DATA_TITLE, f.OFFER_DATA)
    assert analyst["overall_score"] - backend["overall_score"] >= 30


def test_unrelated_experience_does_not_count(java):
    experience = java["poor"]["categories"]["experience"]
    assert experience["candidate_total_years"] > 10
    assert experience["candidate_years"] == 0
    assert experience["score"] == 0


def test_breakdown_has_every_category_with_consistent_weights(java):
    categories = java["partial"]["categories"]
    assert set(categories) == {"skills", "experience", "education", "languages", "relevance"}
    for cat in categories.values():
        assert cat["score"] is None or 0 <= cat["score"] <= 100
    assert sum(c["effective_weight"] for c in categories.values()) == pytest.approx(1.0, abs=0.01)


def test_categories_the_offer_does_not_mention_are_left_out(match):
    result = match(f.CV_JAVA_SENIOR, "Java Developer", "We need Java and Spring Boot skills.")
    categories = result["categories"]
    assert not categories["education"]["applicable"] and categories["education"]["effective_weight"] == 0
    assert not categories["languages"]["applicable"]
    applicable = [c for c in categories.values() if c["applicable"]]
    assert sum(c["effective_weight"] for c in applicable) == pytest.approx(1.0, abs=0.01)


def test_recommendations_are_between_two_and_four_and_rule_based(java):
    for result in java.values():
        assert 2 <= len(result["recommendations"]) <= 4
        assert result["recommendations_source"] == "rules"
    assert any("Docker" in r for r in java["partial"]["recommendations"])


def test_scoring_is_deterministic(match):
    first = match(f.CV_JAVA_JUNIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA)
    second = match(f.CV_JAVA_JUNIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA)
    assert first == second
