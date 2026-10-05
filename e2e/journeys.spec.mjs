// The two main journeys, end to end, as in the mission brief:
//   Recruiter: sign up with the company URL -> profile auto-filled -> publish an offer
//              -> see applications -> view statistics
//   Candidate: sign up -> fill the profile -> upload a CV -> see the new offer at the top
//              -> open it -> real CV match with breakdown -> apply -> "My applications"
import path from "node:path";
import { expect, test } from "@playwright/test";
import { COMPANY_SITE, FIXTURES, dateIn, logIn, signUpInUi, toast } from "./support/helpers.mjs";

test.describe.configure({ mode: "serial" });

const OFFER_TITLE = `QA E2E Java Backend Developer ${Date.now().toString(36)}`;
const CV = path.join(FIXTURES, "cv-java.pdf");

test("recruiter signs up with the company website and the profile is filled from it", async ({ page }) => {
  await signUpInUi(page, {
    who: "recruiter", role: "RECRUITER", firstName: "Rania", lastName: "Recruiter",
    company: "QA Robotics", website: COMPANY_SITE,
  });
  // Signed in right away, on the overview: the import runs in the background and its banner shows
  // there (in progress, or already done for this small site), with a way to the profile.
  await expect(page).toHaveURL(/\/recruiter-dashboard$/);
  await expect(toast(page, "Welcome to HireHub! Your account is ready.")).toBeVisible();
  const review = page.getByRole("link", { name: "Review my company profile" });
  await expect(review).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".import-banner", { hasText: "from your website. Please review" })).toBeVisible();
  await review.click();
  await expect(page).toHaveURL(/\/recruiter-dashboard\/profile$/);
  await expect(page.locator(".import-banner", { hasText: "from your website. Please review" })).toBeVisible();
  await page.reload();

  // Only what the site states; the typed company name is kept.
  await expect(page.locator(".profile-hero__name")).toHaveText("QA Robotics");
  await expect(page.locator(".profile-hero__tagline")).toContainText("Sfax, Tunisia");
  await expect(page.getByText("Help logistics teams ship orders faster with reliable automation.")).toBeVisible();
  await expect(page.locator(".detail-list", { hasText: "Founded" })).toContainText("2015");
  await expect(page.locator("#tech-title").locator("..").locator("..")).toContainText("Java");
  await expect(page.locator(".detail-list")).not.toContainText("Industry"); // not on the site: left empty

  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page.locator("label", { hasText: "Mission" }).locator(".autofill-tag")).toHaveText("From your website");
});

test("recruiter publishes an offer", async ({ page }) => {
  await logIn(page, "recruiter");
  await page.goto("/recruiter-dashboard/create-offer");
  await page.getByPlaceholder("e.g. Senior Fullstack Developer").fill(OFFER_TITLE);
  await page.getByPlaceholder(/The role, the tasks/).fill(
    "We are hiring a Java backend developer.\nRequired: Java, Spring Boot, MySQL, Docker.\n3+ years of experience.");
  await page.getByPlaceholder("e.g. Tunis, Tunisia (or Remote)").fill("Tunis");
  await page.locator('input[type="date"]').fill(dateIn(30));
  await page.getByRole("button", { name: "Publish offer" }).click();

  await expect(toast(page, "is published")).toBeVisible();
  await expect(page.locator(".offer-card", { hasText: OFFER_TITLE })).toBeVisible();
});

test("candidate signs up, fills the profile and uploads a CV", async ({ page }) => {
  await signUpInUi(page, { who: "candidate", role: "CANDIDATE", firstName: "Cyrine", lastName: "Candidate" });
  // Signed in right away, on the overview; the session survives a reload.
  await expect(page).toHaveURL(/\/candidate-dashboard$/);
  await expect(toast(page, "Welcome to HireHub! Your account is ready.")).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/candidate-dashboard$/);
  await expect(toast(page, "Welcome to HireHub!")).toHaveCount(0); // greeted once only
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My profile" }).click();

  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.fill("#profile-headline", "Java backend developer");
  for (const skill of ["Java", "Spring Boot", "MySQL"]) {
    await page.fill("#profile-skill-input", skill);
    await page.keyboard.press("Enter");
  }
  await page.getByRole("button", { name: "+ Add language" }).click();
  await page.fill("#lang-name-0", "English");
  await page.selectOption("#lang-level-0", "FLUENT");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(toast(page, "Your profile is saved.")).toBeVisible();
  await expect(page.locator(".profile-hero__tagline")).toHaveText("Java backend developer");
  await expect(page.locator("#languages-title").locator("..").locator("..")).toContainText("Fluent (C1–C2)");

  await page.locator("#profile-cv-input").setInputFiles(CV);
  await expect(toast(page, "Your CV is updated")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("canvas.pdf-preview__page").first()).toBeVisible();
});

