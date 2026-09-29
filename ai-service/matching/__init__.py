"""Deterministic CV / job-offer matching pipeline for HireHub.

The numeric score is computed only from explainable signals (skills,
experience, education, languages, semantic relevance). An optional LLM may
rephrase recommendations, but never influences the score.
"""

# Bump on any change that can alter scores: cached results are recomputed.
ALGORITHM_VERSION = "2026.09-2"
