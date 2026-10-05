#!/usr/bin/env node
// `npm run screenshots`: screenshots of the main screens, from the demo data, into docs/screenshots/
// (desktop 1440x900 and phone 390x844). Used by the README and the internship report.
// Needs the stack running (`npm run dev`) and the demo data (`npm run seed`).
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { ROOT } from "./lib/processes.mjs";

const APP = process.env.SCREENSHOT_BASE_URL || "http://localhost:5173";
const PASSWORD = process.env.DEMO_PASSWORD || "Demo1234!";
const RECRUITER = "leila.mansour@demo.hirehub.test";
const CANDIDATE = "amine.trabelsi@demo.hirehub.test";
const OUT = path.join(ROOT, "docs", "screenshots");

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.locator(".skeleton").first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(400); // fonts and transitions
}

async function shot(page, name) {
  await settle(page);
  // JPEG: a fraction of PNG's size for these gradient-heavy screens, and usable in LaTeX too.
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 85 });
  console.log(`  ${name}.jpg`);
}

async function logIn(page, email) {
  await page.context().clearCookies();
  await page.goto(`${APP}/login`);
  await page.evaluate(() => localStorage.clear());
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    console.log(`Screenshots of ${APP} into ${OUT}`);
    const desktop = await (await browser.newContext(DESKTOP)).newPage();

    await desktop.goto(`${APP}/`);
    await shot(desktop, "01-splash");
    await desktop.goto(`${APP}/login`);
    await shot(desktop, "02-login");
    await desktop.goto(`${APP}/create-account`);
    await shot(desktop, "03-signup");

    await logIn(desktop, RECRUITER);
    await shot(desktop, "10-recruiter-overview");
    await desktop.goto(`${APP}/recruiter-dashboard/offers`);
    await shot(desktop, "11-recruiter-offers");
    await desktop.goto(`${APP}/recruiter-dashboard/create-offer`);
    await shot(desktop, "12-recruiter-new-offer");
    await desktop.goto(`${APP}/recruiter-dashboard/applications`);
    await shot(desktop, "13-recruiter-applications");
    await desktop.locator(".candidate-name-link").first().click();
    await desktop.waitForURL(/\/rate/);
    await shot(desktop, "14-recruiter-evaluation");
    await desktop.goto(`${APP}/recruiter-dashboard/stats`);
    await shot(desktop, "15-recruiter-statistics");
    await desktop.goto(`${APP}/recruiter-dashboard/profile`);
    await shot(desktop, "16-recruiter-company-profile");

    await logIn(desktop, CANDIDATE);
    await shot(desktop, "20-candidate-overview");
    await desktop.goto(`${APP}/candidate-dashboard/offers`);
    await shot(desktop, "21-candidate-offers");
    await desktop.getByRole("button", { name: "Check my CV match" }).click();
    await desktop.getByRole("dialog").locator(".match-ring").first().waitFor({ timeout: 90_000 });
    await shot(desktop, "22-candidate-cv-match");
    await desktop.goto(`${APP}/candidate-dashboard/applications`);
    await shot(desktop, "23-candidate-applications");
    await desktop.goto(`${APP}/candidate-dashboard/profile`);
    await shot(desktop, "24-candidate-profile");

    const phone = await (await browser.newContext(PHONE)).newPage();
    await logIn(phone, CANDIDATE);
    await shot(phone, "30-phone-candidate-overview");
    await phone.goto(`${APP}/candidate-dashboard/offers`);
    await shot(phone, "31-phone-candidate-offers");
    await phone.getByRole("button", { name: "Open menu" }).click();
    await shot(phone, "32-phone-menu");
    await logIn(phone, RECRUITER);
    await phone.goto(`${APP}/recruiter-dashboard/stats`);
    await shot(phone, "33-phone-recruiter-statistics");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
