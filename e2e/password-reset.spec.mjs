// "Forgot password" through the real app and the real email, read from Mailpit's API:
// ask for a link, get the email, choose a new password, old sessions and the link stop working.
import { expect, test } from "@playwright/test";
import { API, PASSWORD, countEmails, email, registerByApi, tokenFor, waitForEmail } from "./support/helpers.mjs";

const NEW_PASSWORD = "A-new-password-2026";
const GENERIC = "If an account exists for this email, we've sent a link to reset the password. It works once and expires in 45 minutes.";

test("a user resets a forgotten password with the emailed link", async ({ page }) => {
  await registerByApi("reset-user", "CANDIDATE");
  const address = email("reset-user");
  const oldSession = await tokenFor("reset-user");
  const startedAt = Date.now() - 1000;

  // 1. Ask for a link.
  await page.goto("/login");
  await page.getByRole("link", { name: /forgot/i }).click();
  await page.getByLabel("Email").fill(address);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(GENERIC)).toBeVisible();

  // 2. The email arrives in Mailpit.
  const message = await waitForEmail(address, { after: startedAt, subject: "Reset your HireHub password" });
  expect(message.Text).toContain("expires in 45 minutes");
  const link = message.Text.match(/http:\/\/localhost:5173\/reset-password#token=[\w-]+/)[0];
  expect(message.HTML).toContain(`href="${link}"`); // the button, in the branded HTML version
  expect(message.HTML).toContain("Choose a new password");

  // 3. Open it: the token leaves the address bar; the password is checked before saving.
  await page.goto(link);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  expect(page.url()).not.toContain("token=");
  await page.getByLabel("New password", { exact: true }).fill("short");
  await page.getByLabel("Repeat the new password").fill("different");
  await page.getByRole("button", { name: "Save the new password" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("The two passwords don't match.")).toBeVisible();

  await page.getByLabel("New password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Repeat the new password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Save the new password" }).click();
  await page.waitForURL(/\/login$/);
  await expect(page.locator(".session-notice")).toHaveText("Your password has been changed. Log in with your new password.");

  // 4. Old password refused, new one works; the session from before the reset is over.
  const login = (password) => fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: address, password }) });
  expect((await login(PASSWORD)).status).toBe(401);
  expect((await login(NEW_PASSWORD)).status).toBe(200);
  expect((await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${oldSession}` } })).status).toBe(401);

  await page.fill('input[type="email"]', address);
  await page.fill('input[type="password"]', NEW_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/candidate-dashboard/);

  // 5. The link worked once. (Signed out from the login page: on the dashboard, its requests
  // without a session would send the browser to /login in the middle of the next navigation.)
  await page.goto("/login");
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto(link);
  await expect(page.getByRole("alert")).toContainText("has already been used or has expired");
  await expect(page.getByRole("button", { name: "Ask for a new link" })).toBeVisible();
});

test("the answer doesn't reveal whether an email has an account", async ({ page }) => {
  await registerByApi("reset-known", "CANDIDATE");
  const ask = (address) => fetch(`${API}/auth/password-reset`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: address }) });

  const known = await ask(email("reset-known"));
  const unknown = await ask(email("reset-nobody"));
  expect(known.status).toBe(unknown.status);
  expect(await known.text()).toBe(await unknown.text());

  await waitForEmail(email("reset-known"), { subject: "Reset your HireHub password" });
  await page.waitForTimeout(1500);
  expect(await countEmails(email("reset-nobody"))).toBe(0);

  // Same on the page.
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email("reset-nobody"));
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(GENERIC)).toBeVisible();
});

test("a made-up or incomplete link is refused with a way forward", async ({ page }) => {
  await page.goto("/reset-password#token=made-up-token");
  await expect(page.getByRole("alert")).toContainText("has already been used or has expired");
  await page.goto("/login");
  await page.goto("/reset-password");
  await expect(page.getByRole("alert")).toHaveText("This reset link is incomplete. Please ask for a new one.");
  await page.getByRole("button", { name: "Ask for a new link" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});
