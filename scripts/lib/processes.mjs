// Tracking of the processes started by the dev launcher, so they can always be
// stopped: on Ctrl+C, when the launcher is killed abruptly (via the watchdog),
// or on the next launch / `npm run stop`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const IS_WINDOWS = process.platform === "win32";
const STATE_DIR = path.join(ROOT, ".hirehub-dev");
export const PID_FILE = path.join(STATE_DIR, "pids.json");

export function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM"; // exists but belongs to someone else
  }
}

/** All running processes: [{ pid, ppid, commandLine }]. */
export function processSnapshot() {
  if (IS_WINDOWS) {
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command",
      "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
    try {
      return JSON.parse(result.stdout).map((p) => ({ pid: p.ProcessId, ppid: p.ParentProcessId, commandLine: p.CommandLine || "" }));
    } catch {
      return [];
    }
  }
  const result = spawnSync("ps", ["-eo", "pid=,ppid=,args="], { encoding: "utf8" });
  return (result.stdout || "").split(/\r?\n/).filter(Boolean).map((line) => {
    const [, pid, ppid, commandLine] = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/) || [];
    return { pid: Number(pid), ppid: Number(ppid), commandLine: commandLine || "" };
  });
}

/** Every process started (directly or not) by `rootPid`, with its command line. */
export function descendantsOf(rootPid, snapshot = processSnapshot()) {
  const found = [];
  const queue = [rootPid];
  while (queue.length) {
    const parent = queue.shift();
    for (const p of snapshot) {
      if (p.ppid === parent && p.pid !== rootPid && !found.some((f) => f.pid === p.pid)) {
        found.push({ pid: p.pid, commandLine: p.commandLine });
        queue.push(p.pid);
      }
    }
  }
  return found;
}

/** Kills a process and everything it started. */
export function killTree(pid) {
  if (!pid || !isAlive(pid)) return;
  if (IS_WINDOWS) {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(-pid, "SIGTERM"); } catch { /* not a group leader */ }
    try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
  }
}

export function readState() {
  try {
    return JSON.parse(readFileSync(PID_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function writeState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(PID_FILE, JSON.stringify(state, null, 2));
}

export function clearState() {
  rmSync(PID_FILE, { force: true });
}

/**
 * Stops the children recorded in the state file. A PID is only killed if its
 * command line still contains the command we started, so a PID reused by an
 * unrelated program is never touched. Returns the names of what was stopped.
 */
export function stopRecordedChildren(state = readState()) {
  const stopped = new Set();
  const children = state?.children || [];
  if (children.length === 0) return [];
  const snapshot = processSnapshot();
  const running = new Map(snapshot.map((p) => [p.pid, p.commandLine]));
  for (const child of children) {
    // The shell we spawned, if it's still there.
    if (running.get(child.pid)?.includes(child.marker)) {
      killTree(child.pid);
      stopped.add(child.name);
    }
    // Its descendants (the real servers), which outlive the shell when the launcher is killed.
    // Only a process whose command line is exactly the one recorded is stopped.
    for (const p of child.tree || []) {
      if (p.commandLine && running.get(p.pid) === p.commandLine) {
        killTree(p.pid);
        stopped.add(child.name);
      }
    }
  }
  return [...stopped];
}

export const hasState = () => existsSync(PID_FILE);
