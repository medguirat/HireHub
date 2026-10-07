# HireHub — Final report (Phases 0–8)

Branch `marwa`, not pushed. One commit per phase:

| Phase | Commit | Summary |
|---|---|---|
| 0 | `a0ce4f6` | Audit of broken features, fake scoring and design drift ([AUDIT.md](AUDIT.md)) |
| 1 | `0baa792` | CV uploads and expired sessions fail with clear messages |
| 2 | `40b2862` | Real, explainable CV matching; the fake fallback score is removed |
| 3 | `d79da92` | French and mixed French/English CVs and offers |
| 3b | `823d0d6` | Newest-first job feed; offers with applications are closed, not deleted |
| 4 | `7ce53f5` | Company profile imported from the recruiter's website at signup |
| 5 | `3cedf0c` | UX cleanup: one action per intent, real page titles, clear feedback |
| 6 | `139797d`, `22a1e96` | Professional profile pages, honest drafts, PDF preview on every browser |
| 7 | `89ef120` | Design system taken from the Statistics page, applied everywhere |
| Review fixes | `6eec313` | Sidebar height, Statistics, Languages, labels, wording, dates |
| 8 | `8a69a1e`, `4e7bb1f` | Tests on every layer, ESLint, launcher cleanup, README |

Everything used is free and open source: Spring Boot, MySQL, React, Vite, FastAPI, sentence-transformers,
pypdf, python-docx, pdf.js, Vitest, Testing Library, Playwright, ESLint, and optionally Ollama.

---

## 1. What was broken, and the root cause of each fix

| Problem users saw | Root cause | Fix |
|---|---|---|
| "Application Error" when applying with a real CV | Spring's default 1 MB upload limit. The `MaxUploadSizeExceededException` fell into a catch-all that returned a generic 500 **and logged nothing**. | Limit raised to 10 MB. Clear 413 message. Size and type are checked in the browser first. The catch-all now logs every exception with a correlation id. (`0baa792`) |
| Expired sessions left the user on broken pages | Requests without a valid token got **403** instead of 401, so the frontend's redirect-to-login never ran. | 401 with a JSON body. The frontend redirects once, and the login page explains "Your session has expired". (`0baa792`; the single-redirect guard was added in Phase 8 after the E2E test showed a race) |
| Backend tests passed without really running | The `*IT` classes were never picked up by `mvn test`, and when run by hand they wrote to the dev database. | They run by default against their own `hirehub_test` database. In Phase 8 the Spring context test was also moved off the dev DB. |
| The "AI compliance" score was fake | The Python service was never started. The browser silently fell back to a heuristic with a **72 floor and a 40–96 clamp**. PDFs were "read" by treating their bytes as ASCII. | Real text extraction and a deterministic, explainable score (section 3). The backend answers 503 when the service is down, and the UI then offers a retry and never shows a number. `npm run dev` starts and supervises all three services. (`40b2862`) |
| French CVs scored poorly | An English-only embedding model and English-only parsing rules. | Multilingual model. The parser understands French dates, durations, degrees, language levels and section names. (`d79da92`) |
| New offers were hard to find, and deleting an offer erased candidates' applications | No status or publication date on offers, and a hard delete. | OPEN/CLOSED status, newest-first feed with a "New" badge. An offer with applications is closed, not deleted. (`823d0d6`) |
| The company scraper did nothing | A standalone Proxym-only script that nothing called, with hard-coded "vision", headquarters and founded year. | An ai-service endpoint called in the background after signup. It extracts only what the site states, has SSRF protection, fills only empty fields, marks them "From your website", and has a retry. (`7ce53f5`) |
| The list "Accept" button always failed | Accepting requires an interview date, and the list button didn't send one. | It opens the scheduling dialog. (`3cedf0c`) |
| "Recent applications" showed the oldest ones | Sorted oldest first. | Newest first. (`3cedf0c`) |
| Search results sometimes jumped back to older results | A slower earlier response overwrote newer results. | Only the latest request updates the list; covered by a Vitest test. (`3cedf0c`, `8a69a1e`) |
| The Internship filter never matched | The frontend sent `INTERNSHIP`; the enum value is `STAGE`. | Fixed. (`3cedf0c`) |
| Lists stopped at 50/100/200 items | Hard-coded page sizes used as totals. | Real pagination and counts. (`3cedf0c`) |
| The recruiter's candidate evaluation was lost | Saved only in `localStorage`. | Persisted server-side. (`40b2862`) |
| The Statistics chart was invented | Hard-coded curves. | Real application dates. The 3M/6M/1Y period now applies to every figure. (`40b2862`, `6eec313`) |
| "Verified Top Employer", "All-Star Profile" and invented bio text | Labels and templates that verified nothing. | A completeness indicator instead. Drafts are built only from real profile data; the "AI-assisted" label appears only when an LLM actually reworded the text. (`139797d`) |
| The CV preview was blank on Android Chrome | An `<iframe>` depends on a built-in PDF viewer. | pdf.js renders the pages. (`22a1e96`) |
| Wrong role or someone else's data returned 400 | `requireRole` and the ownership checks threw `BadRequestException`. | **403** everywhere, with URL-level role rules so the role check runs before body validation. (`8a69a1e`) |
| **Any logged-in user could list every user** (`GET /api/users`, `/api/users/{id}`) | Endpoints with no ownership check, unused by the frontend. | Removed; they now answer 405. Unknown routes return 404 instead of 500. (`8a69a1e`) |
| A malformed body or unknown enum value returned 500 | No handler for `HttpMessageNotReadableException`. | 400 naming the field and the allowed values. (`6eec313`) |
| Launcher: stopping `npm run dev` left Java, Python and Vite running | Only the shell wrappers were killed on Windows. | Every process tree is recorded, a detached watchdog cleans up if the launcher dies, and `npm run stop` does it on demand. Each PID's command line is checked before it is killed. (`8a69a1e`) |

