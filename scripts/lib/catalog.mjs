import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BASE, TYPES } from "./spec.mjs";
import { mkdirp } from "./fs.mjs";

const byVersion = (a, b) => a.localeCompare(b, "en", { numeric: true });

export function sortItems(items) {
  return [...items].sort(
    (a, b) =>
      TYPES.indexOf(a.type) - TYPES.indexOf(b.type) ||
      a.name.localeCompare(b.name) ||
      byVersion(a.version, b.version),
  );
}

/** Write /index.json (everything) and /fonts/index.json (fonts only). */
export function writeCatalogs(dist, items) {
  const sorted = sortItems(items);
  const doc = (list) => JSON.stringify({ version: 1, base: BASE, items: list }, null, 2) + "\n";
  writeFileSync(join(dist, "index.json"), doc(sorted));
  mkdirp(join(dist, "fonts"));
  writeFileSync(join(dist, "fonts", "index.json"), doc(sorted.filter((i) => i.type === "fonts")));
  return sorted;
}
