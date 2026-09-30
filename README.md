# HireHub

Recruitment platform with two roles, recruiters and candidates.

| Part | Stack | Port |
|---|---|---|
| `frontend/` | React + Vite | 5173 |
| `backend/` | Spring Boot (Java 17+), MySQL | 8081 |
| `ai-service/` | Python FastAPI: CV text extraction, CV/offer matching, company website import | 8000 |

## Install and run (one command)

Prerequisites (all free): Node 18+, Python 3.11+, JDK 17+, and MySQL 8 running on `localhost:3306`
(the database is created automatically).

```bash
npm run dev
```

The first time, this creates a `.env` file at the root of the repository (see [Secrets and local
settings](#secrets-and-local-settings)) with a freshly generated `JWT_SECRET`, and asks you to put your MySQL
password in it. Run `npm run dev` again after that.

This single command:
- installs missing Python and frontend dependencies,
- starts the ai-service, the backend and the frontend,
- waits for each one to pass its health check,
- restarts a service if it crashes or fails 3 health checks in a row.

Open http://localhost:5173. Stop everything with Ctrl+C, or from another terminal with:

```bash
npm run stop
```

If the launcher is closed or killed abruptly, a small watchdog stops the three services by itself, and the next
`npm run dev` cleans up anything left over. Only processes the launcher started are ever stopped.

The first start downloads the multilingual embedding model (about 470 MB), so it needs internet once.

Health endpoints:
- `GET http://localhost:8081/api/health` reports the backend and the status of the ai-service.
- `GET http://localhost:8000/health` reports the ai-service, its scoring algorithm version, and whether the optional LLM is used.

## Demo accounts

With the stack running:

```bash
npm run seed
```

This creates 3 fictional companies, 9 offers (one in French), 6 candidates with PDF CVs (one French CV) and a few
applications. It is safe to run again: nothing is duplicated. Every demo account uses the password `Demo1234!`
(override with `DEMO_PASSWORD`).

| Role | Email | Company / profile |
|---|---|---|
| Recruiter | `leila.mansour@demo.hirehub.test` | Novatech Solutions (software) |
| Recruiter | `omar.khelifi@demo.hirehub.test` | DataSphere Analytics |
| Recruiter | `nadia.bouazizi@demo.hirehub.test` | Atlas Retail Group |
| Candidate | `amine.trabelsi@demo.hirehub.test` | Senior Java backend engineer |
| Candidate | `sarra.bensalah@demo.hirehub.test` | Java developer |
| Candidate | `yasmine.gharbi@demo.hirehub.test` | Data analyst |
| Candidate | `mehdi.jaziri@demo.hirehub.test` | Frontend developer |
| Candidate | `nour.hammami@demo.hirehub.test` | Développeuse Java (French CV) |
| Candidate | `ines.chaabane@demo.hirehub.test` | Digital marketing |

## Tests

Everything except the browser tests, in one command:

```bash
npm test
```

| Suite | What it covers | Run it alone |
|---|---|---|
| ai-service (pytest) | CV text extraction, parsing (English and French), scoring, recommendations, company website import (incl. SSRF protection), profile drafts | `cd ai-service && python -m pytest` |
| backend (JUnit + MockMvc) | Every endpoint: access rules for both roles (401 / 403), validation errors, happy paths; services, matching and company import with the ai-service mocked | `cd backend && ./mvnw test` |
| frontend lint (ESLint) | JavaScript and React Hooks rules | `cd frontend && npm run lint` |
| frontend unit (Vitest + React Testing Library) | Forms and validation, CV match dialog, search, statistics periods, routing guard, dialogs, utilities | `cd frontend && npm test` |
| frontend build | The production build compiles | `cd frontend && npm run build` |

End-to-end tests in a real browser (Playwright, Chromium):

```bash
npm run test:e2e
```

They cover the full recruiter journey (signup with a company website and automatic profile import, publishing an
offer, seeing and accepting an application, statistics), the full candidate journey (signup, profile, CV upload,
the new offer at the top of the feed, a real CV match, applying, "My applications"), the error paths (applying
twice, an invalid CV file, an expired session, the matching service being unavailable) and the "building your
company profile" banner during a slow import.

`npm run test:e2e` starts the whole stack itself (with `COMPANY_SCRAPER_ALLOW_PRIVATE=1`, a test-only setting that
lets the ai-service import the local fixture website), so stop `npm run dev` first with `npm run stop`. The first
run installs nothing extra if Playwright's Chromium is already on the machine; otherwise run
`npx playwright install chromium` once. Every account the E2E tests create starts with `qa-e2e-` and is deleted at
the end of the run (`npm run e2e:cleanup` does the same by hand). Nothing else in the database is touched.

Backend integration tests use their own database, `hirehub_test`, created automatically. They never touch `hirehub_db`.

## Optional: a local AI model with Ollama

HireHub works fully without any AI model or API key. Two features can use a local model if you have one:
- the improvement suggestions shown with a CV match,
- the rewording of the "Draft a description" / "Draft my bio" texts.

The score itself never depends on it. To use [Ollama](https://ollama.com) (free, runs on your machine):

1. Install Ollama, then download a model: `ollama pull llama3.1:8b`
2. Set these variables in the terminal before `npm run dev`:

   ```bash
   # macOS / Linux
   export LLM_BASE_URL=http://localhost:11434/v1
   export LLM_MODEL=llama3.1:8b
   ```

   ```powershell
   # Windows PowerShell
   $env:LLM_BASE_URL = "http://localhost:11434/v1"
   $env:LLM_MODEL = "llama3.1:8b"
   ```

   Any OpenAI-compatible server works the same way (`LLM_API_KEY` if it needs one, `LLM_TIMEOUT_SECONDS`, default 20).
3. Check `http://localhost:8000/health`: `"drafts": "llm"` and `"recommendations": "llm (fallback: rules)"`.

Safeguards: if the model is unreachable, slow or answers badly, the rule-based suggestions and the plain templates
are used instead. A reworded draft that adds a number, a link or praise that isn't in your data is discarded. The
page says "AI-assisted" only when the model's text was actually used, and you always review a draft before saving.

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

## Secrets and local settings

Secrets never go in the code. They live in `.env` at the root of the repository, which git ignores;
`.env.example` lists every setting with placeholder values. The launcher passes `.env` to all three services, and
the backend also reads it directly, so starting the backend from an IDE works the same way. A variable already set
in your environment wins over `.env`.

| Variable | What it is | Required |
|---|---|---|
| `DB_URL` | JDBC URL of the MySQL database | no (default `jdbc:mysql://localhost:3306/hirehub_db?createDatabaseIfNotExist=true`) |
| `DB_USERNAME` | MySQL user | no (default `root`) |
| `DB_PASSWORD` | MySQL password; leave the value empty if the account has none | **yes** |
| `JWT_SECRET` | Key that signs login tokens: base64, at least 32 bytes (256 bits) | **yes**: the backend refuses to start without a valid one |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS` | Outgoing email server | no |

Changing a value:
1. Open `.env` in a text editor (create it with `cp .env.example .env` if it doesn't exist). Write `KEY=value` with
   no quotes and no spaces around `=`.
2. For a new `JWT_SECRET`, run `npm run secret` and paste the printed value after `JWT_SECRET=`. Changing it signs
   everyone out (their tokens no longer verify).
3. Restart: `npm run stop`, then `npm run dev`.

Backend tests use their own database, `hirehub_test`, with the same `DB_USERNAME` / `DB_PASSWORD`, and a test-only
signing key; they never read your `JWT_SECRET`.

## Configuration

Other settings (not secret), as environment variables or in `.env`:

| Variable | Used by | Default |
|---|---|---|
| `AI_SERVICE_URL` | backend | `http://localhost:8000` |
| `CV_STORAGE_DIR` | backend: private CV files, never served publicly | `cv-store` |
| `VITE_API_URL` | frontend | `http://localhost:8081/api` |
| `EMBEDDING_MODEL` | ai-service | `paraphrase-multilingual-MiniLM-L12-v2` (French, English, Arabic and 50+ other languages) |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_TIMEOUT_SECONDS` | ai-service, optional | unset: no LLM (see Ollama above) |
| `COMPANY_SCRAPER_ALLOW_PRIVATE` | ai-service, E2E tests only | unset: local and private addresses are refused |

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