## 2. Removed duplicate buttons and rewritten page titles

**Duplicates removed (Phase 5, `3cedf0c`)**

- The "+ Create a New Job Offer" button in the recruiter header on every page. The Job offers page and the sidebar already offer it.
- The "Search Job Offers" button in the candidate header, which duplicated the sidebar.
- The "Check my CV match" button on every card of the candidate offer list. It is kept once, in the offer details.
- The overview's "Conformité IA & Détails" button, which only jumped to the offers page. It now opens the CV match directly.
- In the recruiter offer list, the title link, the "Voir les candidatures" button and a separate count line did the same thing. They are now one "View applications (N)" button.
- Two copies of the apply dialog are now one shared `ApplyModal`. The overview copy had no file checks; it now has them.
- Two copies of the offer form are now one shared `OfferForm`.
- The Statistics contract breakdown, which appeared twice. The second copy became "Applications per offer". (`6eec313`)
- The name chip in the header of both profile pages, which repeated the name shown in the page itself. (`6eec313`)
- Dead pages and stubs: BrowseOffers, MyApplications, RecruiterDashboard, the empty Profile.jsx, the Navbar stub and the empty JwtUtil.

**Page titles.** Every dashboard page used to show "Welcome !" or "Welcome back, X!". Each page now has its own title and a one-line purpose, and the sidebar labels come from the same list (`frontend/src/layouts/pageTitles.js`), so they always match.

| Page | Before (header / sidebar) | After (title — purpose) |
|---|---|---|
| Recruiter overview | Welcome back, X! / Overview | **Overview** — Your offers and the latest applications at a glance. |
| Recruiter offers | Welcome back, X! / My Job Offers | **Job offers** — Publish, edit and close your offers. |
| Offer applicants | Welcome back, X! | **Applicants** — Everyone who applied to this offer. |
| Create offer | Welcome back, X! | **New job offer** — It goes live for candidates as soon as you publish it. |
| Edit offer | Welcome back, X! | **Edit job offer** — Changes are visible to candidates right away. |
| Recruiter applications | Welcome back, X! / Applications | **Applications** — Every application to your offers. |
| Evaluation | Welcome back, X! | **Candidate evaluation** — Rate the candidate, decide, and schedule an interview. |
| Statistics | Welcome back, X! / Statistics | **Statistics** — Applications, offers and outcomes over time. Section headings: "Heatmap" became "Applications per month"; "Placement velocity" was removed. |
| Company profile | Welcome back, X! / Profile | **Company profile** — What candidates see about your company. |
| Candidate overview | Welcome ! / Overview | **Overview** — Your applications and the newest offers. |
| Candidate offers | Welcome ! / Browse Offers | **Job offers** — Search open offers and check how well your CV matches. |
| Candidate applications | Welcome ! / My Applications | **My applications** — Track where each application stands. |
| Candidate profile | Welcome ! / Profile | **My profile** — Your details, skills and experience. |

