// The signed-in user saved at login (localStorage "user"), or null.
// A corrupted value clears the session rather than crashing the page.
export default function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    try { localStorage.clear(); } catch { /* storage unavailable */ }
    return null;
  }
}

/**
 * Updates the saved user after a profile change (the layouts show the name and company from it).
 * The copy is a convenience only: a storage failure is ignored.
 */
export function updateStoredUser(changes) {
  try {
    const stored = readStoredUser();
    if (stored) localStorage.setItem("user", JSON.stringify({ ...stored, ...changes }));
  } catch { /* storage unavailable */ }
}
