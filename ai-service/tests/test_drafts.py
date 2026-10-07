from datetime import date

import pytest
from fastapi.testclient import TestClient

from drafts import NotEnoughData, draft_bio, draft_company, introduces_new_facts
from tests.conftest import TEST_KEY

TODAY = date(2026, 9, 29)


class FakeRewriter:
    name = "llm"

    def __init__(self, answer=None, error=None):
        self.answer, self.error, self.calls = answer, error, []

    def rewrite(self, kind, facts, draft):
        self.calls.append((kind, facts, draft))
        if self.error:
            raise self.error
        return self.answer


COMPANY = {"companyName": "Acme", "industry": "banking software", "headquarters": "Sousse, Tunisia",
           "foundedYear": 2006, "companySize": "250 employees", "mission": "Help banks launch digital products",
           "technologies": "Java, React"}


def test_company_template_uses_only_the_given_fields():
    result = draft_company(COMPANY)
    text = result["text"]
    assert result["ai_assisted"] is False
    assert "Acme works in banking software." in text
    assert "Founded in 2006, it is based in Sousse, Tunisia." in text
    assert "It has 250 employees." in text
    assert "Mission: Help banks launch digital products." in text
    assert "Technologies we use: Java, React." in text
    for invented in ("leading", "innovative", "pioneering", "talent", "future"):
        assert invented not in text.lower()


def test_company_template_skips_missing_fields():
    text = draft_company({"companyName": "Acme", "headquarters": "Tunis"})["text"]
    assert text == "It is based in Tunis."
    assert "None" not in text and "founded" not in text.lower()


def test_company_draft_starts_with_the_website_description_when_given():
    text = draft_company({"companyName": "Acme", "websiteDescription": "Acme builds banking software"})["text"]
    assert text.startswith("Acme builds banking software.")


def test_bio_template_from_profile_data():
    data = {"headline": "Java backend developer", "skills": ["Java", "Spring Boot", "MySQL"],
            "education": "Master in software engineering, ENICAR",
            "experiences": [
                {"position": "Backend developer", "company": "Novatech", "startDate": "2023-02-01", "endDate": None},
                {"position": "Intern", "company": "Proxym", "startDate": "2022-02-01", "endDate": "2022-08-01"}]}
    text = draft_bio(data, today=TODAY)["text"]
    assert text.startswith("Java backend developer with 4 years of experience.")
    assert "Currently Backend developer at Novatech since Feb 2023." in text
    assert "Previously Intern at Proxym (Feb 2022 – Aug 2022)." in text
    assert "Skills: Java, Spring Boot and MySQL." in text
    assert "Education: Master in software engineering, ENICAR." in text
    for invented in ("results-oriented", "passionate", "dynamic", "cutting-edge", "teams"):
        assert invented not in text.lower()


def test_bio_lists_languages_with_their_level():
    text = draft_bio({"languages": [{"language": "English", "level": "fluent"}, {"language": "Arabic", "level": "native"}]})["text"]
    assert text == "Languages: English (fluent) and Arabic (native)."


def test_bio_without_headline_uses_the_latest_position():
    data = {"experiences": [{"position": "Data analyst", "company": "Atlas", "startDate": "2025-01-01"}]}
    assert draft_bio(data, today=TODAY)["text"].startswith("Data analyst with 1 year of experience.")


@pytest.mark.parametrize("fn, data", [(draft_company, {}), (draft_company, {"companyName": "Acme"}), (draft_bio, {})])
def test_nothing_to_draft_from_is_an_explicit_error(fn, data):
    with pytest.raises(NotEnoughData):
        fn(data)


def test_a_faithful_llm_rewrite_is_used_and_labelled():
    rewriter = FakeRewriter("Acme builds banking software from Sousse, Tunisia, where it was founded in 2006.")
    result = draft_company(COMPANY, rewriter)
    assert result == result | {"ai_assisted": True, "text": rewriter.answer}
    kind, facts, draft = rewriter.calls[0]
    assert kind == "company" and facts["companyName"] == "Acme" and "Sousse" in draft


@pytest.mark.parametrize("answer", [
    "Acme, founded in 2006, has 500 employees in Sousse.",            # new number
    "Acme is a leading banking software company based in Sousse.",    # praise not in the facts
    "Acme (see https://acme.example.com) is based in Sousse.",        # link not in the facts
    "",                                                               # nothing
])
def test_an_llm_rewrite_that_adds_facts_falls_back_to_the_template(answer):
    result = draft_company(COMPANY, FakeRewriter(answer))
    assert result["ai_assisted"] is False
    assert result["text"].startswith("Acme works in banking software.")


def test_an_llm_failure_falls_back_to_the_template():
    result = draft_bio({"headline": "Designer"}, FakeRewriter(error=TimeoutError("slow")))
    assert result == {"text": "Designer.", "ai_assisted": False, "used": ["headline"]}


def test_new_facts_detection_uses_whole_words():
    assert not introduces_new_facts("I work on desktop apps", "desktop apps developer")
    assert introduces_new_facts("A top developer", "developer")


@pytest.fixture(scope="module")
def client():
    import main
    return TestClient(main.app, headers={"X-Internal-Key": TEST_KEY})  # no lifespan: drafts don't need the embedding model


def test_draft_endpoints(client):
    response = client.post("/draft/company", json={"companyName": "Acme", "industry": "fintech"})
    assert response.status_code == 200
    assert response.json() == {"text": "Acme works in fintech.", "ai_assisted": False, "used": ["companyName", "industry"]}

    response = client.post("/draft/bio", json={"skills": ["Java"]})
    assert response.json()["text"] == "Skills: Java."

    response = client.post("/draft/bio", json={})
    assert response.status_code == 422
    assert response.json()["code"] == "not_enough_data"
