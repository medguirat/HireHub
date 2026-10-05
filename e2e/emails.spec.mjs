// The welcome email, read from Mailpit's API: sent after signup, with a text and an HTML version
// and a button to the right dashboard. ("Forgot password" emails: password-reset.spec.mjs.)
import { expect, test } from "@playwright/test";
import { BASE_URL, email, registerByApi, waitForEmail } from "./support/helpers.mjs";

for (const [role, dashboard, sentence] of [
  ["CANDIDATE", "candidate-dashboard", "Your HireHub candidate account is ready."],
  ["RECRUITER", "recruiter-dashboard", "Your HireHub recruiter account is ready."],
]) {
  test(`a new ${role.toLowerCase()} receives a welcome email`, async () => {
    const who = `welcome-${role.toLowerCase()}`;
    const startedAt = Date.now() - 1000;
    await registerByApi(who, role, role === "RECRUITER" ? { companyName: "Welcome Corp" } : {});

    const message = await waitForEmail(email(who), { after: startedAt, subject: "Welcome to HireHub" });
    expect(message.From.Address).toBe("no-reply@hirehub.local");
    expect(message.Text).toContain(`Hello QA,`);
    expect(message.Text).toContain(sentence);
    expect(message.Text).toContain(`${BASE_URL}/${dashboard}`);
    expect(message.HTML).toContain(`href="${BASE_URL}/${dashboard}"`);
    expect(message.HTML).toContain("Open my dashboard");
  });
}
