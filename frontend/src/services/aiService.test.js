import { afterEach, describe, expect, it, vi } from "vitest";
import aiService from "./aiService";
import api from "./api";

const failure = (status, data) => Object.assign(new Error("Request failed"), { request: {}, response: { status, data } });

describe("profile drafts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("go through the backend, never straight to the ai-service", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { text: "Acme builds robots.", ai_assisted: false } });
    expect(await aiService.draftCompanyDescription({ companyName: "Acme" })).toMatchObject({ text: "Acme builds robots." });
    expect(post).toHaveBeenCalledWith("/recruiters/profile/description-draft", { companyName: "Acme" });
    await aiService.draftBio({ headline: "Dev" });
    expect(post).toHaveBeenCalledWith("/candidates/me/bio-draft", { headline: "Dev" });
  });

  it("show the ai-service's own message when the profile is too empty, and a plain one otherwise", async () => {
    vi.spyOn(api, "post").mockRejectedValueOnce(failure(422, { code: "NOT_ENOUGH_DATA", message: "Add a few details first.", correlationId: "c" }));
    await expect(aiService.draftBio({})).rejects.toThrow("Add a few details first.");

    vi.spyOn(api, "post").mockRejectedValueOnce(failure(503, { code: "DRAFTS_UNAVAILABLE", message: "x", correlationId: "c" }));
    await expect(aiService.draftBio({ headline: "Dev" })).rejects.toThrow("The draft helper is unavailable right now.");
  });
});