In-page headings that only repeated the header now carry information instead, such as counts and sort order.

## 3. How CV matching works

**Pipeline** (ai-service, `matching/`, algorithm version `2026.09-3`):

1. **Text extraction.** pypdf reads PDFs and python-docx reads DOCX. A scanned PDF with no text is reported as such, never scored.
2. **Parsing, in English and French.**
   - Skills come from a taxonomy with synonyms and implied skills (Spring Boot implies Java). A neighbouring skill, such as MySQL for PostgreSQL, earns half credit.
   - The offer's skills are split into required and nice-to-have. A nice-to-have skill counts half.
   - Years of experience are read from date ranges ("janv. 2021 – présent", "Depuis mars 2022"), and the relevant years are counted separately.
   - The degree level is detected (Licence, Master, Bac+5, Ingénieur, …).
   - Language levels are detected (courant, natif, fluent, B2, …).
3. **Scores per category.** Each category is scored from 0 to 100 with weights: skills 45 %, experience 20 %, education 10 %, languages 10 %, semantic relevance 15 %. Relevance is the cosine similarity with `paraphrase-multilingual-MiniLM-L12-v2`, calibrated on English and French fixtures.
4. **Missing requirements are left out.** A category the offer doesn't mention is excluded and the other weights are rescaled. A CV is never penalised, or rewarded, for something the offer doesn't ask for.
5. **Recommendations.** Two to four are generated from the gaps found, by rules. An optional local LLM (Ollama) may reword them, but it **never touches the score**.
6. **Caching and failures.**
   - The backend caches each result per CV version, offer text and algorithm version.
   - If the service is down, the API answers 503 and the UI shows "No score available right now" with a retry. There is never a made-up number.

**Example output.** This is the E2E fixture CV (a Java developer) against the offer "Java Backend Developer — Required: Java, Spring Boot, MySQL, Docker. 3+ years of experience." It was produced by running the real pipeline today:

```
Overall: 96 / 100
  Skills        100  (weight 56 %)  4 of 4 required skills
                     matched: Docker, Java, MySQL, Spring Boot
                     other CV skills: Git, Hibernate / JPA, JUnit, Kubernetes, REST APIs
  Experience    100  (weight 25 %)  Requires 3+ years; the CV shows about 6 years.
  Relevance      81  (weight 19 %)  semantic similarity of CV and offer
  Education      —   not applicable: the offer doesn't specify an education level
  Languages      —   not applicable: the offer doesn't mention language requirements
Recommendations (source: rules):
  - Quantify your results with Java and Docker (e.g. performance gains, users served, delivery time) -
    it turns a skills list into evidence.
  - Put the experience most relevant to "Java Backend Developer" at the top of your CV so it is the
    first thing a recruiter reads.
```

**Calibration checks** (from the test fixtures):

| CV | Offer | Score |
|---|---|---|
| Strong English CV | Matching English offer | 97 |
| Partial English CV | Same offer | 49 |
| Weak English CV | Same offer | 18 |
| French CV | English offer | 89 |
| English CV | French offer | 97 |
| French CV | French offer | 93 |
| Unrelated CV (chef, marketing) | Java offer | 16 / 21 |

Demo check: the candidate Amine against "Développeur Java" scores 97, with the full breakdown shown in the CV match dialog.

## 4. Test coverage and how to run it

