# ai-service

Python service (FastAPI) for HireHub: reads CVs, scores how well a CV matches an offer, imports a company's
details from its website, and drafts profile texts from the user's own data.

It normally runs with everything else from the repository root: `npm run dev` (see the main README).

## Run this service alone

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate            # Windows (source venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
set AI_SERVICE_KEY=a-random-value-of-at-least-32-characters   # Windows (export ... on Mac/Linux)
uvicorn main:app --port 8000
```

On first start, the multilingual embedding model `paraphrase-multilingual-MiniLM-L12-v2` (about 470 MB) is
downloaded once, then cached. It compares CVs and offers in French, English or a mix of both.

The interactive API documentation is at http://localhost:8000/docs.

## Who may call it

Only the backend. Every request must carry the shared key in the `X-Internal-Key` header (`AI_SERVICE_KEY`, the
same for the backend and this service, at least 32 characters; `npm run dev` generates it in `.env`). Without it:
`401 AUTH_REQUIRED`. Open: `GET /health` and the documentation (`/docs`, `/openapi.json`), which hold no data. The
service refuses to start without a key.

The browser never calls this service (no CORS): profile drafts go through the backend
(`POST /api/recruiters/profile/description-draft`, `POST /api/candidates/me/bio-draft`). In Docker the service is
only on the internal network, with no published port. The backend's request id (`X-Request-Id`) becomes this
service's error `correlationId`, so one request can be followed through both services' logs.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | `ok` once the model is loaded (otherwise 503 `loading`), with the scoring algorithm version |
| POST | `/extract` | File (PDF or DOCX) → text. 415 if the format isn't supported, 422 if the file has no text (scanned PDF) |
| POST | `/match` | `{cv_text, offer: {title, description}}` → detailed score |
| POST | `/company/profile` | `{url}` → the company profile fields found on the website (a field the site doesn't state is left out). 422 with `{code, message}` if the site is invalid, private, unreachable or not a web page |
| POST | `/draft/company`, `/draft/bio` | A company description / candidate bio built **only** from the profile fields. If an OpenAI-compatible LLM is configured (`LLM_BASE_URL`, `LLM_MODEL`), it may reword it, under control: a number, a link or praise that isn't in the data brings back the template text. `ai_assisted` is `true` only when the LLM's text is returned. 422 `not_enough_data` if the profile is empty |

## Layout

```
matching/
  taxonomy.py         skills (synonyms, implications), languages, education levels
  parsing.py          extraction: required / nice-to-have skills, years of experience, education, languages
  semantic.py         semantic relevance (sentence-transformers)
  scoring.py          weighted score and breakdown per category
  recommendations.py  advice (rules by default, optional LLM)
  extraction.py       text of PDF and DOCX files
company/
  scraper.py          reads the website (URL validation, private networks refused, size and time limits)
  extract.py          HTML → fields (schema.org, meta tags, links, Mission / Vision / Values sections)
drafts.py             profile drafts and the LLM guardrails
security.py           the shared key (X-Internal-Key) and the request id
errors.py             one error format, the same as the backend's
tests/                pytest, with realistic CVs and offers (English and French)
```

The score is **deterministic**: the same inputs always give the same result, and every point comes from something
in the text. The optional LLM (`LLM_BASE_URL` and `LLM_MODEL`, see the main README) only writes the advice and
never changes the score.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```
