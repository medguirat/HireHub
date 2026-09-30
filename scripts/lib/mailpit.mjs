// Mailpit (https://mailpit.axllent.org, MIT licence): a local SMTP server with a web inbox. In
// development every email HireHub sends (e.g. "reset your password") lands there instead of a
// real mailbox: SMTP on localhost:1025, web UI and API on http://localhost:8025.
//
// Which binary is used, in order: MAILPIT_BIN, a `mailpit` on the PATH, or a pinned release
// downloaded once from GitHub into .hirehub-dev/bin. The download is checked against the
// SHA-256 below before it is used.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { IS_WINDOWS, ROOT } from "./processes.mjs";

export const MAILPIT_VERSION = "v1.31.3";
export const MAILPIT_SMTP = "127.0.0.1:1025";
export const MAILPIT_UI = "http://localhost:8025";

// Release assets and their SHA-256, from https://github.com/axllent/mailpit/releases/tag/v1.31.3
const ASSETS = {
  "win32-x64": ["mailpit-windows-amd64.zip", "863e9502d4e0f14a78c0f91c5091797b1c7b7b7e3fc7e5eab62e5770ce44b76e"],
  "win32-arm64": ["mailpit-windows-arm64.zip", "b97d373441f56564a081f8bb0bd23ccca2368fe2067704fd94c529cc31dbfb19"],
  "linux-x64": ["mailpit-linux-amd64.tar.gz", "e98b9a8d9622417a6988b736f7d3246e94bad4fed48ad3c604e60d72569f8cc7"],
  "linux-arm64": ["mailpit-linux-arm64.tar.gz", "4dc59d428dd94fb9840326ecdff4f49f3f795b3616657fed592436b1a240bb2e"],
  "darwin-x64": ["mailpit-darwin-amd64.tar.gz", "ce0c67a2fd1d3ae1a1f6616d8020243b3783d7ef64f4efc0ac40611f4e7aabfe"],
  "darwin-arm64": ["mailpit-darwin-arm64.tar.gz", "f72ac5bae2c8ef6bd719c1aa11237500e9a81e50ba759f92b9b1e80812920a85"],
};

const INSTALL_DIR = path.join(ROOT, ".hirehub-dev", "bin", `mailpit-${MAILPIT_VERSION}`);
const EXE = IS_WINDOWS ? "mailpit.exe" : "mailpit";

function onPath() {
  const found = spawnSync(IS_WINDOWS ? "where" : "which", ["mailpit"], { encoding: "utf8" });
  return found.status === 0 ? found.stdout.split(/\r?\n/).find(Boolean)?.trim() : null;
}

async function download(log) {
  const asset = ASSETS[`${process.platform}-${process.arch}`];
  if (!asset) throw new Error(`no Mailpit build for ${process.platform}-${process.arch}`);
  const [name, sha256] = asset;
  const url = `https://github.com/axllent/mailpit/releases/download/${MAILPIT_VERSION}/${name}`;
  log(`Downloading Mailpit ${MAILPIT_VERSION} (about 10 MB, once) from ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`download failed (HTTP ${response.status})`);
  const data = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(data).digest("hex");
  if (actual !== sha256) throw new Error(`checksum mismatch for ${name}; the file was not used`);

  mkdirSync(INSTALL_DIR, { recursive: true });
  const archive = path.join(INSTALL_DIR, name);
  writeFileSync(archive, data);
  // Windows' own tar (bsdtar, Windows 10+) reads .zip; name it explicitly so a GNU tar earlier
  // on the PATH (e.g. Git Bash's) isn't used instead.
  const tar = IS_WINDOWS ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
  const unpacked = spawnSync(tar, ["-xf", archive, "-C", INSTALL_DIR], { encoding: "utf8" });
  rmSync(archive, { force: true });
  if (unpacked.status !== 0) throw new Error(`could not unpack ${name}: ${unpacked.stderr}`);
  const exe = path.join(INSTALL_DIR, EXE);
  if (!IS_WINDOWS) chmodSync(exe, 0o755);
  return exe;
}

/** Path to a Mailpit binary, or null (with the reason logged) if none can be found or fetched. */
export async function ensureMailpit(log) {
  if (process.env.MAILPIT_BIN) {
    if (existsSync(process.env.MAILPIT_BIN)) return process.env.MAILPIT_BIN;
    log(`MAILPIT_BIN points to ${process.env.MAILPIT_BIN}, which doesn't exist.`);
    return null;
  }
  const installed = path.join(INSTALL_DIR, EXE);
  if (existsSync(installed)) return installed;
  const system = onPath();
  if (system) return system;
  try {
    return await download(log);
  } catch (err) {
    log(`Mailpit is not available (${err.message}). Emails won't be delivered; install Mailpit or set MAILPIT_BIN.`);
    return null;
  }
}
