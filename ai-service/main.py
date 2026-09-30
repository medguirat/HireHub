"""HireHub AI service: CV text extraction, CV/offer matching and company profile import.

Run: uvicorn main:app --port 8000
Called by the Spring Boot backend (matching) and by the profile pages (bio).
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from company.scraper import ScrapeError, scrape_company
from drafts import NotEnoughData, draft_bio, draft_company, get_rewriter
from matching import ALGORITHM_VERSION
from matching.extraction import ExtractionError, extract_text
from matching.recommendations import get_recommendation_provider
from matching.scoring import compute_match
from matching.semantic import SemanticScorer

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("hirehub.ai")

semantic_scorer = SemanticScorer()
recommendation_provider = get_recommendation_provider()
draft_rewriter = get_rewriter()


@asynccontextmanager
async def lifespan(_app):
    log.info("Loading embedding model %s ...", semantic_scorer.model_name)
    semantic_scorer.load()
    log.info("Model loaded. Recommendations: %s", recommendation_provider.name)
    yield


app = FastAPI(title="HireHub AI Service", lifespan=lifespan)

# The browser only calls /draft/* directly; matching and company import go through the backend.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    body = {
        "status": "ok" if semantic_scorer.loaded else "loading",
        "algorithm_version": ALGORITHM_VERSION,
        "embedding_model": semantic_scorer.model_name,
        "recommendations": recommendation_provider.name,
        "drafts": "llm" if draft_rewriter else "template",
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


class CompanyRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


@app.post("/company/profile")
def company_profile(req: CompanyRequest):
    """Fields stated on the company's website; anything not found is simply absent."""
    try:
        return scrape_company(req.url)
    except ScrapeError as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": str(exc)}) from exc


# ---------------------------------------------------------------------------
# Profile drafts (company description, candidate bio): only from the user's own data
# ---------------------------------------------------------------------------

class CompanyDraftRequest(BaseModel):
    companyName: str = ""
    companyType: str = ""
    industry: str = ""
    headquarters: str = ""
    offices: str = ""
    foundedYear: int | str | None = None
    companySize: str = ""
    mission: str = ""
    vision: str = ""
    companyValues: str = ""
    technologies: str = ""
    websiteDescription: str = Field("", max_length=5000)


class ExperienceIn(BaseModel):
    position: str = ""
    company: str = ""
    startDate: str | None = None
    endDate: str | None = None


class LanguageIn(BaseModel):
    language: str = ""
    level: str = ""


class BioDraftRequest(BaseModel):
    headline: str = ""
    skills: list[str] = []
    experiences: list[ExperienceIn] = []
    education: str = ""
    languages: list[LanguageIn] = []


def _draft(fn, payload):
    try:
        return fn(payload, draft_rewriter)
    except NotEnoughData as exc:
        raise HTTPException(status_code=422, detail={"code": "not_enough_data", "message": str(exc)}) from exc


@app.post("/draft/company")
def draft_company_description(req: CompanyDraftRequest):
    return _draft(draft_company, req.model_dump())


@app.post("/draft/bio")
def draft_candidate_bio(req: BioDraftRequest):
    return _draft(draft_bio, req.model_dump())
