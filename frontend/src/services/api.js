// src/services/api.js
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8081/api"
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

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
            const hadSession = !!localStorage.getItem("token");
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