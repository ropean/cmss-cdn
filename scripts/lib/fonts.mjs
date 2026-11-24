// Build fonts/<id>/<version>/ from the Fontsource npm packages (docs/SPEC.md "Fonts").
//   <id>.css        every @font-face of the family, family name plain (no "Variable"), woff2 only
//   files/*.woff2   the font files the stylesheet points at (url(files/<file>))
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { mkdirp, sizeOf, walk } from "./fs.mjs";
import { isName, isVersion, urlOf } from "./spec.mjs";

const require = createRequire(import.meta.url);

export function loadCatalog(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** The version published for a catalog entry: package version, plus `-r<rev>` when rev > 1. */
export function versionOf(entry, pkgVersion) {
  return entry.rev && entry.rev > 1 ? `${pkgVersion}-r${entry.rev}` : pkgVersion;
}

function convertCss(source, family, pkgDir, files) {
  return (
    source
      .replace(/font-family:\s*'[^']*'/g, `font-family: '${family}'`)
      // woff2 only: every browser that supports variable fonts / unicode-range reads it
      .replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, "")
      .replace(/url\(\.\/files\/([^)]+)\)/g, (_, file) => {
        files.set(file, join(pkgDir, "files", file));
        return `url(files/${file})`;
      })
  );
}

/** Build every font of `catalog` into `dist`; returns catalog items (docs/SPEC.md "Catalog"). */
export function buildFonts(catalog, dist) {
  const items = [];
  const seen = new Set();
  for (const entry of catalog) {
    if (!isName(entry.id)) throw new Error(`fonts: bad id "${entry.id}"`);
    const pkgDir = dirname(require.resolve(`${entry.pkg}/package.json`));
    const pkgJson = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
    const version = versionOf(entry, pkgJson.version);
    if (!isVersion(version)) throw new Error(`fonts: bad version "${version}" for ${entry.id}`);
    const key = `${entry.id}@${version}`;
    if (seen.has(key)) throw new Error(`fonts: duplicate ${key}`);
    seen.add(key);

    const files = new Map();
    let css = `/* ${entry.family} — ${pkgJson.name}@${pkgJson.version} (SIL OFL 1.1), https://cdn.cmss.io */\n`;
    for (const name of entry.css) {
      const src = readFileSync(join(pkgDir, name), "utf8");
      css += convertCss(src, entry.family, pkgDir, files).trimEnd() + "\n";
    }

    const out = join(dist, "fonts", entry.id, version);
    mkdirp(join(out, "files"));
    writeFileSync(join(out, `${entry.id}.css`), css);
    for (const [name, abs] of files) copyFileSync(abs, join(out, "files", name));

    const all = walk(out);
    const entryPath = `fonts/${entry.id}/${version}/${entry.id}.css`;
    items.push({
      type: "fonts",
      name: entry.id,
      version,
      title: entry.family,
      entry: entryPath,
      url: urlOf("fonts", entry.id, version, `${entry.id}.css`),
      files: all.length,
      bytes: all.reduce((n, f) => n + sizeOf(join(out, f)), 0),
      license: "OFL-1.1",
    });
  }
  return items;
}
