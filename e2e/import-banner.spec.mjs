// The "building your company profile" banner and its polling, with a slow import
// simulated in the browser: the profile API answers "in progress" for a few seconds,
// then "completed" with imported fields.
import { expect, test } from "@playwright/test";
import { logIn, registerByApi } from "./support/helpers.mjs";

test("a slow import shows the progress banner, then fills the empty fields when it finishes", async ({ page }) => {
  await registerByApi("banner-recruiter", "RECRUITER", { companyName: "QA Slow Import" });

  // The import "takes" 5 s from the moment the profile page first asks for the profile.
  let startedAt = null;
  const SLOW_MS = 5000;
  await page.route("**/api/recruiters/profile", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    startedAt ??= Date.now();
    const response = await route.fetch();
    const body = await response.json();
    const done = Date.now() - startedAt > SLOW_MS;
    Object.assign(body, done ? {
      companyImportStatus: "COMPLETED",
      companyImportMessage: "We filled 2 fields from your website. Please review them and correct anything that's off.",
      autoFilledFields: ["mission", "headquarters"],
      mission: "Make importing slow websites testable.",
      headquarters: "Monastir, Tunisia",
    } : {
      companyImportStatus: "IN_PROGRESS",
      companyImportMessage: null,
    });
    await route.fulfill({ response, json: body });
  });

  await logIn(page, "banner-recruiter");
  await page.goto("/recruiter-dashboard/profile");

  const inProgress = page.getByText("We're building your company profile from your website…");
  await expect(inProgress).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page.locator("#company-mission")).toHaveValue("");

  // The page polls every 3 s; once the import is done, the banner and the empty fields update.
  await expect(page.getByText("We filled 2 fields from your website.")).toBeVisible({ timeout: 20_000 });
  await expect(inProgress).toBeHidden();
  await expect(page.locator("#company-mission")).toHaveValue("Make importing slow websites testable.");
  await expect(page.locator("#company-headquarters")).toHaveValue("Monastir, Tunisia");
  await expect(page.locator("label", { hasText: "Mission" }).locator(".autofill-tag")).toHaveText("From your website");
});
