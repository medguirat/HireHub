# =========================================================
# skill_extractor.py
# But : trouver quelles compétences techniques sont mentionnées
#       dans le texte d'une offre d'emploi.
# =========================================================

# Liste des compétences qu'on sait reconnaître.
# Tu peux ajouter des mots ici a tout moment, pas besoin de savoir coder pour ca.
SKILLS_DB = [
    "python", "java", "spring boot", "react", "docker", "kubernetes",
    "postgresql", "mysql", "redis", "aws", "azure", "gcp",
    "typescript", "javascript", "node.js", "rest api", "graphql",
    "sql", "git", "agile", "scrum", "machine learning",
    "html", "css", "flutter", "android", "ios", "django",
]


def extract_skills(text: str) -> list[str]:
    """
    Cherche dans 'text' quelles compétences de SKILLS_DB sont présentes.
    Renvoie une liste triée, sans doublons.
    """
    # On met tout en minuscules pour que "Python" et "python" soient traités pareil
    text_lower = text.lower()

    found = []
    for skill in SKILLS_DB:
        if skill in text_lower:
            found.append(skill)

    # set() enlève les doublons, sorted() trie par ordre alphabétique
    return sorted(set(found))


# Ce bloc ne s'exécute QUE si tu lances ce fichier directement
# (avec la commande : python skill_extractor.py)
# Il ne s'exécute PAS quand ce fichier est juste importé par un autre fichier.
if __name__ == "__main__":
    exemple_offre = """
    We are looking for a Python developer with experience in Docker,
    PostgreSQL and REST API design. Knowledge of React is a plus.
    """
    resultat = extract_skills(exemple_offre)
    print("Compétences trouvées :", resultat)
