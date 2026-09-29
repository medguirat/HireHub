# ai-service

Service Python (FastAPI) qui lit les CV, calcule la compatibilité CV / offre et importe les informations d'une entreprise depuis son site web, pour HireHub.

Normalement, on le lance avec tout le reste depuis la racine du projet : `npm run dev` (voir le README principal).

## Lancer ce service seul

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate            # Windows (source venv/bin/activate sous Mac/Linux)
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Au premier lancement, le modèle d'embeddings multilingue `paraphrase-multilingual-MiniLM-L12-v2` (environ 470 Mo) est téléchargé une fois, puis mis en cache. Il compare les CV et les offres en français, en anglais ou mélangés.

La documentation interactive de l'API est sur http://localhost:8000/docs.

## Endpoints

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/health` | Renvoie `ok` quand le modèle est chargé (sinon 503 `loading`), avec la version de l'algorithme |
| POST | `/extract` | Fichier (PDF ou DOCX) → texte. Renvoie 415 si le format n'est pas supporté, 422 si le fichier n'a pas de texte (PDF scanné) |
| POST | `/match` | `{cv_text, offer: {title, description}}` → score détaillé |
| POST | `/company/profile` | `{url}` → champs du profil entreprise trouvés sur le site (un champ absent du site n'est pas renvoyé). 422 avec `{code, message}` si le site est invalide, privé, injoignable ou n'est pas une page web |
| POST | `/analyze/bio` | Génère une bio de profil à partir d'un modèle de texte |

## Organisation

```
matching/
  taxonomy.py         compétences (synonymes, implications), langues, niveaux d'études
  parsing.py          extraction : compétences requises / souhaitées, années d'expérience, études, langues
  semantic.py         pertinence sémantique (sentence-transformers)
  scoring.py          score pondéré et détail par catégorie
  recommendations.py  conseils (règles par défaut, LLM optionnel)
  extraction.py       texte des PDF et DOCX
company/
  scraper.py          lecture du site (validation de l'URL, réseaux privés refusés, limites de taille et de temps)
  extract.py          HTML → champs (schema.org, balises meta, liens, sections Mission / Vision / Valeurs)
tests/                pytest, avec des CV et offres réalistes
```

Le score est **déterministe**. Pour les mêmes entrées, on obtient toujours le même résultat, et chaque point s'explique par un élément du texte. Le LLM optionnel (variables `LLM_BASE_URL` et `LLM_MODEL`, voir le README principal) rédige uniquement les conseils et ne modifie jamais le score.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```
