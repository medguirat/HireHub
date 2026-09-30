// Shared helpers for the E2E specs. Every account created here uses the
// qa-e2e- prefix, so global teardown can delete exactly what the run created.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "@playwright/test";

export const API = "http://localhost:8081/api";
export const PASSWORD = "Password123!";
export const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
export const COMPANY_SITE = "http://127.0.0.1:4599";

const RUN = Date.now().toString(36);
export const email = (who) => `qa-e2e-${RUN}-${who}@qa.hirehub.test`;

/** Signs up through the real signup page. */
export async function signUpInUi(page, { who, role, firstName, lastName, company, website }) {
  await page.goto("/create-account");
  await page.getByPlaceholder("Enter your first name").fill(firstName);
  await page.getByPlaceholder("Enter your last name").fill(lastName);
  await page.getByPlaceholder("company@email.com").fill(email(who));
  await page.getByPlaceholder("••••••••").fill(PASSWORD);
  await page.locator(".auth-flow-card select").selectOption(role);
  if (role === "RECRUITER") {
    await page.getByPlaceholder("Your company").fill(company);
    if (website) await page.getByPlaceholder("www.yourcompany.com").fill(website);
  }
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/login$/);
}

export async function logIn(page, who) {
  await page.goto("/login");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/login");
  await page.fill('input[type="email"]', email(who));
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
}

/** Creates an account straight through the API (for tests that aren't about signup). */
export async function registerByApi(who, role, extra = {}) {
  const response = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "QA", lastName: who, email: email(who), password: PASSWORD, role, ...extra }),
  });
  expect(response.ok, `register ${who}`).toBeTruthy();
}

export async function tokenFor(who) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email(who), password: PASSWORD }),
  });
  return (await response.json()).token;
}

export const toast = (page, text) => page.locator(".toast", { hasText: text });

/** yyyy-mm-dd, `days` from today, in local time. */
export function dateIn(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
