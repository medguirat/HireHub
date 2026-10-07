// Where the E2E tests find the app. Two targets:
// - "dev" (default): the stack `npm run dev` runs, started by Playwright itself.
// - "docker": the Docker stack (`npm run test:e2e:docker` starts it with docker-compose.e2e.yml).
export const TARGET = process.env.E2E_TARGET === "docker" ? "docker" : "dev";
const DOCKER = TARGET === "docker";

/** The app as users open it (also the address in links sent by email). */
export const BASE_URL = process.env.E2E_BASE_URL || (DOCKER ? `http://localhost:${process.env.FRONTEND_PORT || 8080}` : "http://localhost:5173");
/** The API, called directly by test helpers (published on 127.0.0.1 in Docker too). */
export const API = process.env.E2E_API_URL || "http://localhost:8081/api";
export const MAILPIT = process.env.E2E_MAILPIT_URL || "http://localhost:8025";
/** The ai-service, only reachable from this machine with `npm run dev` (internal network in Docker). */
export const AI_SERVICE = process.env.E2E_AI_URL ?? (DOCKER ? "" : "http://localhost:8000");
/** The recruiter's fixture company website, as the ai-service reaches it (from a container: the host). */
export const COMPANY_SITE_PORT = Number(process.env.COMPANY_SITE_PORT || 4599);
export const COMPANY_SITE = DOCKER ? `http://host.docker.internal:${COMPANY_SITE_PORT}` : `http://127.0.0.1:${COMPANY_SITE_PORT}`;
