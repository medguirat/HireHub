// The navigation stays in place: the sidebar (desktop) and the top bar (phone) never scroll with the
// page; only the main content does, on every page of both roles, and nothing ends up hidden under them.
import { expect, test } from "@playwright/test";
import { logIn, registerByApi } from "./support/helpers.mjs";

const PAGES = {
  RECRUITER: ["/recruiter-dashboard", "/recruiter-dashboard/offers", "/recruiter-dashboard/applications",
    "/recruiter-dashboard/create-offer", "/recruiter-dashboard/stats", "/recruiter-dashboard/profile"],
  CANDIDATE: ["/candidate-dashboard", "/candidate-dashboard/offers", "/candidate-dashboard/applications",
    "/candidate-dashboard/profile"],
};
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "phone", width: 390, height: 844 },
];

/** Makes the main content much taller than the screen, so every page can be scrolled. */
async function makeLong(page) {
  await page.evaluate(() => {
    const filler = document.createElement("div");
    filler.id = "e2e-filler";
    filler.style.height = "3000px";
    const last = document.createElement("button");
    last.id = "e2e-last";
    last.textContent = "Last element";
    document.querySelector(".recruiter-content").append(filler, last);
  });
}

for (const role of ["RECRUITER", "CANDIDATE"]) {
  test.describe(`${role.toLowerCase()} navigation`, () => {
    const who = `nav-${role.toLowerCase()}`;
    test.beforeAll(async () => {
      await registerByApi(who, role, role === "RECRUITER" ? { companyName: "QA Nav" } : {});
    });

    for (const viewport of VIEWPORTS) {
      test(`stays fixed on every page (${viewport.name})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await logIn(page, who);
        const nav = page.getByRole("navigation", { name: "Main" });

        for (const path of PAGES[role]) {
          await page.goto(path);
          const main = page.locator(".recruiter-content");
          await expect(main.locator("h1")).toBeVisible();
          await makeLong(page);
          const before = await nav.boundingBox();

          // Only the main content scrolls: the page itself never does.
          await main.evaluate((el) => el.scrollTo(0, el.scrollHeight));
          expect(await page.evaluate(() => document.scrollingElement.scrollTop), path).toBe(0);
          expect(await main.evaluate((el) => el.scrollTop), path).toBeGreaterThan(1000);
          const after = await nav.boundingBox();
          expect(after.y, path).toBe(before.y);
          expect(after.x, path).toBe(before.x);
          await expect(nav).toBeInViewport();

          // A focused element scrolled into view is never under the navigation.
          await main.evaluate((el) => el.scrollTo(0, 0));
          await page.locator("#e2e-last").focus();
          const last = await page.locator("#e2e-last").boundingBox();
          const navBox = await nav.boundingBox();
          if (viewport.name === "phone") {
            expect(last.y, path).toBeGreaterThanOrEqual(navBox.y + navBox.height);
          } else {
            expect(last.x, path).toBeGreaterThanOrEqual(navBox.x + navBox.width);
          }
          await expect(page.locator("#e2e-last")).toBeInViewport();

          // No horizontal scrolling at this width.
          expect(await page.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth), path).toBe(true);
        }
      });
    }
  });
}

test("the page header starts below the phone top bar and a new page opens at its top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registerByApi("nav-header", "CANDIDATE");
  await logIn(page, "nav-header");
  const nav = page.getByRole("navigation", { name: "Main" });
  const navBox = await nav.boundingBox();
  // The content area is the page's <main> landmark, and the header is inside it.
  expect(await page.locator(".recruiter-content").evaluate((el) => el.tagName)).toBe("MAIN");
  const header = await page.locator(".recruiter-content h1").boundingBox();
  expect(header.y).toBeGreaterThanOrEqual(navBox.y + navBox.height);

  await makeLong(page);
  await page.locator(".recruiter-content").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "My applications" }).click();
  await expect(page).toHaveURL(/applications$/);
  expect(await page.locator(".recruiter-content").evaluate((el) => el.scrollTop)).toBe(0);
});
