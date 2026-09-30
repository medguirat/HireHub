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
