# =========================================================
# main.py
# But : assembler tous les modules IA et les exposer comme une API web,
#       que ton backend Spring Boot pourra appeler en HTTP.
#
# Pour lancer ce fichier : uvicorn main:app --reload --port 8000
# =========================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from skill_extractor import extract_skills
from job_classifier import classify_job
from experience_detector import detect_experience_level
from cv_matcher import compute_compatibility, missing_skills, generate_roadmap

app = FastAPI(title="HireHub AI Service")

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------
# Endpoint 1 : analyser une offre d'emploi
# -------------------------------------------------------

class OfferAnalysisRequest(BaseModel):
    title: str
    description: str


class OfferAnalysisResponse(BaseModel):
    skills: list[str]
    category: str
    experience_level: str


@app.post("/analyze/offer", response_model=OfferAnalysisResponse)
def analyze_offer(req: OfferAnalysisRequest):
    return OfferAnalysisResponse(
        skills=extract_skills(req.description),
        category=classify_job(req.title, req.description),
        experience_level=detect_experience_level(req.description),
    )


# -------------------------------------------------------
# Endpoint 2 : comparer un CV à une offre
# -------------------------------------------------------

class MatchRequest(BaseModel):
    cv_text: str
    offer_text: str
    candidate_skills: list[str]
    required_skills: list[str]


class MatchResponse(BaseModel):
    compatibility_score: float
    missing_skills: list[str]
    roadmap: list[dict]


@app.post("/analyze/match", response_model=MatchResponse)
def analyze_match(req: MatchRequest):
    score = compute_compatibility(req.cv_text, req.offer_text)
    missing = missing_skills(req.candidate_skills, req.required_skills)
    return MatchResponse(
        compatibility_score=score,
        missing_skills=missing,
        roadmap=generate_roadmap(missing),
    )


# -------------------------------------------------------
# Endpoint 3 : Génération / Optimisation de Bio AI
# -------------------------------------------------------

class BioRequest(BaseModel):
    title: str = ""
    skills: list[str] = []
    text: str = ""


class BioResponse(BaseModel):
    generated_bio: str
    extracted_skills: list[str]


@app.post("/analyze/bio", response_model=BioResponse)
def generate_bio(req: BioRequest):
    extracted = extract_skills(req.text) if req.text else []
    all_skills = sorted(list(set(req.skills + extracted)))
    skills_str = ", ".join(all_skills) if all_skills else "software development, problem solving, modern tools"
    role = req.title.strip() if req.title else "Passionate Professional"
    
    bio = (
        f"Dynamic and results-oriented {role} skilled in {skills_str}. "
        f"Experienced in building high-performance solutions, collaborating with cross-functional teams, "
        f"and continuously learning cutting-edge technologies to drive impactful recruitment and tech engineering results."
    )
    return BioResponse(generated_bio=bio, extracted_skills=all_skills)


# -------------------------------------------------------
# Endpoint de test simple, pour vérifier que le serveur tourne
# -------------------------------------------------------

@app.get("/")
def health_check():
    return {"status": "HireHub AI Service is running"}

