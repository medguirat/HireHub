// Recruiter statistics, computed from the recruiter's real offers and applications.
// Every figure respects the selected period (3, 6 or 12 months, current month included).
import { formatMonth, toDate } from "./format";

export const TIMEFRAMES = [
  { key: "3M", months: 3, label: "Last 3 months" },
  { key: "6M", months: 6, label: "Last 6 months" },
  { key: "1Y", months: 12, label: "Last 12 months" },
];

export const CONTRACTS = [
  { types: ["CDI"], title: "CDI", subtitle: "Permanent contracts", accent: "violet", icon: "💼" },
  { types: ["CDD"], title: "CDD", subtitle: "Fixed-term contracts", accent: "cyan", icon: "📄" },
  { types: ["STAGE", "INTERNSHIP"], title: "Internships", subtitle: "Students and trainees", accent: "green", icon: "🎓" },
  { types: ["FREELANCE"], title: "Freelance", subtitle: "Independent contractors", accent: "magenta", icon: "🚀" },
];

export const OUTCOMES = [
  { status: "ACCEPTED", label: "Accepted", accent: "green" },
  { status: "PENDING", label: "Pending review", accent: "orange" },
  { status: "REJECTED", label: "Rejected", accent: "red" },
];

export const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);

/** First day of the oldest month in the period. */
export function periodStart(months, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
}

const inPeriod = (value, start) => {
  if (!value) return false;
  const date = toDate(value);
  return !Number.isNaN(date.getTime()) && date >= start;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export function computeStats(offers, applications, months, now = new Date()) {
  const start = periodStart(months, now);
  const periodOffers = offers.filter((o) => inPeriod(o.publicationDate, start));
  const periodApps = applications.filter((a) => inPeriod(a.applicationDate, start));

  const contracts = CONTRACTS.map((c) => {
    const count = periodOffers.filter((o) => c.types.includes((o.contractType || "").toUpperCase())).length;
    return { ...c, count, pct: percent(count, periodOffers.length) };
  });

  const outcomes = OUTCOMES.map((o) => {
    const count = periodApps.filter((a) => a.status === o.status).length;
    return { ...o, count, pct: percent(count, periodApps.length) };
  });

  const monthly = Array.from({ length: months }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const key = monthKey(date);
    return {
      month: formatMonth(date),
      apps: periodApps.filter((a) => monthKey(toDate(a.applicationDate)) === key).length,
    };
  });

  const titles = new Map(offers.map((o) => [String(o.id), o]));
  const byOffer = new Map();
  for (const app of periodApps) {
    const id = String(app.jobOfferId);
    const row = byOffer.get(id) || {
      id, title: titles.get(id)?.title || app.jobOfferTitle || "Offer", closed: titles.get(id)?.status === "CLOSED",
      total: 0, ACCEPTED: 0, PENDING: 0, REJECTED: 0,
    };
    row.total += 1;
    if (row[app.status] !== undefined) row[app.status] += 1;
    byOffer.set(id, row);
  }
  const perOffer = [...byOffer.values()].sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));

  return {
    totalOffers: periodOffers.length,
    totalApplications: periodApps.length,
    contracts,
    outcomes,
    acceptedPct: outcomes[0].pct,
    monthly,
    periodTotal: periodApps.length,
    perOffer,
  };
}
