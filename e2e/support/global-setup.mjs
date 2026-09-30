// Before any E2E test: waits until the whole stack is ready, and checks it was
// started for E2E (so the recruiter's fixture website can be imported).
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
    const ai = await json("http://localhost:8000/health");
    if (ai?.body && ai.body.company_import_allows_local_sites === false) {
      throw new Error(
        "The stack is running without the E2E setting COMPANY_SCRAPER_ALLOW_PRIVATE=1, so the recruiter's " +
        "fixture website (on 127.0.0.1) can't be imported. Run `npm run stop`, then `npm run test:e2e`."
      );
    }
    const backend = await json("http://localhost:8081/api/health");
    if (ai?.body?.status === "ok" && backend?.status === 200) return;
    if (Date.now() > deadline) {
      throw new Error("The stack didn't become ready within 10 minutes (ai-service on :8000, backend on :8081).");
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
