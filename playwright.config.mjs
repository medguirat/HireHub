// End-to-end tests: real browser, real frontend, backend, ai-service and database.
// Run with `npm run test:e2e`. See README "Tests".
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000, // CV matching runs the real model
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1, // the journeys share one database and build on each other
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  globalSetup: "./e2e/support/global-setup.mjs",
  globalTeardown: "./e2e/support/global-teardown.mjs",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      // The recruiter's "company website", imported at signup.
      command: "node e2e/fixtures/serve-company-site.mjs",
      url: "http://127.0.0.1:4599",
      reuseExistingServer: true,
      timeout: 20_000,
    },
    {
      // The whole stack, for tests: the ai-service may import the local fixture site, emails always
      // go to Mailpit (even if .env sends real ones), and the "forgot password" limit per IP address
      // is raised because every test request comes from 127.0.0.1 (RateLimitIT tests the limits).
      command: "node scripts/dev.mjs",
      url: "http://localhost:5173",
      env: { COMPANY_SCRAPER_ALLOW_PRIVATE: "1", MAIL_MODE: "mailpit", RATE_LIMIT_PASSWORD_RESET_PER_IP: "1000" },
      reuseExistingServer: true,
      timeout: 600_000,
      stdout: "ignore",
    },
  ],
});
