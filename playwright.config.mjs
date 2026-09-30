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
      // The whole stack. The flag lets the ai-service import the local fixture site;
      // it is for tests only and never set by `npm run dev`.
      command: "node scripts/dev.mjs",
      url: "http://localhost:5173",
      env: { COMPANY_SCRAPER_ALLOW_PRIVATE: "1" },
      reuseExistingServer: true,
      timeout: 600_000,
      stdout: "ignore",
    },
  ],
});
