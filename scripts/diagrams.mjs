#!/usr/bin/env node
// `npm run diagrams`: renders every PlantUML diagram in docs/diagrams/*.puml to PNG (for the
// report) and SVG (for the web) in docs/diagrams/out/. Needs a JDK (the one the backend uses).
// The first run downloads PlantUML (GPL, pinned version) into .hirehub-dev/bin and checks its SHA-1
// against Maven Central's; no Graphviz is needed (the diagrams use the "smetana" layout).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/processes.mjs";

const VERSION = "1.2026.8";
const URL = `https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/${VERSION}/plantuml-${VERSION}.jar`;
const JAR = path.join(ROOT, ".hirehub-dev", "bin", `plantuml-${VERSION}.jar`);
const SOURCES = path.join(ROOT, "docs", "diagrams");
const OUT = path.join(SOURCES, "out");

async function ensureJar() {
  if (existsSync(JAR)) return;
  console.log(`Downloading PlantUML ${VERSION}...`);
  const [jar, sha1] = await Promise.all([
    fetch(URL).then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.arrayBuffer(); }),
    fetch(`${URL}.sha1`).then((r) => r.text()),
  ]);
  const actual = createHash("sha1").update(Buffer.from(jar)).digest("hex");
  if (actual !== sha1.trim().split(/\s+/)[0]) throw new Error("PlantUML download corrupted (SHA-1 mismatch).");
  mkdirSync(path.dirname(JAR), { recursive: true });
  writeFileSync(JAR, Buffer.from(jar));
}

function java() {
  const home = process.env.JAVA_HOME;
  return home ? path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java") : "java";
}

async function main() {
  await ensureJar();
  const files = readdirSync(SOURCES).filter((f) => f.endsWith(".puml") && !f.startsWith("_")).map((f) => path.join(SOURCES, f));
  mkdirSync(OUT, { recursive: true });
  for (const [format, extra] of [["png", ["-Sdpi=200"]], ["svg", []]]) {
    const result = spawnSync(java(), ["-Djava.awt.headless=true", "-jar", JAR, `-t${format}`, ...extra,
      "-charset", "UTF-8", "-o", OUT, ...files], { stdio: "inherit" });
    if (result.status !== 0) throw new Error(`PlantUML failed (${format}).`);
  }
  console.log(`Rendered ${files.length} diagrams to ${path.relative(ROOT, OUT)} (PNG and SVG).`);
  // The source of each image, so a reader of the report can find it.
  const sizes = readdirSync(OUT).filter((f) => f.endsWith(".png"))
    .map((f) => `${f} ${readFileSync(path.join(OUT, f)).length} bytes`);
  console.log(sizes.join("\n"));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
