// Started (detached) by scripts/dev.mjs. If the launcher disappears without
// cleaning up (terminal closed, process killed), stops the services it started.
// Exits on its own once the launcher has shut down cleanly.
import { clearState, isAlive, readState, stopRecordedChildren } from "./lib/processes.mjs";

const launcherPid = Number(process.argv[2]);
const POLL_MS = 1000;

const timer = setInterval(() => {
  const state = readState();
  if (!state || state.launcherPid !== launcherPid) {
    clearInterval(timer); // clean shutdown, or a newer launcher took over
    return;
  }
  if (!isAlive(launcherPid)) {
    clearInterval(timer);
    stopRecordedChildren(state);
    clearState();
  }
}, POLL_MS);
