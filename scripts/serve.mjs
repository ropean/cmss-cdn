#!/usr/bin/env node
// Serve dist/ locally with the same CORS and cache headers as public/_headers (rough preview).
//   pnpm dev   (builds, then serves on http://localhost:5003; `node scripts/serve.mjs [port]` serves the last build)
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.argv[2] ?? process.env.PORT ?? 5003);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
  if (rel.split(/[/\\]/).includes("..")) rel = "";
  let file = join(dist, rel);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found\n");
    return;
  }
  const immutable = /^(fonts|js|css|images)\/[^/]+\/[^/]+\//.test(rel);
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "access-control-allow-origin": "*",
    "cache-control": immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`http://localhost:${port}/  (dist/)`));
