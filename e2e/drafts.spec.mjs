// "Draft my bio" goes through the backend: the browser never calls the ai-service, which only
// answers the backend (shared key).
import { expect, test } from "@playwright/test";
import { logIn, registerByApi } from "./support/helpers.mjs";

test("a candidate drafts a bio through the backend, never calling the ai-service directly", async ({ page }) => {
  await registerByApi("draft-candidate", "CANDIDATE");
  const aiCalls = [];
  page.on("request", (r) => { if (r.url().includes(":8000")) aiCalls.push(r.url()); });

  await logIn(page, "draft-candidate");
  await page.goto("/candidate-dashboard/profile");
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.fill("#profile-headline", "Java backend developer");

  const [draft] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/candidates/me/bio-draft")),
    page.getByRole("button", { name: "Draft my bio" }).click(),
  ]);
  expect(draft.status()).toBe(200);
  await expect(page.locator("#profile-bio")).toHaveValue(/Java backend developer/i);
  expect(aiCalls).toEqual([]);

  // Called from outside without the shared key, the ai-service refuses.
  const direct = await fetch("http://localhost:8000/draft/bio", { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ headline: "Dev" }) });
  expect(direct.status).toBe(401);
});