| Suite | Tests | What it covers |
|---|---|---|
| ai-service (pytest) | **117** | Text extraction, English and French parsing, scoring, calibration, wording, recommendations, company import (incl. SSRF), drafts, API |
| backend (JUnit 5 + MockMvc) | **234** in 26 classes | Every endpoint: 401 without a token, 403 for the wrong role or someone else's data (65 cases in `EndpointAccessIT`), validation errors, happy paths; services; matching and company import with the ai-service mocked |
| frontend lint (ESLint) | 0 problems | JavaScript, React Hooks (incl. the React 19 rules), react-refresh |
| frontend unit (Vitest + React Testing Library) | **37** | Statistics periods (3M/6M/1Y change the data), CV match dialog (score, breakdown, 503 + retry), forms and validation, search race and filters, dialogs, utilities |
| frontend build | passes | The production build compiles |
| E2E (Playwright, Chromium) | **11** | The full recruiter journey, the full candidate journey, applying twice, an invalid CV, an expired session, matching unavailable then a retry, the slow-import banner |

The last full runs before the commit were all green, including a cold E2E run with 11 of 11 passing in 3.0 minutes.

**Commands**, from the repository root:

```bash
npm install          # once: root tools (Playwright, launcher)
npm run dev          # start MySQL-backed backend, ai-service and frontend together
npm run stop         # stop everything the launcher started
npm run seed         # demo data (idempotent)

npm test             # ai-service + backend + lint + frontend unit + build
npm run test:e2e     # Playwright; starts the stack itself (stop npm run dev first)
npm run e2e:cleanup  # delete qa-e2e-* test accounts by hand (normally automatic)
```

Each suite can also run alone:
- `cd ai-service && python -m pytest`
- `cd backend && ./mvnw test`
- `cd frontend && npm run lint && npm test && npm run build`

**Where the tests write data.** Backend tests use their own `hirehub_test` database. The E2E tests use the dev database, but only with accounts named `qa-e2e-…`, and they delete them at the end of the run. Right now no `qa-` data is left in `hirehub_db`.

## 5. Remaining items and decisions needed from you

**Security, needs a decision**

1. **`/uploads/**` is publicly readable.** Application CVs and profile photos can be read without logging in by anyone who has the file name. The names are random, so they can't be guessed, but a leaked link works forever.
   - Suggested fix: serve application CVs through an owner- or recruiter-only endpoint, the same way the profile CV already works, and keep only photos public.
   - Should I do it?
2. **The database password is in `application.properties`** and in the git history, and the JWT secret has a hard-coded default.
   - Both should come from environment variables.
   - The password should be rotated, since it is in the history.
   - I haven't changed either, because it changes how you start the app.
3. **Forgot password is still a non-functional mockup.** It needs an email setup: which SMTP server, and whether to use a free tier.

**Behavior changes to be aware of**

4. **403 instead of 400** for the wrong role or someone else's data. The frontend handles both, but anything outside the frontend that checked for 400 would see a different status.
5. **`GET /api/users` and `GET /api/users/{id}` were removed** because they exposed every user's data. Tell me if something outside this repo used them.

**Housekeeping**

6. **Don't run the old `Proxym\hirehub-backend` project against `hirehub_db`.** During this phase it shrank `recruiter_profiles.description` back to 255 characters. I restored the column to TEXT and no data was lost.
7. The stray untracked `HireHub/` folder at the repository root is still there, untouched and never committed. Delete it by hand when convenient.
8. The accounts `audit.*` (ids 8 and 9), created during the Phase 0 audit before the `qa-` rule existed, are still in `hirehub_db`. Tell me if I should delete them.
9. `backend/target/surefire-reports` holds 15 old reports from 27 September for test classes that no longer exist. `./mvnw clean` removes them; they have no effect on anything.

**Known limits**

10. The optional Ollama rewording is tested with a simulated model only. No real LLM was run in this environment. The safeguards are tested: the score is never changed, and a rewrite that adds numbers, links or praise is rejected.
11. The API error format is mixed: validation errors from `BadRequestException` return a plain string, and all others return `{ "message": … }`. The frontend handles both. Unifying them is a small change, but it touches every error test, so I left it for your call.
12. Nothing is pushed.
