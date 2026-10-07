// Helpers shared by the profile pages.

/** Opens edit mode and moves the keyboard focus to a field. */
export function focusField(setEditing, fieldId) {
  setEditing(true);
  setTimeout(() => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }, 60);
}

export const normalizeUrl = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const isValidUrl = (value) => {
  if (!value || !value.trim()) return true;
  try {
    const url = new URL(normalizeUrl(value));
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
};
