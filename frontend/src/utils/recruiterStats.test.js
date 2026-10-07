import { describe, expect, it } from "vitest";
import { computeStats, periodStart } from "./recruiterStats";

// "Today" is fixed so the periods are predictable: Sep 15, 2026.
const NOW = new Date(2026, 8, 15);

const offers = [
  { id: 1, title: "Java Developer", contractType: "CDI", publicationDate: "2026-09-01", status: "OPEN" },
  { id: 2, title: "Data Intern", contractType: "STAGE", publicationDate: "2026-05-10", status: "OPEN" },
  { id: 3, title: "Old CDD", contractType: "CDD", publicationDate: "2025-11-20", status: "CLOSED" },
];

const applications = [
  { id: 1, jobOfferId: 1, status: "PENDING", applicationDate: "2026-09-10" },
  { id: 2, jobOfferId: 1, status: "ACCEPTED", applicationDate: "2026-08-02" },
  { id: 3, jobOfferId: 2, status: "REJECTED", applicationDate: "2026-05-20" },
  { id: 4, jobOfferId: 3, status: "ACCEPTED", applicationDate: "2025-12-01" },
];

describe("periodStart", () => {
  it("starts on the first day of the oldest month, current month included", () => {
    expect(periodStart(3, NOW)).toEqual(new Date(2026, 6, 1)); // Jul, Aug, Sep
    expect(periodStart(12, NOW)).toEqual(new Date(2025, 9, 1)); // Oct 2025 .. Sep 2026
  });
});

describe("computeStats: the period changes every figure", () => {
  it("3 months: only this summer's offers and applications", () => {
    const s = computeStats(offers, applications, 3, NOW);
    expect(s.totalOffers).toBe(1);
    expect(s.totalApplications).toBe(2);
    expect(s.contracts.find((c) => c.title === "CDI").count).toBe(1);
    expect(s.contracts.find((c) => c.title === "Internships").count).toBe(0);
    expect(s.outcomes.map((o) => o.count)).toEqual([1, 1, 0]); // accepted, pending, rejected
    expect(s.monthly.map((m) => m.apps)).toEqual([0, 1, 1]);
    expect(s.perOffer).toEqual([expect.objectContaining({ id: "1", title: "Java Developer", total: 2, ACCEPTED: 1, PENDING: 1 })]);
  });

  it("6 months: includes May's internship and its rejected application", () => {
    const s = computeStats(offers, applications, 6, NOW);
    expect(s.totalOffers).toBe(2);
    expect(s.totalApplications).toBe(3);
    expect(s.contracts.find((c) => c.title === "Internships").count).toBe(1);
    expect(s.outcomes.find((o) => o.status === "REJECTED").count).toBe(1);
    expect(s.monthly).toHaveLength(6);
    expect(s.perOffer.map((o) => o.title)).toEqual(["Java Developer", "Data Intern"]);
  });

  it("1 year: everything, including the closed offer from last year", () => {
    const s = computeStats(offers, applications, 12, NOW);
    expect(s.totalOffers).toBe(3);
    expect(s.totalApplications).toBe(4);
    expect(s.acceptedPct).toBe(50);
    expect(s.perOffer.find((o) => o.id === "3")).toEqual(expect.objectContaining({ closed: true, total: 1 }));
  });

  it("percentages are 0, not NaN, when there is no data", () => {
    const s = computeStats([], [], 6, NOW);
    expect(s.contracts.every((c) => c.pct === 0)).toBe(true);
    expect(s.outcomes.every((o) => o.pct === 0)).toBe(true);
    expect(s.perOffer).toEqual([]);
  });
});
