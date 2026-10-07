// A tiny static website that plays the recruiter's company site during E2E runs.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "company-site");
const PORT = Number(process.env.COMPANY_SITE_PORT || 4599);
// Docker E2E runs: the ai-service container reaches it through host.docker.internal, so it listens
// on every interface there (COMPANY_SITE_HOST=0.0.0.0); otherwise only on this machine.
const HOST = process.env.COMPANY_SITE_HOST || "127.0.0.1";

createServer(async (req, res) => {
  const name = req.url === "/" ? "index.html" : path.basename(req.url.split("?")[0]);
  try {
    const body = await readFile(path.join(ROOT, name));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(PORT, HOST, () => console.log(`Fixture company site on http://${HOST}:${PORT}`));
