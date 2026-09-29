"""HireHub AI service: CV text extraction and CV/offer matching.

Run: uvicorn main:app --port 8000
Called by the Spring Boot backend (matching) and by the profile pages (bio).
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from matching import ALGORITHM_VERSION
from matching.extraction import ExtractionError, extract_text
from matching.parsing import extract_skills
from matching.recommendations import get_recommendation_provider
from matching.scoring import compute_match
from matching.semantic import SemanticScorer
from matching.taxonomy import SKILLS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("hirehub.ai")

semantic_scorer = SemanticScorer()
recommendation_provider = get_recommendation_provider()


@asynccontextmanager
async def lifespan(_app):
    log.info("Loading embedding model %s ...", semantic_scorer.model_name)
    semantic_scorer.load()
    log.info("Model loaded. Recommendations: %s", recommendation_provider.name)
    yield


app = FastAPI(title="HireHub AI Service", lifespan=lifespan)

# The browser only calls /analyze/bio directly; matching goes through the backend.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    body = {
        "status": "ok" if semantic_scorer.loaded else "loading",
        "algorithm_version": ALGORITHM_VERSION,
        "embedding_model": semantic_scorer.model_name,
        "recommendations": recommendation_provider.name,
    }
    return JSONResponse(body, status_code=200 if semantic_scorer.loaded else 503)


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    data = await file.read()
    try:
        text, fmt = extract_text(data, file.filename)
    except ExtractionError as exc:
        status = 415 if exc.code == "unsupported_format" else 422
        raise HTTPException(status_code=status, detail={"code": exc.code, "message": str(exc)}) from exc
    return {"text": text, "format": fmt, "characters": len(text)}


class Offer(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""


class MatchRequest(BaseModel):
    cv_text: str = Field(min_length=1)
    offer: Offer


@app.post("/match")
def match(req: MatchRequest):
    return compute_match(req.cv_text, req.offer.title, req.offer.description,
                         semantic_scorer, recommendation_provider)


# ---------------------------------------------------------------------------
# Profile bio helper (template based, used by the profile pages)
# ---------------------------------------------------------------------------

class BioRequest(BaseModel):
    title: str = ""
    skills: list[str] = []
    text: str = ""


class BioResponse(BaseModel):
    generated_bio: str
    extracted_skills: list[str]


@app.post("/analyze/bio", response_model=BioResponse)
def generate_bio(req: BioRequest):
    extracted = [SKILLS[key].display for key in extract_skills(req.text)] if req.text else []
    all_skills = sorted(set(req.skills + extracted))
    skills_str = ", ".join(all_skills) if all_skills else "software development, problem solving, modern tools"
    role = req.title.strip() or "Passionate Professional"
    bio = (
        f"Dynamic and results-oriented {role} skilled in {skills_str}. "
        f"Experienced in building high-performance solutions, collaborating with cross-functional teams, "
        f"and continuously learning cutting-edge technologies to drive impactful results."
    )
    return BioResponse(generated_bio=bio, extracted_skills=all_skills)
