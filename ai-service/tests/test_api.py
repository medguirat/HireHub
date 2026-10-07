import pytest
from fastapi.testclient import TestClient

from tests import fixtures as f
from tests.conftest import TEST_KEY
from tests.pdf_utils import make_pdf


@pytest.fixture(scope="module")
def client():
    import main

    # Sends the shared key, as the backend does. Runs the lifespan, i.e. loads the model.
    with TestClient(main.app, headers={"X-Internal-Key": TEST_KEY}) as c:
        yield c


@pytest.fixture(scope="module")
def outsider(client):
    """Anyone else: no key."""
    import main

    return TestClient(main.app)


def test_only_the_backend_may_call_the_service(outsider):
    for method, path, body in [("post", "/match", {"cv_text": "x", "offer": {"title": "t"}}),
                               ("post", "/company/profile", {"url": "https://example.com"}),
                               ("post", "/draft/bio", {"headline": "Dev"}),
                               ("post", "/extract", None)]:
        response = getattr(outsider, method)(path, json=body)
        assert response.status_code == 401, path
        assert response.json()["code"] == "AUTH_REQUIRED"
    wrong = outsider.post("/draft/bio", json={"headline": "Dev"}, headers={"X-Internal-Key": "wrong"})
    assert wrong.status_code == 401
    # Health stays open (Docker and the backend's health check).
    assert outsider.get("/health").status_code == 200


def test_no_cors_headers_for_browsers(client):
    response = client.options("/draft/bio", headers={"Origin": "http://evil.example",
                                                     "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in {k.lower() for k in response.headers}


def test_errors_reuse_the_backends_request_id(client):
    response = client.post("/draft/bio", json={}, headers={"X-Request-Id": "backend-request-0001"})
    assert response.status_code == 422
    assert response.json()["correlationId"] == "backend-request-0001"


def test_the_service_refuses_to_start_without_a_strong_key(monkeypatch):
    import security

    monkeypatch.setenv("AI_SERVICE_KEY", "short")
    with pytest.raises(RuntimeError, match="AI_SERVICE_KEY"):
        security.configured_key()


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
    assert unsupported.json()["code"] == "unsupported_format"
    empty = client.post("/extract", files={"file": ("scan.pdf", make_pdf([]), "application/pdf")})
    assert empty.status_code == 422
    assert empty.json()["code"] == "no_text"


def test_errors_share_the_backend_format(client):
    """{code, message, correlationId, fieldErrors?}, like every backend error."""
    own = client.post("/extract", files={"file": ("cv.png", b"\x89PNG....", "image/png")}).json()
    assert set(own) == {"code", "message", "correlationId"}
    assert own["message"].endswith(".")

    invalid = client.post("/match", json={"cv_text": "x"})
    assert invalid.status_code == 422
    body = invalid.json()
    assert body["code"] == "VALIDATION_FAILED"
    assert "offer" in body["fieldErrors"]
    assert body["correlationId"]

    missing = client.get("/no-such-route")
    assert missing.status_code == 404
    assert missing.json()["code"] == "NOT_FOUND"
    assert missing.json()["message"] == "Not found."
