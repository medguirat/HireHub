// src/services/api.js
import axios from "axios";

// The session is an HttpOnly cookie set by the API at login: this code never sees the login token.
// Requests that change something also send the CSRF token: axios copies the XSRF-TOKEN cookie
// into the X-XSRF-TOKEN header.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const UNSAFE = new Set(["post", "put", "patch", "delete"]);

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    withXSRFToken: true,
});

const hasCsrfCookie = () => document.cookie.split("; ").some((c) => c.startsWith("XSRF-TOKEN="));

// The CSRF cookie arrives with any API answer; before the very first change (e.g. login on a fresh
// visit), ask for it once.
api.interceptors.request.use(async (config) => {
    if (UNSAFE.has((config.method || "get").toLowerCase()) && !hasCsrfCookie()) {
        await axios.get(`${BASE_URL}/auth/csrf`, { withCredentials: true });
    }
    return config;
});

// A page often fires several requests at once; when the session has expired they all
// come back 401. Only the first one redirects, otherwise a second full reload of the
// login page would lose the "session expired" notice.
let redirectingToLogin = false;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // File downloads ask for a Blob; their errors then arrive as a Blob too. Read the JSON
        // error body back so callers see { code, message, ... } like any other error.
        const data = error.response?.data;
        if (typeof Blob !== "undefined" && data instanceof Blob && data.type.includes("json")) {
            try {
                error.response.data = JSON.parse(await data.text());
            } catch { /* keep the raw body */ }
        }
        if (error.response && error.response.status === 401) {
            // The API has already deleted an invalid session cookie; forget the cached user.
            const hadSession = !!localStorage.getItem("user");
            localStorage.clear();
            if (!redirectingToLogin && !window.location.pathname.includes("/login")) {
                redirectingToLogin = true;
                // A wrong password on the login page is also a 401; only a user
                // who was signed in and got bounced should see "session expired".
                if (hadSession) {
                    sessionStorage.setItem("hirehub.sessionExpired", "1");
                }
                window.location.replace("/login");
            }
        }
        return Promise.reject(error);
    }
);

export default api;
