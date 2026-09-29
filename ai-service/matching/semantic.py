"""Semantic relevance between a CV and an offer, with sentence-transformers.

Score = how well the CV covers each statement of the offer: every offer
sentence is compared with every CV passage, the best cosine similarity per
offer sentence is kept, and those are averaged. That rewards a CV that
addresses the offer's responsibilities point by point, instead of rewarding
long CVs that merely share vocabulary.
"""

import os
import threading

from .parsing import split_sentences

# Multilingual (50+ languages, incl. French and Arabic): CVs and offers are often
# French, English or a mix, and are compared across languages.
DEFAULT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# With this model, the coverage of an unrelated CV sits around 0.25-0.34 and
# that of a CV written for the role around 0.58-0.66, in any EN/FR combination
# (measured on the test fixtures). That range is mapped linearly onto 0-100 and
# clamped; the same formula applies to every CV and offer.
RAW_FLOOR = 0.30
RAW_CEILING = 0.70

MIN_WORDS = 4
MAX_CV_PASSAGES = 150


def _passages(text):
    return [s for s in split_sentences(text) if len(s.split()) >= MIN_WORDS]


class SemanticScorer:
    def __init__(self, model_name=None):
        self.model_name = model_name or os.getenv("EMBEDDING_MODEL", DEFAULT_MODEL)
        self._model = None
        self._lock = threading.Lock()

    @property
    def loaded(self):
        return self._model is not None

    def load(self):
        with self._lock:
            if self._model is None:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
        return self._model

    def relevance(self, cv_text, offer_title, offer_description):
        from sentence_transformers import util

        model = self.load()
        offer_parts = _passages(offer_description) or [f"{offer_title}. {offer_description}".strip()]
        offer_parts.insert(0, offer_title)
        cv_parts = _passages(cv_text)[:MAX_CV_PASSAGES] or [cv_text]

        offer_emb = model.encode(offer_parts, convert_to_tensor=True, normalize_embeddings=True)
        cv_emb = model.encode(cv_parts, convert_to_tensor=True, normalize_embeddings=True)
        best_per_offer_part = util.cos_sim(offer_emb, cv_emb).max(dim=1).values
        raw = float(best_per_offer_part.mean())

        scaled = (raw - RAW_FLOOR) / (RAW_CEILING - RAW_FLOOR)
        return {"score": round(max(0.0, min(1.0, scaled)) * 100), "raw_similarity": round(raw, 4)}
