#!/usr/bin/env node
// Build dist/ — the whole site Cloudflare Pages serves (build command: `bun run build`, output: dist).
//   fonts/…        from catalog/fonts.json + the Fontsource packages
//   js|css|images  copied from public/<type>/<name>/<version>/
//   index.json, fonts/index.json   the catalog
//   index.html     the search page (site/index.html)
//   _headers …     the other top-level files of public/
import { copyFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAssets } from "./lib/assets.mjs";
import { writeCatalogs } from "./lib/catalog.mjs";
import { mkdirp } from "./lib/fs.mjs";
import { buildFonts, loadCatalog } from "./lib/fonts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function build({
  dist = join(root, "dist"),
  publicDir = join(root, "public"),
  catalogPath = join(root, "catalog", "fonts.json"),
  siteDir = join(root, "site"),
} = {}) {
  rmSync(dist, { recursive: true, force: true });
  mkdirp(dist);

  const fonts = buildFonts(loadCatalog(catalogPath), dist);
  const assets = buildAssets(publicDir, dist);
  const items = writeCatalogs(dist, [...fonts, ...assets]);

  copyFileSync(join(siteDir, "index.html"), join(dist, "index.html"));
  // Top-level files of public/ (e.g. _headers, favicon.svg) go to the site root as they are.
  for (const name of readdirSync(publicDir)) {
    const from = join(publicDir, name);
    if (statSync(from).isFile()) copyFileSync(from, join(dist, name));
  }
  return { dist, items };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { dist, items } = build();
  const byType = {};
  for (const i of items) byType[i.type] = (byType[i.type] ?? 0) + 1;
  console.log(`built ${items.length} item(s) → ${dist}`, byType);
}
