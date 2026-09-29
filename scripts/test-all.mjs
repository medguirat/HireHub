#!/usr/bin/env node
// Runs every test suite: ai-service (pytest), backend (Maven), frontend (build).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IS_WINDOWS = process.platform === "win32";
const PYTHON = process.env.PYTHON || (IS_WINDOWS ? "python" : "python3");

const suites = [
  ["ai-service", "ai-service", `${PYTHON} -m pytest -q`],
  ["backend", "backend", IS_WINDOWS ? ".\\mvnw.cmd -q test" : "./mvnw -q test"],
  ["frontend build", "frontend", "npm run build"],
];

const failed = [];
for (const [name, cwd, command] of suites) {
  console.log(`\n=== ${name}: ${command}`);
  const result = spawnSync(command, { cwd: path.join(ROOT, cwd), shell: true, stdio: "inherit" });
  if (result.status !== 0) failed.push(name);
}
console.log(failed.length ? `\nFAILED: ${failed.join(", ")}` : "\nAll test suites passed.");
process.exitCode = failed.length ? 1 : 0;
