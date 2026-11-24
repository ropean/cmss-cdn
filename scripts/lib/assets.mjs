// Hand-managed assets: public/<type>/<name>/<version>/<files> -> copied to dist, listed in the catalog.
import { copyFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { mkdirp, sizeOf, walk } from "./fs.mjs";
import { TYPES, isFileName, isName, isVersion, urlOf } from "./spec.mjs";

const dirs = (path) => {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
};

const ENTRY_NAMES = (type, name) =>
  type === "js"
    ? [`${name}.min.js`, `${name}.js`]
    : type === "css"
      ? [`${name}.min.css`, `${name}.css`]
      : [];

/** Validate and copy public/<type>/…; returns catalog items. Throws on a name that breaks the spec. */
export function buildAssets(publicDir, dist) {
  const items = [];
  for (const type of TYPES) {
    if (type === "fonts") continue; // built, never hand-managed
    for (const name of dirs(join(publicDir, type))) {
      if (!isName(name)) throw new Error(`public/${type}/${name}: bad name (docs/SPEC.md rule 1)`);
      for (const version of dirs(join(publicDir, type, name))) {
        if (!isVersion(version))
          throw new Error(`public/${type}/${name}/${version}: bad version (docs/SPEC.md rule 2)`);
        const root = join(publicDir, type, name, version);
        const files = walk(root);
        if (files.length === 0) continue;
        for (const f of files) {
          for (const part of f.split("/")) {
            if (!isFileName(part))
              throw new Error(`public/${type}/${name}/${version}/${f}: bad file name (rule 4)`);
          }
          const to = join(dist, type, name, version, f);
          mkdirp(dirname(to));
          copyFileSync(join(root, f), to);
        }
        const entryFile = ENTRY_NAMES(type, name).find((n) => files.includes(n));
        items.push({
          type,
          name,
          version,
          title: name,
          ...(entryFile
            ? {
                entry: `${type}/${name}/${version}/${entryFile}`,
                url: urlOf(type, name, version, entryFile),
              }
            : { url: urlOf(type, name, version) }),
          files: files.length,
          bytes: files.reduce((n, f) => n + sizeOf(join(root, f)), 0),
          fileList: files,
        });
      }
    }
  }
  return items;
}
