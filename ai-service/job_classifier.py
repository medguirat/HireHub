# =========================================================
# job_classifier.py
# But : deviner la catégorie d'un poste (Backend, Frontend, etc.)
#       à partir du titre et de la description de l'offre.
# =========================================================

JOB_CATEGORIES = {
    "Backend Developer": ["backend", "api", "server", "spring", "django", "database"],
    "Frontend Developer": ["frontend", "react", "vue", "angular", "ui", "css"],
    "Fullstack Developer": ["fullstack", "full-stack", "full stack"],
    "Data Engineer": ["data pipeline", "etl", "airflow", "data warehouse"],
    "DevOps Engineer": ["devops", "ci/cd", "kubernetes", "infrastructure"],
    "Mobile Developer": ["ios", "android", "flutter", "react native"],
}


def classify_job(title: str, description: str) -> str:
    """
    Compte combien de mots-clés de chaque catégorie apparaissent
    dans le titre + la description, et renvoie la catégorie qui gagne.
    """
    text = (title + " " + description).lower()

    scores = {}
    for category, keywords in JOB_CATEGORIES.items():
        count = sum(1 for kw in keywords if kw in text)
        scores[category] = count

    # On cherche la catégorie qui a le score le plus haut
    best_category = max(scores, key=scores.get)

    # Si aucun mot-clé trouvé nulle part, on ne fait pas semblant de savoir
    if scores[best_category] == 0:
        return "Other"

    return best_category


if __name__ == "__main__":
    titre = "Senior Backend Developer"
    description = "We need someone strong in Spring Boot and database design."
    print("Catégorie détectée :", classify_job(titre, description))
