import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# The shared key the backend sends (security.py); set before main is imported.
TEST_KEY = "test-internal-key-0123456789abcdef"
os.environ["AI_SERVICE_KEY"] = TEST_KEY

from matching.recommendations import FallbackRecommendationProvider, RuleBasedRecommendationProvider  # noqa: E402
from matching.scoring import compute_match  # noqa: E402
from matching.semantic import SemanticScorer  # noqa: E402


@pytest.fixture(scope="session")
def scorer():
    s = SemanticScorer()
    s.load()
    return s


@pytest.fixture(scope="session")
def rules():
    r = RuleBasedRecommendationProvider()
    return FallbackRecommendationProvider(r, r)


@pytest.fixture(scope="session")
def match(scorer, rules):
    def _match(cv, title, description):
        return compute_match(cv, title, description, scorer, rules)
    return _match
