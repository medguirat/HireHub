// Local configuration and secrets live in the repository's root .env file (never committed).
// The launcher, the test runner and the E2E scripts read it with this module; the backend
// imports the same file itself (spring.config.import), so running it from an IDE works too.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./processes.mjs";

export const ENV_FILE = path.join(ROOT, ".env");
export const ENV_EXAMPLE = path.join(ROOT, ".env.example");
export const MIN_JWT_SECRET_BYTES = 32; // HS256 needs a 256-bit key

/** KEY=VALUE lines; # starts a comment line; surrounding quotes are not supported (Spring reads the file too). */
export function parseEnv(text) {
  const values = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    values[key] = line.slice(line.indexOf("=") + 1).trim();
  }
  return values;
}

/** The .env values, overridden by variables already set in the environment. */
export function loadEnv() {
  const fromFile = existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, "utf8")) : {};
  return { ...fromFile, ...process.env };
}

export function generateJwtSecret() {
  return randomBytes(48).toString("base64");
}

/** Mirrors the backend's own check (JwtService), so the launcher can explain the problem before starting Java. */
export function jwtSecretProblem(secret) {
  if (!secret) return "JWT_SECRET is not set.";
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(secret)) return "JWT_SECRET must be base64 (letters, digits, + and /).";
  const bytes = Buffer.from(secret, "base64").length;
  if (bytes < MIN_JWT_SECRET_BYTES) {
    return `JWT_SECRET is too short (${bytes} bytes); it must be at least ${MIN_JWT_SECRET_BYTES} bytes (256 bits).`;
  }
  return null;
}

/** Everything that stops the stack from starting, as sentences a person can act on. */
export function configurationProblems(env) {
  const problems = [];
  if (env.DB_PASSWORD === undefined) {
    problems.push("DB_PASSWORD is not set. Put your MySQL password in .env (leave it empty after = if there is none).");
  }
  const jwt = jwtSecretProblem(env.JWT_SECRET);
  if (jwt) problems.push(`${jwt} Generate one with "npm run secret" and paste it into .env.`);
  return problems;
}

/**
 * First run: creates .env from .env.example with a freshly generated JWT secret.
 * Returns true when it created the file (the database password still has to be filled in).
 */
export function createEnvFileIfMissing() {
  if (existsSync(ENV_FILE)) return false;
  const template = readFileSync(ENV_EXAMPLE, "utf8");
  writeFileSync(ENV_FILE, template.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${generateJwtSecret()}`));
  return true;
}

/** JDBC URL -> mysql2 connection settings (for the E2E cleanup). */
export function mysqlConfig(env = loadEnv()) {
  const url = env.DB_URL || "jdbc:mysql://localhost:3306/hirehub_db";
  const match = url.match(/jdbc:mysql:\/\/([^:/?]+)(?::(\d+))?\/([^?]+)/) || [];
  return {
    host: match[1] || "localhost",
    port: Number(match[2] || 3306),
    database: match[3] || "hirehub_db",
    user: env.DB_USERNAME || "root",
    password: env.DB_PASSWORD ?? "",
  };
}
