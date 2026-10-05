# syntax=docker/dockerfile:1
# HireHub frontend: the React app built by Vite, served by nginx, which also forwards /api and
# /uploads to the backend (one origin for the browser, as with the Vite dev server).
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://localhost/healthz || exit 1
