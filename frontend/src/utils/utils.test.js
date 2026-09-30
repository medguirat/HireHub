import { describe, expect, it, vi } from "vitest";
import { formatDate, formatDateTime, formatMonthYear, toDate } from "./format";
import { MAX_FILE_SIZE_MB, validateFile } from "./files";
import fetchAllPages from "./fetchAllPages";
import { isValidUrl, normalizeUrl } from "./profile";

describe("dates", () => {
  it("use one English format", () => {
    expect(formatDate("2026-09-29")).toBe("Sep 29, 2026");
    expect(formatMonthYear("2021-01-01")).toBe("Jan 2021");
    expect(formatDateTime("2026-10-06T10:00:00")).toMatch(/^Oct 6, 2026, 10:00\s?AM$/);
  });

  it("read a plain date as a local date (no day shift)", () => {
    const d = toDate("2026-01-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 1]);
  });

  it("show the fallback for missing or invalid values", () => {
    expect(formatDate(null, "none")).toBe("none");
    expect(formatDate("not a date", "—")).toBe("—");
  });
});

describe("file checks", () => {
  it("accept the allowed types under the size limit", () => {
    expect(validateFile(new File(["x"], "CV.PDF"), [".pdf"])).toBeNull();
    expect(validateFile(new File(["x"], "cv.docx"), [".pdf"])).toBe("Please choose a .pdf file.");
    const big = { name: "cv.pdf", size: (MAX_FILE_SIZE_MB + 1) * 1024 * 1024 };
    expect(validateFile(big, [".pdf"])).toMatch(/under 10 MB/);
  });
});

describe("fetchAllPages", () => {
  it("keeps loading until the last page", async () => {
    const fetchPage = vi.fn((page) => Promise.resolve({ content: [page * 2, page * 2 + 1], totalPages: 3 }));
    expect(await fetchAllPages(fetchPage)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("stops on an empty result", async () => {
    expect(await fetchAllPages(() => Promise.resolve({ content: [], totalPages: 0 }))).toEqual([]);
  });
});

describe("profile links", () => {
  it("add https:// and reject what isn't a web address", () => {
    expect(normalizeUrl("linkedin.com/in/amine")).toBe("https://linkedin.com/in/amine");
    expect(normalizeUrl(" ")).toBe("");
    expect(isValidUrl("github.com/amine")).toBe(true);
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("")).toBe(true); // optional fields
  });
});
