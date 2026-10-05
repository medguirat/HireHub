#!/usr/bin/env node
// Runs HireHub locally with one command: ai-service, backend, frontend, and Mailpit (a local
// inbox that receives the emails the app sends: http://localhost:8025).
// Each service is health-checked and restarted if it crashes or stops
// answering. Ctrl+C stops everything; so does closing the terminal or killing
// this process (a small watchdog stops the services then). `npm run stop`
// stops them too.
//
// Requires: Node 18+, Python 3.11+, JDK 17+, and MySQL running on :3306.
// Configuration and secrets come from the root .env file (created from .env.example on
// first run) and are passed to every service.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { ENV_FILE, addGeneratedSecretsIfMissing, configurationProblems, createEnvFileIfMissing, loadEnv, mailMode } from "./lib/env.mjs";
import { MAILPIT_SMTP, MAILPIT_UI, ensureMailpit } from "./lib/mailpit.mjs";
import {
  IS_WINDOWS, ROOT, clearState, descendantsOf, isAlive, killTree, processSnapshot, readState,
  stopRecordedChildren, writeState
} from "./lib/processes.mjs";

let serviceEnv = process.env;
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

/** Reads .env (creating it on first run) and stops with instructions if a required secret is missing. */
function loadConfiguration() {
  if (createEnvFileIfMissing()) {
    info(`Created ${ENV_FILE} with a new JWT_SECRET.`);
    info("Set DB_PASSWORD in it to your MySQL password (leave it empty if there is none), then run npm run dev again.");
    throw new Error("Configuration needed: set DB_PASSWORD in .env.");
  }
  if (addGeneratedSecretsIfMissing()) {
    info(`Added a generated AI_SERVICE_KEY to ${ENV_FILE} (the backend and the ai-service share it).`);
  }
  const env = loadEnv();
  const problems = configurationProblems(env);
  if (problems.length) {
    throw new Error(`Configuration problem in .env:\n  - ${problems.join("\n  - ")}`);
  }
  serviceEnv = env;
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
  // Started in both email modes (the E2E tests always read Mailpit). Optional: without it, in
  // MAIL_MODE=mailpit, the app runs but its emails aren't delivered anywhere.
  const mailpit = await ensureMailpit((message) => info(message));
  if (mailpit) {
    SERVICES.unshift({
      name: "mailpit",
      color: 34,
      cwd: ".",
      command: `"${mailpit}" --smtp ${MAILPIT_SMTP} --listen 127.0.0.1:8025`,
      health: `${MAILPIT_UI}/livez`,
      port: 8025,
      startupTimeoutMs: 30_000,
    });
  }
}

// Every child we start is recorded, so it can be stopped even if this process dies abruptly.
// With `withTrees`, the processes each child started are recorded too (they outlive the
// shell wrapper when the launcher is killed).
function recordChildren(withTrees = false) {
  const snapshot = withTrees ? processSnapshot() : null;
  const previous = new Map((readState()?.children || []).map((c) => [c.name, c]));
  writeState({
    launcherPid: process.pid,
    children: SERVICES.filter((svc) => svc.child && svc.child.exitCode === null).map((svc) => {
      const tree = snapshot ? descendantsOf(svc.child.pid, snapshot)
        : previous.get(svc.name)?.pid === svc.child.pid ? previous.get(svc.name).tree : [];
      return { name: svc.name, pid: svc.child.pid, marker: svc.command, tree: tree || [] };
    }),
  });
}

function stopChild(service) {
  if (service.child && service.child.exitCode === null) killTree(service.child.pid);
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
      env: { ...serviceEnv, FORCE_COLOR: "0" },
    });
    service.child = child;
    recordChildren();
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
      recordChildren(true);
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
    stopChild(service);
    await exited;
    recordChildren();
    if (stopping) return;
    log(service, paint(31, `stopped (exit code ${child.exitCode}); restarting in ${backoffMs / 1000}s`));
    await sleep(backoffMs);
    backoffMs = Math.min(backoffMs * 2, 30_000);
  }
}

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  info("Stopping all services...");
  SERVICES.forEach(stopChild);
  clearState();
  setTimeout(() => process.exit(exitCode), 500);
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
process.on("SIGHUP", () => shutdown()); // terminal window closed
// Last resort for any other exit path (uncaught error, process.exit elsewhere).
process.on("exit", () => {
  SERVICES.forEach(stopChild);
  clearState();
});

function takeOverFromPreviousRun() {
  const previous = readState();
  if (!previous) return;
  if (previous.launcherPid !== process.pid && isAlive(previous.launcherPid)) {
    throw new Error(`HireHub is already running (launcher PID ${previous.launcherPid}). Use it, or run "npm run stop" first.`);
  }
  const stopped = stopRecordedChildren(previous);
  if (stopped.length) info(`Stopped services left over from a previous run: ${stopped.join(", ")}.`);
  clearState();
}

function startWatchdog() {
  const watchdog = spawn(process.execPath, [path.join(ROOT, "scripts", "dev-watchdog.mjs"), String(process.pid)], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  watchdog.unref();
}

try {
  takeOverFromPreviousRun();
  loadConfiguration();
  writeState({ launcherPid: process.pid, children: [] });
  startWatchdog();
  await preflight();
  const watchers = SERVICES.map((s) => supervise(s).catch((err) => {
    info(paint(31, err.message));
    shutdown(1);
  }));
  (async () => {
    while (!stopping && !SERVICES.every((s) => s.ready)) await sleep(1000);
    if (stopping) return;
    info(paint(32, "HireHub is running:"));
    info(`  App         http://localhost:5173`);
    info(`  API health  http://localhost:8081/api/health`);
    info(`  AI service  http://localhost:8000/health`);
    if (mailMode(serviceEnv) === "smtp") {
      info(`  Emails      sent for real through ${serviceEnv.SMTP_HOST} (MAIL_MODE=smtp)`);
    } else if (SERVICES.some((s) => s.name === "mailpit")) {
      info(`  Emails      ${MAILPIT_UI} (local test inbox; MAIL_MODE=smtp sends real emails, see README)`);
    }
    info("Press Ctrl+C to stop everything.");
  })();
  await Promise.all(watchers);
} catch (err) {
  info(paint(31, err.message));
  shutdown(1);
}
