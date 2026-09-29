# HireHub — Phase 0 Audit

Scope: current on-disk state, which is commit `43e80d9` ("Restructure HireHub and add AI features"), the last committed snapshot. Verified by reading the codebase, running backend (Spring Boot, port 8081) + frontend (Vite, port 5173/5174) + ai-service (FastAPI, port 8000) locally, and live API reproduction (curl) of the apply/CV-matching flow.

---

## 1. Broken features, with root cause

### 1.1 CRITICAL — "Application Error" when a candidate applies with a real CV (Phase 1 blocker)

**Reproduced and confirmed.** Uploading a CV file larger than ~1MB always fails:

```
POST /api/files/upload  (2 MB PDF, real request via curl)
→ HTTP 500
→ Body: "An unexpected error occurred. Please try again later."
```

**Root cause, in order:**
1. `application.properties` sets no `spring.servlet.multipart.max-file-size` / `max-request-size` → Spring Boot's default limit (1MB) applies. Any real-world CV (scanned, with a photo, exported from Word/Canva/LinkedIn) routinely exceeds this.
2. When the limit is exceeded, Spring throws `MaxUploadSizeExceededException`. `GlobalExceptionHandler.java` (backend/src/main/java/com/hirehub/exception/GlobalExceptionHandler.java:53-57) has **no handler for it**, so it falls into the catch-all:
   ```java
   @ExceptionHandler(Exception.class)
   public ResponseEntity<String> handleGeneric(Exception ex) {
       return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
               .body("An unexpected error occurred. Please try again later.");
   }
   ```
3. **This handler never logs `ex`** — not even `ex.printStackTrace()` or an SLF4J call. The real exception is completely invisible, in the response *and* in the server console. This is a meta-bug in its own right: any future 500 in this app is undiagnosable until this is fixed.
4. The frontend (`CandidateOffers.jsx:241`) does display `err.response?.data?.message || err.response?.data`, which is why the *exact* generic string reaches the user's screen verbatim.

Small CVs (my first test, a 37-byte file) apply successfully end-to-end (confirmed: `POST /api/applications` → 200, application id returned). So the bug is specifically file-size-triggered, not a systemic failure of the apply flow — which is why it will look "random" until someone checks file size.

**Fix implies:** (a) explicitly handle `MaxUploadSizeExceededException` with a clear "Your CV must be under Xmb" message, (b) raise the limit to something CV-appropriate (e.g. 5MB per the mission spec), (c) add actual logging to the generic handler so this class of bug is never invisible again.

### 1.2 AI CV matching / "AI Compliance" score is not reliably real

- The **Python ai-service** (`ai-service/cv_matcher.py`) is genuinely real: it embeds CV text and offer text with `sentence-transformers` (`all-MiniLM-L6-v2`) and returns cosine similarity as a 0–100 score. Verified live:
  - Matching CV/offer (Java/Spring dev vs Java/Spring offer) → **69.0%**
  - Unrelated CV/offer (chef vs Java offer) → **16.7%**
  - Real, differentiated, not fake.
- **But nothing runs or supervises this service.** It's a standalone FastAPI app nobody starts automatically — no process manager, no Docker Compose entry, no health check from the backend. If it isn't running (the default state on a fresh checkout), `frontend/src/services/aiService.js` **silently swallows the failure** (`console.warn` only) and falls back to `fallbackMatch()` — a hand-tuned JS heuristic, not the real thing:
  - `frontend/src/services/aiService.js:195`: `let baseScore = hasTechBackground ? 45 : 30;` — hardcoded base score from a crude keyword sniff (does the CV text contain "engineer"/"developer"/"software"/"computer"/"cv"/"experience"?).
  - `aiService.js:198-200`: `if (matchedSkills.length > 0 && matchedSkills.length >= missingSkills.length) { finalScore = Math.max(72, finalScore); }` — **artificially floors the score at 72** for anyone who matches at least half the required skills, regardless of true fit.
  - `aiService.js:202`: `finalScore = Math.min(96, Math.max(40, finalScore));` — the score is **clamped to a cosmetic 40–96 band no matter what**, so it can never honestly show as very poor or perfect.
  - No literal `Math.random()`, but functionally this is a gamed/fake score, and — critically — **there is zero UI indication of which path produced it.** A recruiter or candidate sees a percentage with no way to know if it came from the real embedding model or this fallback formula (only a browser-console warning nobody will see).
