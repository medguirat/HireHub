import { defineConfig } from "vite";

// In development the app and the API share one origin, as in production (where nginx serves the
// app and proxies /api): the browser calls /api on :5173 and Vite forwards it to the backend. The
// session cookie (HttpOnly, SameSite=Strict, Path=/api) and the CSRF cookie then work the same way
// in both. (Unit tests use vitest.config.js.)
const BACKEND = process.env.VITE_BACKEND_URL || "http://localhost:8081";
// Only this computer by default. DEV_LAN_ACCESS=true also accepts other devices on the same network
// (e.g. a phone opening a link from an email); see README "Open the app from a phone".
const LAN = process.env.DEV_LAN_ACCESS === "true";

export default defineConfig({
  server: {
    host: LAN ? "0.0.0.0" : "localhost",
    proxy: {
      "/api": { target: BACKEND },
      "/uploads": { target: BACKEND },
    },
  },
});
