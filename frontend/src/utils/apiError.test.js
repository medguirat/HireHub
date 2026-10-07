import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import api from "../services/api";
import { NETWORK_ERROR, apiError, errorCode, errorMessage, fieldErrors } from "./apiError";


const failure = (status, data) => Object.assign(new Error("Request failed"), { request: {}, response: { status, data } });

describe("reading API errors ({ code, message, correlationId, fieldErrors? })", () => {
  it("shows the server's message", () => {
    const err = failure(400, { code: "BAD_REQUEST", message: "You have already applied for this job offer.", correlationId: "c" });
    expect(errorMessage(err, "fallback")).toBe("You have already applied for this job offer.");
    expect(errorCode(err)).toBe("BAD_REQUEST");
    expect(fieldErrors(err)).toEqual({});
  });

  it("gives validation errors per field", () => {
    const err = failure(400, { code: "VALIDATION_FAILED", message: "Title is required.", correlationId: "c",
      fieldErrors: { title: "Title is required" } });
    expect(fieldErrors(err)).toEqual({ title: "Title is required" });
    expect(errorMessage(err, "fallback")).toBe("Title is required.");
  });

  it("adds a short reference to unexpected server errors, matching the server log", () => {
    const err = failure(500, { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again later.",
      correlationId: "3f2a9c1e-0000-4000-8000-000000000000" });
    expect(errorMessage(err, "fallback")).toBe("An unexpected error occurred. Please try again later. (Reference: 3f2a9c1e)");
  });

  it("explains when the server can't be reached", () => {
    const err = Object.assign(new Error("Network Error"), { request: {} });
    expect(errorMessage(err, "fallback")).toBe(NETWORK_ERROR);
    expect(errorCode(err)).toBeNull();
  });

  it("falls back when the body isn't one of our errors", () => {
    expect(errorMessage(failure(502, "<html>Bad gateway</html>"), "fallback")).toBe("fallback");
    expect(apiError(failure(400, { title: "old format" }))).toBeNull();
    expect(errorMessage(new Error("plain"), "fallback")).toBe("fallback");
  });
});

describe("the API client", () => {
  it("sends cookies and the CSRF header, and fetches the CSRF cookie before a first change", async () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.withXSRFToken).toBe(true);
    expect(api.defaults.xsrfCookieName).toBe("XSRF-TOKEN");
    expect(api.defaults.xsrfHeaderName).toBe("X-XSRF-TOKEN");

    const fetchCsrf = vi.spyOn(axios, "get").mockResolvedValue({ status: 204 });
    const prepare = api.interceptors.request.handlers[0].fulfilled;
    await prepare({ method: "get", headers: {} });
    expect(fetchCsrf).not.toHaveBeenCalled();
    await prepare({ method: "post", headers: {} });
    expect(fetchCsrf).toHaveBeenCalledWith("/api/auth/csrf", { withCredentials: true });

    fetchCsrf.mockClear();
    document.cookie = "XSRF-TOKEN=abc";
    await prepare({ method: "put", headers: {} });
    expect(fetchCsrf).not.toHaveBeenCalled();
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    fetchCsrf.mockRestore();
  });

  it("reads the JSON error body of a failed file download (a Blob) back into an object", async () => {
    const rejected = api.interceptors.response.handlers[0].rejected;
    const body = { code: "FORBIDDEN", message: "You can't open this CV.", correlationId: "c" };
    const err = failure(403, new Blob([JSON.stringify(body)], { type: "application/json" }));
    await expect(rejected(err)).rejects.toBe(err);
    expect(errorMessage(err, "fallback")).toBe("You can't open this CV.");
  });
});