- Response shape mismatch: the real ai-service `/analyze/match` returns `{compatibility_score, missing_skills, roadmap}` only — no `matched_skills`, no `recommendations`. The frontend fallback returns those two extra fields. UI code at `CandidateOffers.jsx:689,713` guards with `&&` so it doesn't crash, but recruiters/candidates silently get a **different, thinner result shape** depending on whether the Python service happened to be up — an inconsistent product experience, not just a code smell.
- `POST /analyze/bio` (both the Python version and the JS fallback) is a **fixed string template**, not an LLM call: same sentence every time, only role/skills interpolated (`ai-service/main.py:104-108`). This is what the frontend calls "AI Pitch" / "AI Profile Assistant" — currently 100% templated, not generative.
- **`CandidateRating.jsx`** (recruiter-side candidate evaluation) computes `finalScore = (avgStars/5)*17 + bonus` out of 20 (line ~71) from manually-entered star ratings — pure arithmetic, not AI, yet it drives labels like "Outstanding Candidate — Highly Recommended" and is **only saved to `localStorage`**, never persisted to the backend (any other device/session loses it).
- **No LLM provider is wired anywhere** in the repo (no OpenAI/Anthropic SDK, no API key referenced in backend, frontend, or ai-service). Phase 2 as specified ("an LLM call... returning structured JSON") requires a decision from you — see §5.

### 1.3 Company scraper is completely disconnected (Phase 4 currently doesn't exist)

- `scraping/scraper.py` is a **standalone, single-company script** (`python scraper.py`, must be run manually from inside `scraping/`), hardcoded to scrape `https://www.proxym-it.com`. It is not a service, has no HTTP API, and is not called by anything.
- Confirmed via full-repo grep: **nothing in `backend/`** references `scraping`, `scraper`, `proxym`, or makes any outbound HTTP/RestTemplate/WebClient call to a scraping service. `AuthService.register()` only creates the user + an empty profile shell + sends a welcome email.
- Even the scraper's own output is partly fake: `scraping/companies/proxym.py` hardcodes `vision = "Become a digital leader"` whenever the word "vision" appears anywhere on the page (line ~185, unrelated to what the page actually says), hardcodes `headquarters = "Sousse, Tunisia"` (line ~246), `foundedYear = 2006`, `companyType = "Software Company"` (lines ~266, 278) — these are never actually extracted from the target site.
- **Phase 4 as specified is a build from near-zero**, not a "wire up existing automation" task: it needs a real backend trigger (async, on recruiter signup with a company URL), a way to run the Python scraper as a callable service (not a manual script), graceful failure handling, and a review/edit UI. None of that scaffolding exists yet.

### 1.4 `ForgotPassword.jsx` is a non-functional mockup

The "Send verification" button has no `onClick` at all — clicking it does nothing. Only "Back to sign in" works. Confirmed by reading the component; not yet UI-tested live but the missing handler is unambiguous in the source.

---

## 2. Duplicate actions / navigation redundancy

Not fully catalogued yet — this needs a page-by-page click-through pass, which I'm holding until you confirm I should proceed into Phase 5. One concrete case found during this audit:
- **Orphaned/dead pages still in the tree** (not reachable from any route, but present and potentially confusing to maintain): `frontend/src/pages/BrowseOffers.jsx`, `MyApplications.jsx`, `RecruiterDashboard.jsx` (superseded by `CandidateOffers.jsx`, `CandidateApplications.jsx`, `RecruiterOverview.jsx` respectively), and `Profile.jsx` (0 bytes, empty file). These aren't "two buttons doing the same thing" but are dead weight worth deleting in Phase 5.
- `frontend/src/components/Navbar.jsx` is a stub that does `return null;` — imported nowhere, dead code.
- `frontend/src/security/JwtUtil.java`-equivalent on the backend: `security/JwtUtil.java` is an empty, unused class.

## 3. Generic / placeholder page titles

Not exhaustively catalogued yet (needs the same click-through pass as §2). Will be part of the Phase 5 deliverable list, with a before/after table as you requested.

## 4. Hardcoded / mocked / fake data — consolidated list

| Location | What's fake | Detail |
|---|---|---|
| `frontend/src/services/aiService.js:183-202` | CV/offer compatibility score (fallback path) | Hardcoded base scores (45/30), arbitrary weights, a hard floor of 72, a hard ceiling of 96 — see §1.2 |
| `frontend/src/services/aiService.js:135-147` + `ai-service/main.py:104-108` | "AI-generated" bio | Fixed sentence template, not an LLM call |
| `frontend/src/pages/CandidateRating.jsx:~71` | Candidate "evaluation score" | Manual star-rating arithmetic, not AI; not persisted to backend |
| `scraping/companies/proxym.py:185,246,266,278` | Scraped company `vision`, `headquarters`, `foundedYear`, `companyType` | Hardcoded literals, not actually parsed from the site |
| `backend/src/main/resources/application.properties:5` | MySQL root password | Committed in plaintext — should be an env var, and rotated since it's now been exposed in the repo history |
| `backend/.../security/JwtService.java` | JWT signing secret | Hardcoded base64 fallback used whenever `jwt.secret` isn't set via env — fine for local dev, unsafe if this default ever reaches a real deployment |

