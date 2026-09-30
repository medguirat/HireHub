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
    (error) => {
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