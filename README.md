# HireHub

Recruitment platform with two roles, recruiters and candidates.

| Part | Stack | Port |
|---|---|---|
| `frontend/` | React + Vite | 5173 |
| `backend/` | Spring Boot (Java 17+), MySQL | 8081 |
| `ai-service/` | Python FastAPI: CV text extraction and CV/offer matching | 8000 |
| `scraping/` | Company website scraper | - |

## Run everything

Prerequisites: Node 18+, Python 3.11+, JDK 17+, MySQL 8 running on `localhost:3306`.

```bash
npm run dev
```

This single command:
- installs missing Python and frontend dependencies,
- starts the ai-service, the backend and the frontend,
- waits for each one to pass its health check,
- restarts a service if it crashes or fails 3 health checks in a row.

Open http://localhost:5173. Press Ctrl+C to stop everything.

The first start downloads the embedding model (about 90 MB), so it needs internet once.

Health endpoints:
- `GET http://localhost:8081/api/health` reports the backend and the status of the ai-service.
- `GET http://localhost:8000/health` reports the ai-service and its scoring algorithm version.

## Demo data

With the stack running:

```bash
npm run seed
```

This creates 3 fictional companies, 8 offers, 5 candidates with PDF CVs and a few applications. It is safe to run repeatedly. Every demo account uses the `@demo.hirehub.test` domain and the password `Demo1234!` (override with `DEMO_PASSWORD`), for example:

| Role | Email |
|---|---|
| Recruiter | `leila.mansour@demo.hirehub.test` |
| Candidate | `amine.trabelsi@demo.hirehub.test` |

## Tests

```bash
npm test
```

This runs the ai-service suite (pytest), the backend suite (unit tests and MockMvc integration tests) and a frontend build.

Backend integration tests use their own database, `hirehub_test`, which is created automatically. They never touch `hirehub_db`.

Run each part separately:
- `cd ai-service && python -m pytest`
- `cd backend && ./mvnw test`

## CV matching

A candidate uploads one CV (PDF or DOCX, max 10 MB). When they open an offer, the backend asks the ai-service to compare that CV with the offer, then caches the result per (CV version, offer text, algorithm version).

The score (0-100) is deterministic and explainable. It is a weighted average of five categories:

| Category | Weight | How it is measured |
|---|---|---|
| Skills | 45% | Required and nice-to-have skills parsed from the offer, normalised with synonyms ("JS" = JavaScript, Spring Boot implies Spring) |
| Experience | 20% | Years in roles that use the offer's skills |
| Relevance | 15% | Semantic similarity (sentence-transformers) between the offer's statements and the CV |
| Education | 10% | Degree level |
| Languages | 10% | Languages and proficiency |

A category the offer doesn't mention is left out, and the other weights are rescaled.

If the ai-service is unavailable, the app says so and offers a retry. It never shows an estimated score.

### Optional LLM for recommendations

By default, improvement suggestions are rule-based. To have a local LLM write them instead, point the ai-service at any OpenAI-compatible endpoint, for example [Ollama](https://ollama.com):

```bash
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1:8b
# LLM_API_KEY=...          only if your server requires one
```

The LLM only writes the suggestions. The score never depends on it, and if the LLM fails the rule-based suggestions are used.

## Configuration

| Variable | Used by | Default |
|---|---|---|
| `AI_SERVICE_URL` | backend | `http://localhost:8000` |
| `CV_STORAGE_DIR` | backend: private CV files, never served publicly | `cv-store` |
| `VITE_API_URL` | frontend | `http://localhost:8081/api` |
| `EMBEDDING_MODEL` | ai-service | `all-MiniLM-L6-v2` |
