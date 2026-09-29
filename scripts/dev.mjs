#!/usr/bin/env node
// Runs HireHub locally with one command: ai-service, backend and frontend.
// Each service is health-checked and restarted if it crashes or stops
// answering. Ctrl+C stops everything.
//
// Requires: Node 18+, Python 3.11+, JDK 17+, and MySQL running on :3306.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IS_WINDOWS = process.platform === "win32";
const PYTHON = process.env.PYTHON || (IS_WINDOWS ? "python" : "python3");

const SERVICES = [
  {
    name: "ai-service",
    color: 35,
    cwd: "ai-service",
    command: `${PYTHON} -m uvicorn main:app --port 8000 --no-access-log`,
    health: "http://localhost:8000/health",
    port: 8000,
    startupTimeoutMs: 600_000, // first start downloads the multilingual embedding model (~470 MB)
  },
  {
    name: "backend",
    color: 36,
    cwd: "backend",
    // Explicit relative path: cmd.exe may be configured not to search the current directory.
    command: IS_WINDOWS ? ".\\mvnw.cmd -q spring-boot:run" : "./mvnw -q spring-boot:run",
    health: "http://localhost:8081/api/health",
    port: 8081,
    startupTimeoutMs: 300_000,
  },
  {
    name: "frontend",
    color: 33,
    cwd: "frontend",
    command: "npm run dev -- --port 5173 --strictPort",
    health: "http://localhost:5173",
    port: 5173,
    startupTimeoutMs: 60_000,
  },
];

const HEALTH_INTERVAL_MS = 10_000;
const FAILURES_BEFORE_RESTART = 3;
let stopping = false;

const paint = (color, text) => `\x1b[${color}m${text}\x1b[0m`;
const log = (service, message) => console.log(`${paint(service.color, `[${service.name}]`.padEnd(13))} ${message}`);
const info = (message) => console.log(`${paint(32, "[hirehub]".padEnd(13))} ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isHealthy(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

function portInUse(port) {
  const tryHost = (host) => new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
  return Promise.all([tryHost("127.0.0.1"), tryHost("::1")]).then((r) => r.some(Boolean));
}

function run(command, cwd) {
  return spawnSync(command, { cwd: path.join(ROOT, cwd), shell: true, stdio: "inherit" }).status === 0;
}

async function preflight() {
  const deps = spawnSync(PYTHON, ["-c", "import fastapi, uvicorn, multipart, sentence_transformers, pypdf, docx"],
    { cwd: ROOT, stdio: "ignore" });
  if (deps.status !== 0) {
    info("Installing ai-service Python dependencies...");
    if (!run(`${PYTHON} -m pip install -r requirements.txt`, "ai-service")) {
      throw new Error("Could not install ai-service dependencies (see output above).");
    }
  }
  if (!existsSync(path.join(ROOT, "frontend", "node_modules"))) {
    info("Installing frontend dependencies...");
    if (!run("npm install", "frontend")) throw new Error("npm install failed in frontend/.");
  }
  if (!(await portInUse(3306))) {
    info(paint(31, "MySQL doesn't seem to be running on port 3306; the backend will fail to start without it."));
  }
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (IS_WINDOWS) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
  }
}

function pipe(service, stream) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) if (line.trim()) log(service, line);
  });
}

async function supervise(service) {
  if (await isHealthy(service.health)) {
    log(service, `already running on :${service.port} - reusing it (not supervised)`);
    service.ready = true;
    return;
  }
  if (await portInUse(service.port)) {
    throw new Error(`Port ${service.port} is used by another program; stop it so ${service.name} can start.`);
  }

  let backoffMs = 2000;
  while (!stopping) {
    log(service, `starting: ${service.command}`);
    const child = spawn(service.command, {
      cwd: path.join(ROOT, service.cwd),
      shell: true,
      detached: !IS_WINDOWS,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    service.child = child;
    pipe(service, child.stdout);
    pipe(service, child.stderr);
    const exited = new Promise((resolve) => child.once("exit", resolve));

    const deadline = Date.now() + service.startupTimeoutMs;
    let ready = false;
    while (!stopping && child.exitCode === null && Date.now() < deadline) {
      if (await isHealthy(service.health)) { ready = true; break; }
      await sleep(1000);
    }
    if (ready) {
      log(service, paint(32, `ready at ${service.health}`));
      service.ready = true;
      const healthySince = Date.now();
      let failures = 0;
      while (!stopping && child.exitCode === null) {
        await Promise.race([sleep(HEALTH_INTERVAL_MS), exited]);
        if (stopping || child.exitCode !== null) break;
        failures = (await isHealthy(service.health)) ? 0 : failures + 1;
        if (failures >= FAILURES_BEFORE_RESTART) {
          log(service, paint(31, `failed ${failures} health checks in a row - restarting`));
          break;
        }
      }
      if (Date.now() - healthySince > 60_000) backoffMs = 2000;
    } else if (!stopping && child.exitCode === null) {
      log(service, paint(31, `not healthy after ${service.startupTimeoutMs / 1000}s - restarting`));
    }

    service.ready = false;
    killTree(child);
    await exited;
    if (stopping) return;
    log(service, paint(31, `stopped (exit code ${child.exitCode}); restarting in ${backoffMs / 1000}s`));
    await sleep(backoffMs);
    backoffMs = Math.min(backoffMs * 2, 30_000);
  }
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  info("Stopping all services...");
  SERVICES.forEach((s) => killTree(s.child));
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await preflight();
  const watchers = SERVICES.map((s) => supervise(s).catch((err) => {
    info(paint(31, err.message));
    shutdown();
  }));
  (async () => {
    while (!stopping && !SERVICES.every((s) => s.ready)) await sleep(1000);
    if (stopping) return;
    info(paint(32, "HireHub is running:"));
    info(`  App         http://localhost:5173`);
    info(`  API health  http://localhost:8081/api/health`);
    info(`  AI service  http://localhost:8000/health`);
    info("Press Ctrl+C to stop everything.");
  })();
  await Promise.all(watchers);
} catch (err) {
  info(paint(31, err.message));
  shutdown();
  process.exitCode = 1;
}
