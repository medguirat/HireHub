// The browser session: an HttpOnly cookie the page's JavaScript can't read, CSRF-protected
// changes, and a logout that really ends the session.
import { expect, test } from "@playwright/test";
import { logIn, registerByApi } from "./support/helpers.mjs";

test("the session is an HttpOnly cookie, invisible to the page, and logout ends it", async ({ page }) => {
  await registerByApi("session-user", "CANDIDATE");
  await logIn(page, "session-user");

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === "hirehub_session");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Strict", path: "/api" });
  expect(cookies.find((c) => c.name === "XSRF-TOKEN")).toMatchObject({ httpOnly: false });

  // Nothing the page's scripts can read holds the session.
  expect(await page.evaluate(() => document.cookie)).not.toContain("hirehub_session");
  expect(await page.evaluate(() => Object.keys(localStorage))).not.toContain("token");
  expect(await page.evaluate(() => localStorage.getItem("user"))).not.toContain(session.value);

  // A change through the app works (it sends the CSRF token)...
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My profile" }).click();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await page.fill("#profile-headline", "Session-tested developer");
  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page.getByText("Session-tested developer").first()).toBeVisible();

  // ...but the same change with the cookie and without the CSRF header is refused.
  const forged = await page.evaluate(async () => {
    const response = await fetch("/api/users/me", { method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Forged", lastName: "Change" }) });
    return { status: response.status, body: await response.json() };
  });
  expect(forged.status).toBe(403);
  expect(forged.body.code).toBe("CSRF_INVALID");

  // Logout deletes the cookie: the API no longer knows this browser.
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login$/);
  expect((await page.context().cookies()).find((c) => c.name === "hirehub_session")).toBeUndefined();
  expect((await page.request.get("/api/users/me")).status()).toBe(401);
});
