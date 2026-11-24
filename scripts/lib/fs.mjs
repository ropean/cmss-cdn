import { mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const mkdirp = (dir) => mkdirSync(dir, { recursive: true });

/** Every file under `dir` (relative POSIX paths, sorted). [] when `dir` is missing. */
export function walk(dir, rel = "") {
  let entries;
  try {
    entries = readdirSync(join(dir, rel), { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(dir, r));
    else if (e.isFile()) out.push(r);
  }
  return out;
}

export const sizeOf = (path) => statSync(path).size;
