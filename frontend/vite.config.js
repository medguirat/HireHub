import { defineConfig } from "vite";

// In development the app and the API share one origin, as in production (where nginx serves the
// app and proxies /api): the browser calls /api on :5173 and Vite forwards it to the backend. The
// session cookie (HttpOnly, SameSite=Strict, Path=/api) and the CSRF cookie then work the same way
// in both. (Unit tests use vitest.config.js.)
const BACKEND = process.env.VITE_BACKEND_URL || "http://localhost:8081";

export default defineConfig({
  server: {
    proxy: {
      "/api": { target: BACKEND },
      "/uploads": { target: BACKEND },
    },
  },
});
