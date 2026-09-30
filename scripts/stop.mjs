#!/usr/bin/env node
// `npm run stop`: stops the services started by `npm run dev`, even if the
// launcher itself is gone. Only processes recorded by the launcher (and still
// running the same command) are stopped.
import { clearState, isAlive, readState, stopRecordedChildren } from "./lib/processes.mjs";

const state = readState();
if (!state) {
  console.log("Nothing to stop: no services were started by `npm run dev`.");
  process.exit(0);
}
// The launcher alone first, so it can't restart a service while they are being stopped.
if (isAlive(state.launcherPid)) {
  try { process.kill(state.launcherPid, "SIGKILL"); } catch { /* already gone */ }
}
const stopped = stopRecordedChildren(state);
clearState();
console.log(stopped.length ? `Stopped: ${stopped.join(", ")}.` : "Nothing was still running.");
