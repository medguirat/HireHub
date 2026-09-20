# =========================================================
# cv_matcher.py
# But : comparer le "sens" d'un CV et d'une offre (pas juste les mots),
#       calculer un score de compatibilité, trouver les compétences
#       manquantes et proposer une petite roadmap.
# =========================================================

from sentence_transformers import SentenceTransformer, util

# Ce modèle est téléchargé automatiquement la première fois que tu lances
# le programme (environ 80 Mo), puis réutilisé depuis un cache local.
# Cette ligne peut prendre 10-30 secondes la toute première fois.
model = SentenceTransformer("all-MiniLM-L6-v2")


def compute_compatibility(cv_text: str, offer_text: str) -> float:
    """
    Renvoie un score de 0 à 100 représentant à quel point le CV
    et l'offre "parlent du même sujet", même si les mots utilisés
    sont différents.
    """
    embeddings = model.encode([cv_text, offer_text], convert_to_tensor=True)
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
    return round(similarity * 100, 1)


def missing_skills(candidate_skills: list[str], required_skills: list[str]) -> list[str]:
    """
    Renvoie les compétences demandées par l'offre que le candidat n'a pas.
    """
    candidate_set = {s.lower() for s in candidate_skills}
    return [s for s in required_skills if s.lower() not in candidate_set]


# Petite base de conseils pour combler les lacunes.
# Complète-la avec les compétences qui reviennent le plus dans tes offres.
ROADMAP_DB = {
    "docker": {"action": "Apprendre Docker", "ressource": "Docker for Beginners (freeCodeCamp)", "duree_semaines": 2},
    "kubernetes": {"action": "Faire un mini-projet avec Kubernetes", "ressource": "Kubernetes Basics (k8s.io)", "duree_semaines": 4},
    "aws": {"action": "Passer la certif AWS Cloud Practitioner", "ressource": "AWS Skill Builder", "duree_semaines": 3},
    "react": {"action": "Construire une petite app avec React", "ressource": "React.dev - Learn", "duree_semaines": 2},
}


def generate_roadmap(missing: list[str]) -> list[dict]:
    """
    Pour chaque compétence manquante, propose une action concrète.
    """
    roadmap = []
    for skill in missing:
        entry = ROADMAP_DB.get(skill.lower(), {
            "action": f"Se former sur {skill}",
            "ressource": "À rechercher",
            "duree_semaines": 2,
        })
        roadmap.append({"skill": skill, **entry})
    return roadmap


if __name__ == "__main__":
    cv = "Développeur backend avec 3 ans d'expérience en Java, Spring Boot et PostgreSQL"
    offer = "Nous recherchons un développeur backend Java, connaissance de Spring appréciée"

    score = compute_compatibility(cv, offer)
    print(f"Score de compatibilité : {score}%")

    manquantes = missing_skills(
        candidate_skills=["java", "spring boot", "postgresql"],
        required_skills=["java", "spring boot", "docker", "aws"],
    )
    print("Compétences manquantes :", manquantes)
    print("Roadmap :", generate_roadmap(manquantes))