## 5. UI inconsistencies vs. the Recruiter Statistics page — concrete finding

The Statistics page (`frontend/src/pages/RecruiterStats.jsx`, 523 lines) is styled with **122 inline `style={{...}}` blocks** and essentially **no shared CSS classes** (only one incidental `className="loading-container"`, which isn't even defined in any stylesheet). Meanwhile `index.css` defines a whole glassmorphism system explicitly commented `/* Statistics Style Panel - Glassmorphism System */` (`.dashboard-panel`, `.stats-style-panel`, `.card-3d`, `.btn-brand-3d`) — and grep confirms **every other dashboard page uses these shared classes except the Statistics page itself**. In other words: the page meant to be everyone else's design reference is the one page that doesn't use the shared design system at all — it was hand-built separately and the "shared" CSS was reverse-engineered from it afterward (or vice versa) without ever refactoring the Stats page to consume its own tokens.

Phase 7's instruction to "extract Statistics page's colors/typography/spacing into tokens" is achievable (the visual language is recoverable from the inline styles), but the literal Stats *component* will need a full refactor to use those tokens too, same as every other page — it is not currently a template to copy from mechanically.

## 6. Other findings worth flagging now (not requested by name, but load-bearing for later phases)

- **No `@PreAuthorize`/method security anywhere.** Role checks are manual, per-controller, via `CurrentUserProvider.requireRole(...)`, which throws `BadRequestException` → HTTP 400 (not 403) on a role mismatch. Works today, but easy to forget on a new endpoint, and the 400-vs-403 semantics are non-standard.
- **`ProtectedRoute.jsx` is client-side only** (checks `localStorage`) — correctly not a real security boundary, but worth stating explicitly so nobody mistakes it for one.
- **No test infrastructure exists yet** for anything asked in Phase 8: no Vitest/RTL config on the frontend, no Playwright, and the existing backend `src/test` MockMvc tests only cover a subset of controllers (found: Application, Candidate, Recruiter, User — not JobOffer, Notification, or file upload).
- Dead/unused: `spacy` in `ai-service/requirements.txt` (never imported by any of the 5 Python modules), empty `frontend/src/api/`, `src/hooks/`, `src/utils/` directories, empty `scraping/utils/helpers.py`.
- A stray untracked `HireHub/` folder at the repo root turned out to be a self-referential junction/leftover from a previous zip extraction (contains a duplicate, slightly different copy of the repo, e.g. extra `ai-service/llm_client.py`, `Dockerfile`, `.env.example` not present in the real tracked repo). It's harmless (git ignores it) but worth deleting by hand at some point so it doesn't confuse future audits — I did not touch it.

---

## What I did to produce this audit (so it's reproducible)

- Restarted backend (`mvnw spring-boot:run`, clean compile, connected to local MySQL `hirehub_db`), ai-service (`uvicorn main:app --port 8000`), and frontend (`npm run dev`) from the current committed source.
- Registered a real recruiter + candidate via `POST /api/users`, logged in via `POST /api/auth/login`, created a real job offer via `POST /api/recruiters/offers`.
- Reproduced the apply flow twice: once with a 37-byte fake PDF (succeeded, 200, real application id returned) and once with a 2MB PDF (failed, 500, exact reported error text) — isolating file size as the trigger.
- Hit the real ai-service `/analyze/match` endpoint directly with a strong-match pair and an unrelated pair, confirming real, differentiated scores.
- Delegated a structural sweep (routes, entities, services, DTOs, security config, ai-service internals, scraper internals) to a research subagent and cross-checked its key claims (grep for `RestTemplate|WebClient|scraper` in backend, grep for the glassmorphism CSS class usage across pages) myself before including them here.

---

## Decisions needed from you before Phase 2+ (per your own rule: stop and ask, don't fake it)

1. **AI provider for Phase 2.** The repo has no LLM key anywhere. Options: (a) use the existing sentence-transformers embedding approach as the deterministic signal and add a real LLM call on top for the structured breakdown/recommendations (needs an API key from you — OpenAI, Anthropic, or other), (b) skip the LLM call and make the deterministic signals (skill overlap + embedding similarity + experience/education parsing) good enough on their own, no key required. Your spec explicitly asks for an LLM call "via the existing AI integration if present" — there isn't one, so this is a real fork in the road.
2. **Scope/order confirmation.** Given the size of this mission (8 phases, full test suites, a scraper service that needs to be built essentially from scratch, a full design-system refactor), do you want me to proceed phase-by-phase with a check-in after each (as the rules say: "commit after each phase with a clear message"), or attempt a larger batch before the next check-in?
3. **PDF/DOCX text extraction library** for Phase 2 (Apache PDFBox vs Tika) — no strong preference from what's in the repo today; I'll pick PDFBox (lighter dependency) unless you want otherwise.
