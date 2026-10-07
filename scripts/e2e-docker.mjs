#!/usr/bin/env node
// `npm run test:e2e:docker`: the whole Playwright suite against the Docker stack. Starts a separate
// project ("hirehub-e2e", fresh database and files), runs the tests, then removes it (pass --keep
// to leave it running).
import { spawnSync } from "node:child_process";
import { compose, ensureDockerEnv } from "./lib/docker.mjs";
import { ROOT } from "./lib/processes.mjs";

const PROJECT = ["-p", "hirehub-e2e", "-f", "docker-compose.yml", "-f", "docker-compose.e2e.yml"];
const keep = process.argv.includes("--keep");

let exitCode = 1;
try {
  const env = ensureDockerEnv();
  if (compose([...PROJECT, "up", "-d", "--build", "--wait"], env) !== 0) {
    throw new Error("The Docker stack didn't start (see the output above).");
  }
  const testEnv = {
    ...env,
    E2E_TARGET: "docker",
    // The E2E cleanup deletes qa-e2e accounts from the Docker database.
    DB_URL: "jdbc:mysql://127.0.0.1:3307/hirehub_db",
    DB_USERNAME: "hirehub",
    DB_PASSWORD: env.DOCKER_DB_PASSWORD,
  };
  const extra = process.argv.slice(2).filter((a) => a !== "--keep");
  exitCode = spawnSync("npx", ["playwright", "test", ...extra], { cwd: ROOT, stdio: "inherit", env: testEnv, shell: true }).status ?? 1;
} catch (err) {
  console.error(err.message);
} finally {
  if (!keep) compose([...PROJECT, "down", "-v"]);
}
process.exit(exitCode);