test("candidate finds the new offer first, gets a real CV match and applies", async ({ page }) => {
  await logIn(page, "candidate");
  await page.goto("/candidate-dashboard/offers");

  const first = page.locator(".offer-card").first();
  await expect(first.locator("h3")).toContainText(OFFER_TITLE);
  await expect(first.locator(".status-chip--new")).toBeVisible();
  await first.click();

  await page.getByRole("button", { name: "Check my CV match" }).click();
  const dialog = page.getByRole("dialog", { name: "CV match" });
  await expect(dialog.locator(".match-summary")).toBeVisible({ timeout: 90_000 });
  const score = Number(await dialog.locator(".match-ring__number").textContent());
  expect(score).toBeGreaterThanOrEqual(60); // a Java/Spring/MySQL/Docker CV against a Java/Spring/MySQL/Docker offer
  for (const category of ["Skills", "Experience", "Relevance to the role"]) {
    await expect(dialog.locator(".match-category", { hasText: category }).first()).toBeVisible();
  }

  await dialog.getByRole("button", { name: "Apply to this offer" }).click();
  await page.locator('.modal-content input[type="file"]').first().setInputFiles(CV);
  await page.getByPlaceholder(/Introduce yourself/).fill("I build Spring Boot services every day.");
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(toast(page, "was sent")).toBeVisible();

  await page.goto("/candidate-dashboard/applications");
  const row = page.locator("tr", { hasText: OFFER_TITLE });
  await expect(row).toBeVisible();
  await expect(row.locator(".status-badge")).toHaveText("Pending");

  // The CV they sent opens from the application details, fetched with their login.
  await row.click();
  await page.getByRole("button", { name: "Open the CV you sent (PDF)" }).click();
  const viewer = page.getByRole("dialog", { name: "The CV you sent" });
  await expect(viewer.locator("canvas.pdf-preview__page").first()).toBeVisible();
  await expect(viewer.getByRole("link", { name: "Download" })).toHaveAttribute("href", /^blob:/);
});

test("recruiter sees the application, invites the candidate, and sees it in the statistics", async ({ page }) => {
  await logIn(page, "recruiter");
  await page.goto("/recruiter-dashboard/applications");
  const row = page.locator("tbody tr", { hasText: OFFER_TITLE });
  await expect(row).toContainText("Cyrine Candidate");

  // The candidate's CV: previewed in the page and downloadable, without the token ever in a URL
  // (the request is signed in by the HttpOnly session cookie).
  const fileRequests = [];
  page.on("request", (r) => { if (r.url().includes("/cv")) fileRequests.push(r); });
  await row.getByRole("button", { name: "Open CV" }).click();
  const viewer = page.getByRole("dialog", { name: "CV of Cyrine Candidate" });
  await expect(viewer.locator("canvas.pdf-preview__page").first()).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    viewer.getByRole("link", { name: "Download" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("cv-java.pdf");
  expect(fileRequests.length).toBeGreaterThan(0);
  for (const request of fileRequests) {
    expect(request.url()).not.toMatch(/token|Bearer/i);
    expect((await request.allHeaders()).cookie).toContain("hirehub_session=");
  }
  await viewer.locator(".modal-footer").getByRole("button", { name: "Close" }).click();

  await row.getByRole("button", { name: "Accept…" }).click();
  await expect(page.getByRole("dialog", { name: "Schedule Interview & Send Invite" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm & Send Invitation" }).click();
  await expect(toast(page, "Candidate accepted")).toBeVisible();

  await page.goto("/recruiter-dashboard/stats");
  await expect(page.getByTestId("period-summary")).toHaveText("Last 6 months: 1 offer published, 1 application received.");
  const perOffer = page.locator("section", { has: page.getByRole("heading", { name: "Applications per offer" }) });
  await expect(perOffer).toContainText(OFFER_TITLE);
  await expect(perOffer).toContainText("1 application");
});

test("candidate sees the interview invitation and the accepted application", async ({ page }) => {
  await logIn(page, "candidate");
  await expect(page.getByRole("heading", { name: "Unread messages" })).toBeVisible();
  await expect(page.locator(".notice").first()).toContainText(OFFER_TITLE);

  await page.goto("/candidate-dashboard/applications");
  await expect(page.locator("tr", { hasText: OFFER_TITLE }).locator(".status-badge")).toHaveText("Accepted");
});
