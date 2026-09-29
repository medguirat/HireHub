# HireHub

Recruitment platform with two roles, recruiters and candidates.

| Part | Stack | Port |
|---|---|---|
| `frontend/` | React + Vite | 5173 |
| `backend/` | Spring Boot (Java 17+), MySQL | 8081 |
| `ai-service/` | Python FastAPI: CV text extraction, CV/offer matching, company website import | 8000 |

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

The first start downloads the multilingual embedding model (about 470 MB), so it needs internet once.

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
| Relevance | 15% | Semantic similarity (multilingual sentence-transformers) between the offer's statements and the CV, so French and English CVs and offers can be compared with each other |
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
| `EMBEDDING_MODEL` | ai-service | `paraphrase-multilingual-MiniLM-L12-v2` (French, English, Arabic and 50+ other languages) |

## Database changes to apply by hand

The backend uses `spring.jpa.hibernate.ddl-auto=update`, which adds new tables and columns by itself but never changes an existing column. Run this once on an existing database (MySQL):

```sql
-- Company description: from VARCHAR(255) to TEXT (max 5000 characters, checked by the API)
ALTER TABLE recruiter_profiles MODIFY description TEXT NULL;
```

The test database (`hirehub_test`) is recreated on every test run, so it needs nothing.

## Company profile import

A recruiter can give their company website at signup. The account is created immediately; the import runs in the background and fills the company profile with what the website states. The profile page shows "We're building your company profile from your website…" while it runs.

- Only public pages are read: the homepage and up to 4 same-site "about" / "contact" pages. Sources are structured data (schema.org), meta tags, links (social networks, Google Maps, phone) and sections titled Mission, Vision, Values (English and French).
- A field the website doesn't state stays empty. Industry and company type are never guessed.
- Only empty fields are filled; nothing the recruiter typed is overwritten. Imported fields are marked "From your website" until the recruiter edits them.
- If the import fails (site unreachable, not a web page, ai-service down...), the signup still succeeds, the profile page explains why and offers "Try again".
- Safety limits: http(s) only, no private or local network addresses (checked on every redirect), 5 redirects, 2 MB per page, 5 s connect / 10 s read timeouts, 25 s in total.


## Design system (frontend)

The look comes from the Recruiter Statistics page: frosted glass panels on a dark navy canvas, accent-tinted cards, the navy → magenta brand gradient.

- `frontend/src/styles/tokens.css`: every color, font size, spacing step, radius and shadow. It is the only file allowed to contain color values. Elsewhere use `var(--token)`, or `rgba(var(--token-rgb), alpha)` for transparency.
- `frontend/src/styles/components.css`: shared building blocks (glass cards, metric cards with an `accent-*` color, pills, tags, meters, segmented controls, avatars, alert dialog, responsive tables, focus rings).
- The splash, login and signup pages keep their own warm gradient through dedicated `--auth-*` / `--splash-*` tokens.
- Keyboard: every interactive element is a real button, link or form control and shows a visible focus ring. On screens under 900 px the sidebar becomes a top bar with a menu button, and tables become one card per row under 640 px.
