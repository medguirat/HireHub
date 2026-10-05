import { AI_SERVICE, API, MAILPIT, TARGET } from "./config.mjs";

// Before any E2E test: waits until the whole stack is ready, and checks it was
// started for E2E (the recruiter's fixture website can be imported, emails go to Mailpit).
const TIMEOUT_MS = 600_000;

async function json(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return { status: response.status, body: await response.json() };
  } catch {
    return null;
  }
}

export default async function globalSetup() {
  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    // With npm run dev the ai-service is reachable here; in Docker only the backend sees it.
    const ai = AI_SERVICE ? await json(`${AI_SERVICE}/health`) : null;
    if (ai?.body && ai.body.company_import_allows_local_sites === false) {
      throw new Error(
        "The stack is running without the E2E setting COMPANY_SCRAPER_ALLOW_PRIVATE=1, so the recruiter's " +
        "fixture website (on 127.0.0.1) can't be imported. Run `npm run stop`, then `npm run test:e2e`."
      );
    }
    const backend = await json(`${API}/health`);
    if (backend?.body?.mail && backend.body.mail !== "mailpit") {
      throw new Error(
        "The backend is sending real emails (MAIL_MODE=smtp); the E2E tests read Mailpit and would email made-up " +
        "addresses. Run `npm run stop`, then `npm run test:e2e` (it starts the stack with MAIL_MODE=mailpit)."
      );
    }
    const mailpit = await fetch(`${MAILPIT}/livez`, { signal: AbortSignal.timeout(3000) }).then((r) => r.ok, () => false);
    const aiReady = AI_SERVICE ? ai?.body?.status === "ok" : backend?.body?.aiService?.status === "UP";
    if (aiReady && backend?.status === 200 && mailpit) return;
    if (Date.now() > deadline) {
      throw new Error(`The ${TARGET} stack didn't become ready within 10 minutes (ai-service, backend at ${API}, Mailpit at ${MAILPIT}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
