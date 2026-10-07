// One date format for the whole (English) UI: "Sep 29, 2026", "Sep 29, 2026, 10:00 AM".
const LOCALE = "en-US";

/** A Date from an ISO string; a bare "yyyy-mm-dd" is read as a local date (no UTC day shift). */
export function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

function valid(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, fallback = "") {
  const date = valid(value);
  return date ? date.toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" }) : fallback;
}

export function formatDateTime(value, fallback = "") {
  const date = valid(value);
  return date
    ? date.toLocaleString(LOCALE, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : fallback;
}

export function formatMonthYear(value, fallback = "") {
  const date = valid(value);
  return date ? date.toLocaleDateString(LOCALE, { month: "short", year: "numeric" }) : fallback;
}

export function formatMonth(value) {
  const date = valid(value);
  return date ? date.toLocaleDateString(LOCALE, { month: "short" }) : "";
}
