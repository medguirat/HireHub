import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from matching.recommendations import (
    OpenAICompatibleRecommendationProvider,
    RecommendationContext,
    RuleBasedRecommendationProvider,
    get_recommendation_provider,
)
from matching.scoring import compute_match
from tests import fixtures as f


def _context(**overrides):
    values = dict(offer_title="Java Developer", overall_score=50)
    values.update(overrides)
    return RecommendationContext(**values)


def test_rules_always_give_two_to_four_items():
    rules = RuleBasedRecommendationProvider()
    no_gaps = rules.recommend(_context(matched_skills=["Java"], relevance_score=90))
    many_gaps = rules.recommend(_context(
        missing_required=["Docker", "AWS"], partial_skills=[("PostgreSQL", "MySQL")], required_years=5,
        candidate_years=1, candidate_total_years=1, education_gap=True, required_education="Master's degree",
        candidate_education="Bachelor's degree", language_gaps=[("English", "fluent", "basic")], relevance_score=20,
        missing_nice_to_have=["Kafka"],
    ))
    assert 2 <= len(no_gaps) <= 4
    assert len(many_gaps) == 4
    assert "Docker" in many_gaps[0]  # most important gap first


def test_llm_is_disabled_by_default(monkeypatch):
    monkeypatch.delenv("LLM_BASE_URL", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    assert get_recommendation_provider().name == "rules"


class _FakeLLM(BaseHTTPRequestHandler):
    reply = '["Add Docker to a real project.", "Mention PostgreSQL explicitly."]'
    seen = []

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        _FakeLLM.seen.append((self.path, body, self.headers.get("Authorization")))
        payload = json.dumps({"choices": [{"message": {"content": _FakeLLM.reply}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


@pytest.fixture
def fake_llm():
    server = HTTPServer(("127.0.0.1", 0), _FakeLLM)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    _FakeLLM.seen.clear()
    yield f"http://127.0.0.1:{server.server_port}/v1"
    server.shutdown()


def test_llm_provider_is_used_when_configured(monkeypatch, fake_llm):
    monkeypatch.setenv("LLM_BASE_URL", fake_llm)
    monkeypatch.setenv("LLM_MODEL", "llama3.1:8b")
    monkeypatch.setenv("LLM_API_KEY", "local-key")
    provider = get_recommendation_provider()
    recs, source = provider.recommend_with_source(_context(missing_required=["Docker"]))
    assert source == "llm"
    assert recs == ["Add Docker to a real project.", "Mention PostgreSQL explicitly."]
    path, body, auth = _FakeLLM.seen[0]
    assert path == "/v1/chat/completions" and body["model"] == "llama3.1:8b" and auth == "Bearer local-key"


def test_invalid_llm_answer_falls_back_to_rules(monkeypatch, fake_llm):
    monkeypatch.setattr(_FakeLLM, "reply", "Sure! Here are some tips...")
    monkeypatch.setenv("LLM_BASE_URL", fake_llm)
    monkeypatch.setenv("LLM_MODEL", "m")
    recs, source = get_recommendation_provider().recommend_with_source(_context(missing_required=["Docker"]))
    assert source == "rules" and 2 <= len(recs) <= 4


def test_unreachable_llm_falls_back_to_rules(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://127.0.0.1:9/v1")  # nothing listens on the discard port
    monkeypatch.setenv("LLM_MODEL", "m")
    monkeypatch.setenv("LLM_TIMEOUT_SECONDS", "2")
    recs, source = get_recommendation_provider().recommend_with_source(_context(missing_required=["Docker"]))
    assert source == "rules" and 2 <= len(recs) <= 4


def test_score_never_depends_on_the_llm(monkeypatch, fake_llm, scorer, rules):
    without = compute_match(f.CV_JAVA_JUNIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA, scorer, rules)
    monkeypatch.setenv("LLM_BASE_URL", fake_llm)
    monkeypatch.setenv("LLM_MODEL", "m")
    with_llm = compute_match(f.CV_JAVA_JUNIOR, f.OFFER_JAVA_TITLE, f.OFFER_JAVA, scorer, get_recommendation_provider())
    assert with_llm["recommendations_source"] == "llm"
    assert with_llm["overall_score"] == without["overall_score"]
    assert with_llm["categories"] == without["categories"]


def test_openai_provider_rejects_non_list(monkeypatch, fake_llm):
    monkeypatch.setattr(_FakeLLM, "reply", '{"tips": []}')
    provider = OpenAICompatibleRecommendationProvider(fake_llm, "m")
    with pytest.raises(ValueError):
        provider.recommend(_context())
