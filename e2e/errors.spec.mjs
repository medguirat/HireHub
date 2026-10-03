// Error paths: applying twice, an invalid CV file, an expired session,
// and the matching service being down (never a made-up score).
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { API, FIXTURES, dateIn, logIn, registerByApi, tokenFor } from "./support/helpers.mjs";

const TITLE = `QA E2E Errors offer ${Date.now().toString(36)}`;
let offerId;
let applicationId;

/** Uploads the fixture CV as a private application document -> its id. */
async function uploadCv(token) {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(path.join(FIXTURES, "cv-java.pdf"))], { type: "application/pdf" }), "cv-java.pdf");
  const response = await fetch(`${API}/candidates/documents`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  expect(response.status).toBe(200);
  return (await response.json()).id;
}

test.beforeAll(async () => {
  await registerByApi("err-recruiter", "RECRUITER", { companyName: "QA Errors Inc" });
  await registerByApi("err-candidate", "CANDIDATE");
  const token = await tokenFor("err-recruiter");
  const response = await fetch(`${API}/recruiters/offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: TITLE, description: "Java, Spring Boot, MySQL.", location: "Tunis",
      contractType: "CDI", deadline: dateIn(20) }),
  });
  offerId = (await response.json()).id;
});

test("applying twice is refused, and the offer shows it's already applied", async ({ page }) => {
  const token = await tokenFor("err-candidate");
  const cvFileId = await uploadCv(token);
  const apply = () => fetch(`${API}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ cvFileId, jobOfferId: offerId }),
  });
  const first = await apply();
  expect(first.status).toBe(200);
  applicationId = (await first.json()).id;
  const second = await apply();
  expect(second.status).toBe(400);
  const body = await second.json();
  expect(body).toMatchObject({ code: "BAD_REQUEST", message: "You have already applied for this job offer." });
  expect(body.correlationId).toBeTruthy();

  await logIn(page, "err-candidate");
  await page.goto("/candidate-dashboard/offers");
  await page.locator(".offer-card", { hasText: TITLE }).click();
  await expect(page.locator(".details-actions .state-badge")).toHaveText("Already applied");
  await expect(page.locator(".details-actions").getByRole("button", { name: "Apply Now" })).toHaveCount(0);
});

test("an application's CV is private: other users get 403, and nobody gets it without logging in", async () => {
  const url = `${API}/applications/${applicationId}/cv`;
  const as = async (who) => (await fetch(url, { headers: { Authorization: `Bearer ${await tokenFor(who)}` } })).status;

  expect(await as("err-candidate")).toBe(200); // the candidate who applied
  expect(await as("err-recruiter")).toBe(200); // the recruiter who owns the offer
  await registerByApi("err-other-recruiter", "RECRUITER", { companyName: "QA Other Inc" });
  await registerByApi("err-other-candidate", "CANDIDATE");
  expect(await as("err-other-recruiter")).toBe(403);
  expect(await as("err-other-candidate")).toBe(403);
  expect((await fetch(url)).status).toBe(401);

  // The public uploads folder doesn't serve documents.
  expect((await fetch(`${API.replace(/\/api$/, "")}/uploads/anything.pdf`)).status).toBe(404);
});

test("an invalid CV file is refused with a clear message", async ({ page }) => {
  await logIn(page, "err-candidate");
  await page.goto("/candidate-dashboard/profile");
  await page.locator("#profile-cv-input").setInputFiles(path.join(FIXTURES, "not-a-cv.txt"));
  await expect(page.getByRole("alert")).toHaveText("Please choose a .pdf or .docx file.");

  // The API refuses it as well, whatever the browser sends.
  const token = await tokenFor("err-candidate");
  const form = new FormData();
  form.append("file", new Blob(["not a cv"], { type: "text/plain" }), "notes.txt");
  const response = await fetch(`${API}/candidates/me/cv`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: form });
  expect(response.status).toBe(415);
  expect(await response.json()).toMatchObject({ code: "CV_UNSUPPORTED_FORMAT", message: "Please upload your CV as a PDF or DOCX file." });
});

test("an expired session sends the user back to the login page with an explanation", async ({ page }) => {
  await logIn(page, "err-candidate");
  // Let the overview finish loading first: a request still waiting to be sent would pick up the
  // bad token and redirect before the test acts.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => localStorage.setItem("token", "expired.or.tampered.token"));
  // Move inside the app: its request gets a 401 and the app sends the browser to the login page.
  // (A page.goto here would race that redirect, and the browser connection could be lost.)
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My applications" }).click();
  await page.waitForURL(/\/login$/);
  await expect(page.locator(".session-notice")).toHaveText("Your session has expired. Please log in again.");
});

test("when matching is unavailable, no score is shown and a retry works", async ({ page }) => {
  await logIn(page, "err-candidate");
  await page.goto("/candidate-dashboard/profile");
  await page.locator("#profile-cv-input").setInputFiles(path.join(FIXTURES, "cv-java.pdf"));
  await expect(page.locator(".toast", { hasText: "Your CV is updated" })).toBeVisible({ timeout: 60_000 });

  // The matching endpoint answers 503 once (as when the ai-service is down), then works again.
  let failures = 1;
  await page.route("**/api/candidates/offers/*/match", async (route) => {
    if (failures-- > 0) {
      await route.fulfill({ status: 503, contentType: "application/json",
        body: JSON.stringify({ code: "MATCHING_UNAVAILABLE", correlationId: "e2e-simulated",
          message: "The matching service is temporarily unavailable. Please try again in a moment." }) });
    } else {
      await route.continue();
    }
  });

  await page.goto("/candidate-dashboard/offers");
  await page.locator(".offer-card", { hasText: TITLE }).click();
  await page.getByRole("button", { name: "Check my CV match" }).click();
  const dialog = page.getByRole("dialog", { name: "CV match" });
  await expect(dialog.getByText("No score available right now")).toBeVisible();
  await expect(dialog.locator(".match-ring__number")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.locator(".match-ring__number")).toBeVisible({ timeout: 90_000 });
});
