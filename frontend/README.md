# HireHub frontend

React 19 single-page app, built with Vite. It normally runs with the whole stack from the repository root
(`npm run dev`, see the main README).

```bash
npm install
npm run dev        # http://localhost:5173; /api and /uploads are forwarded to the backend on :8081
npm run lint       # ESLint
npm test           # Vitest + React Testing Library
npm run build      # production build in dist/ (served by nginx in Docker, see Dockerfile and nginx.conf)
```

```
src/
  pages/        one component per screen (candidate and recruiter dashboards, auth pages)
  layouts/      the two dashboard shells (fixed navigation, scrolling <main>) and the page titles
  components/   shared UI: sidebar, dialogs, document viewer, profile parts, toasts, skeletons
  services/     API calls (axios client with the session cookie and CSRF header)
  utils/        API errors, validation, formatting, statistics
  styles/       design tokens (tokens.css) and the stylesheets that use them
```

The session is an HttpOnly cookie set by the API: this code never handles the login token. Colors, spacing and
type sizes come only from `src/styles/tokens.css`.
