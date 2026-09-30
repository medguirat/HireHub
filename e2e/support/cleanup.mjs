// Deletes the data created by end-to-end runs, and only that: accounts whose email
// starts with "qa-e2e-", and everything attached to them (offers, applications,
// CVs and their files, scores, notifications, evaluations, profiles).
//
// Runs after every E2E run (Playwright global teardown), or by hand:
//   node e2e/support/cleanup.mjs
//
// Database settings come from DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD,
// falling back to backend/src/main/resources/application.properties.
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const QA_EMAIL_PREFIX = "qa-e2e-";

function dbConfig() {
  let props = {};
  try {
    const text = readFileSync(path.join(ROOT, "backend", "src", "main", "resources", "application.properties"), "utf8");
    props = Object.fromEntries(text.split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
  } catch { /* use the environment only */ }
  const url = props["spring.datasource.url"] || "";
  const match = url.match(/jdbc:mysql:\/\/([^:/]+)(?::(\d+))?\/([^?]+)/) || [];
  return {
    host: process.env.DB_HOST || match[1] || "localhost",
    port: Number(process.env.DB_PORT || match[2] || 3306),
    database: process.env.DB_NAME || match[3] || "hirehub_db",
    user: process.env.DB_USER || props["spring.datasource.username"] || "root",
    password: process.env.DB_PASSWORD ?? props["spring.datasource.password"] ?? "",
  };
}

const ids = (rows, key = "id") => rows.map((r) => r[key]);
const inList = (values) => (values.length ? values.map(() => "?").join(",") : "NULL");

export async function cleanupQaData({ log = console.log } = {}) {
  const db = await mysql.createConnection(dbConfig());
  try {
    const [users] = await db.query("SELECT id, email FROM users WHERE email LIKE ?", [`${QA_EMAIL_PREFIX}%`]);
    if (users.length === 0) {
      log("E2E cleanup: nothing to delete.");
      return { users: 0 };
    }
    const u = ids(users);
    const [offers] = await db.query(`SELECT id FROM job_offers WHERE recruiter_id IN (${inList(u)})`, u);
    const o = ids(offers);
    const [apps] = await db.query(
      `SELECT id, cv, cover_letter FROM applications WHERE candidate_id IN (${inList(u)}) OR job_offer_id IN (${inList(o)})`,
      [...u, ...o]);
    const a = ids(apps);
    const [cvs] = await db.query(`SELECT stored_file_name FROM candidate_cv_documents WHERE candidate_id IN (${inList(u)})`, u);
    const [pictures] = await db.query(`SELECT picture AS url FROM candidate_profiles WHERE user_id IN (${inList(u)})`, u);
    const [logos] = await db.query(`SELECT logo AS url FROM recruiter_profiles WHERE user_id IN (${inList(u)})`, u);

    log(`E2E cleanup: deleting ${users.length} qa-e2e account(s): ${users.map((x) => x.email).join(", ")}`);
    log(`  with ${o.length} offer(s), ${a.length} application(s), ${cvs.length} stored CV(s).`);

    const run = (sql, params) => db.query(sql, params);
    await db.beginTransaction();
    await run(`DELETE FROM notifications WHERE user_id IN (${inList(u)}) OR application_id IN (${inList(a)})`, [...u, ...a]);
    await run(`DELETE FROM application_evaluations WHERE application_id IN (${inList(a)})`, a);
    await run(`DELETE FROM match_scores WHERE candidate_id IN (${inList(u)}) OR job_offer_id IN (${inList(o)})`, [...u, ...o]);
    await run(`DELETE FROM applications WHERE id IN (${inList(a)})`, a);
    await run(`DELETE FROM candidate_cv_documents WHERE candidate_id IN (${inList(u)})`, u);
    for (const table of ["experiences", "candidate_skills", "candidate_languages"]) {
      await run(`DELETE FROM ${table} WHERE candidate_profile_id IN (${inList(u)})`, u);
    }
    await run(`DELETE FROM candidate_profiles WHERE user_id IN (${inList(u)})`, u);
    await run(`DELETE FROM recruiter_profiles WHERE user_id IN (${inList(u)})`, u);
    await run(`DELETE FROM job_offers WHERE id IN (${inList(o)})`, o);
    await run(`DELETE FROM users WHERE id IN (${inList(u)}) AND email LIKE ?`, [...u, `${QA_EMAIL_PREFIX}%`]);
    await db.commit();

    // Files: stored CVs (private store) and uploads (application CVs, photos, logos) of these accounts.
    const uploads = [...apps.flatMap((x) => [x.cv, x.cover_letter]), ...ids(pictures, "url"), ...ids(logos, "url")]
      .filter((v) => typeof v === "string" && v.includes("/uploads/"))
      .map((v) => path.join(ROOT, "backend", "uploads", path.basename(new URL(v).pathname)));
    const stored = ids(cvs, "stored_file_name").filter(Boolean).map((f) => path.join(ROOT, "backend", "cv-store", path.basename(f)));
    for (const file of [...uploads, ...stored]) rmSync(file, { force: true });
    log(`  and ${uploads.length + stored.length} file(s).`);
    return { users: users.length, offers: o.length, applications: a.length, files: uploads.length + stored.length };
  } catch (err) {
    await db.rollback().catch(() => {});
    throw err;
  } finally {
    await db.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cleanupQaData().catch((err) => {
    console.error("E2E cleanup failed:", err.message);
    process.exitCode = 1;
  });
}
