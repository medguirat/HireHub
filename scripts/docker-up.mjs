#!/usr/bin/env node
// `npm run docker:up`: builds and starts the whole stack in Docker, waits until it's healthy.
import { compose, ensureDockerEnv } from "./lib/docker.mjs";

try {
  const env = ensureDockerEnv();
  const status = compose(["up", "-d", "--build", "--wait"], env);
  if (status !== 0) process.exit(status);
  console.log("\nHireHub is running in Docker:");
  console.log("  App     http://localhost:8080");
  console.log("  Emails  http://localhost:8025 (Mailpit)");
  console.log("Stop it with: docker compose down   (add -v to also delete the database and files)");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
