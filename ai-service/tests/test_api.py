import pytest
from fastapi.testclient import TestClient

from tests import fixtures as f
from tests.pdf_utils import make_pdf


@pytest.fixture(scope="module")
def client():
    import main

    with TestClient(main.app) as c:  # runs the lifespan, i.e. loads the model
        yield c


def test_health_reports_ready_and_version(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["algorithm_version"]
    assert body["recommendations"] == "rules"


def test_match_returns_the_full_breakdown(client):
    response = client.post("/match", json={"cv_text": f.CV_JAVA_JUNIOR,
                                            "offer": {"title": f.OFFER_JAVA_TITLE, "description": f.OFFER_JAVA}})
    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["overall_score"] <= 100
    assert set(body["categories"]) == {"skills", "experience", "education", "languages", "relevance"}
    assert "Docker" in body["skills"]["missing_required"]


def test_match_validates_input(client):
    assert client.post("/match", json={"cv_text": "", "offer": {"title": "Dev"}}).status_code == 422
    assert client.post("/match", json={"cv_text": "x"}).status_code == 422


def test_extract_pdf(client):
    response = client.post("/extract", files={"file": ("cv.pdf", make_pdf(["Java developer with Spring Boot",
                                                                             "Experience 2020 - 2024"]),
                                                          "application/pdf")})
    assert response.status_code == 200
    assert response.json()["format"] == "pdf"


def test_extract_rejects_unsupported_and_empty_files(client):
    unsupported = client.post("/extract", files={"file": ("cv.png", b"\x89PNG....", "image/png")})
    assert unsupported.status_code == 415
    assert unsupported.json()["detail"]["code"] == "unsupported_format"
    empty = client.post("/extract", files={"file": ("scan.pdf", make_pdf([]), "application/pdf")})
    assert empty.status_code == 422
    assert empty.json()["detail"]["code"] == "no_text"
