import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "../scripts/build.mjs";
import { walk } from "../scripts/lib/fs.mjs";
import { isFileName, isName, isVersion } from "../scripts/lib/spec.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = mkdtempSync(join(tmpdir(), "cmss-cdn-"));
const { items } = build({ dist });
const files = walk(dist);
const json = (p) => JSON.parse(readFileSync(join(dist, p), "utf8"));

test("every font in catalog/fonts.json is published under <id>/<version>/", () => {
  const catalog = JSON.parse(readFileSync(join(root, "catalog", "fonts.json"), "utf8"));
  for (const f of catalog) {
    const item = items.find((i) => i.type === "fonts" && i.name === f.id);
    assert.ok(item, `${f.id} missing from the catalog`);
    assert.ok(files.includes(item.entry), `${item.entry} not built`);
  }
});

test("font stylesheets: plain family name, woff2 only, relative files/ urls that exist", () => {
  for (const item of items.filter((i) => i.type === "fonts")) {
    const css = readFileSync(join(dist, item.entry), "utf8");
    assert.ok(
      !/Variable/.test(css.replace(/\/\*.*?\*\//g, "")),
      `${item.entry}: "… Variable" family`,
    );
    assert.ok(!/\.woff\)/.test(css), `${item.entry}: has a .woff source`);
    assert.ok(css.includes(`font-family: '${item.title}'`), `${item.entry}: family ${item.title}`);
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
    assert.ok(urls.length > 0, `${item.entry}: no url()`);
    for (const u of urls) {
      assert.match(u, /^files\/[a-z0-9-]+\.woff2$/, `${item.entry}: ${u}`);
      assert.ok(files.includes(`${dirname(item.entry)}/${u}`), `${item.entry}: ${u} not built`);
    }
  }
});

test("everything in dist follows <type>/<name>/<version>/<file> (or is a root file)", () => {
  const ROOT = new Set(["index.html", "index.json", "_headers", "fonts/index.json"]);
  for (const f of files) {
    if (ROOT.has(f)) continue;
    const [type, name, version, ...rest] = f.split("/");
    assert.ok(["fonts", "js", "css", "images"].includes(type), f);
    assert.ok(isName(name), `${f}: name`);
    assert.ok(isVersion(version), `${f}: version`);
    assert.ok(rest.length > 0 && rest.every(isFileName), `${f}: file name`);
  }
});

test("index.json lists every version directory once, with real counts", () => {
  const doc = json("index.json");
  assert.equal(doc.version, 1);
  assert.equal(doc.base, "https://cdn.cmss.io");
  const keys = doc.items.map((i) => `${i.type}/${i.name}/${i.version}`);
  assert.equal(new Set(keys).size, keys.length, "duplicate item");
  const dirs = new Set(
    files.filter((f) => f.split("/").length > 3).map((f) => f.split("/").slice(0, 3).join("/")),
  );
  assert.deepEqual([...dirs].sort(), [...keys].sort());
  for (const i of doc.items) {
    const own = files.filter((f) => f.startsWith(`${i.type}/${i.name}/${i.version}/`));
    assert.equal(i.files, own.length, `${i.name}: files`);
    assert.equal(i.url, `https://cdn.cmss.io/${i.entry ?? `${i.type}/${i.name}/${i.version}`}`);
  }
  assert.deepEqual(
    json("fonts/index.json").items,
    doc.items.filter((i) => i.type === "fonts"),
  );
});

test("the build is reproducible: same inputs, same index.json", () => {
  const again = mkdtempSync(join(tmpdir(), "cmss-cdn-"));
  build({ dist: again });
  assert.equal(
    readFileSync(join(again, "index.json"), "utf8"),
    readFileSync(join(dist, "index.json"), "utf8"),
  );
});

test("_headers: CORS for everything, immutable cache for every versioned type", () => {
  const h = readFileSync(join(dist, "_headers"), "utf8");
  assert.match(h, /^\/\*\n\s+Access-Control-Allow-Origin: \*/m);
  for (const t of ["fonts", "js", "css", "images"])
    assert.match(
      h,
      new RegExp(
        `^/${t}/\\*/\\*/\\*\\n\\s+Cache-Control: public, max-age=31536000, immutable`,
        "m",
      ),
    );
});

test("hand-managed assets: copied, catalogued, entry file found", () => {
  const pub = mkdtempSync(join(tmpdir(), "cmss-public-"));
  mkdirSync(join(pub, "js", "demo-lib", "1.2.0"), { recursive: true });
  writeFileSync(join(pub, "js", "demo-lib", "1.2.0", "demo-lib.min.js"), "console.log(1)");
  mkdirSync(join(pub, "images", "logo", "1.0.0"), { recursive: true });
  writeFileSync(join(pub, "images", "logo", "1.0.0", "logo.svg"), "<svg/>");
  const out = mkdtempSync(join(tmpdir(), "cmss-out-"));
  const empty = join(out, "cat.json");
  writeFileSync(empty, "[]");
  const r = build({ dist: join(out, "dist"), publicDir: pub, catalogPath: empty });
  const js = r.items.find((i) => i.type === "js");
  assert.equal(js.entry, "js/demo-lib/1.2.0/demo-lib.min.js");
  assert.equal(js.url, "https://cdn.cmss.io/js/demo-lib/1.2.0/demo-lib.min.js");
  const img = r.items.find((i) => i.type === "images");
  assert.deepEqual(img.fileList, ["logo.svg"]);
  assert.equal(img.entry, undefined);
});

test("hand-managed assets: a name that breaks the spec fails the build", () => {
  const bad = (rel) => {
    const pub = mkdtempSync(join(tmpdir(), "cmss-public-"));
    mkdirSync(dirname(join(pub, rel)), { recursive: true });
    writeFileSync(join(pub, rel), "x");
    const out = mkdtempSync(join(tmpdir(), "cmss-out-"));
    const cat = join(out, "cat.json");
    writeFileSync(cat, "[]");
    return () => build({ dist: join(out, "dist"), publicDir: pub, catalogPath: cat });
  };
  assert.throws(bad("js/Demo/1.0.0/a.js"), /bad name/);
  assert.throws(bad("js/demo/latest/a.js"), /bad version/);
  assert.throws(bad("js/demo/1.0.0/A.js"), /bad file name/);
});
