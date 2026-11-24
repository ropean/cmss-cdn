import assert from "node:assert/strict";
import { test } from "node:test";
import { isFileName, isName, isVersion, urlOf } from "../scripts/lib/spec.mjs";

test("names: lowercase words joined by '-'", () => {
  for (const ok of ["manrope", "noto-sans-sc", "jquery3", "a-1"]) assert.ok(isName(ok), ok);
  for (const bad of ["Manrope", "noto_sans", "noto--sans", "-x", "x-", "", "a.b", "a b"])
    assert.ok(!isName(bad), bad);
});

test("versions: explicit MAJOR.MINOR.PATCH with an optional suffix; never 'latest'", () => {
  for (const ok of ["5.3.0", "0.0.1", "5.3.0-r2", "1.2.3-beta.1"]) assert.ok(isVersion(ok), ok);
  for (const bad of ["latest", "5", "5.3", "v5.3.0", "5.3.0-", "5.3.0-R2", "5.3.0+x"])
    assert.ok(!isVersion(bad), bad);
});

test("file names: lowercase, dots only before extensions", () => {
  for (const ok of ["manrope-latin-wght-normal.woff2", "jquery.min.js", "a.css", "logo-2x.png"])
    assert.ok(isFileName(ok), ok);
  for (const bad of ["Logo.png", "a_b.js", "a b.js", ".hidden", "a..js", "a-.js"])
    assert.ok(!isFileName(bad), bad);
});

test("urlOf: <type>/<name>/<version>/<file>", () => {
  assert.equal(
    urlOf("fonts", "manrope", "5.3.0", "manrope.css"),
    "https://cdn.cmss.io/fonts/manrope/5.3.0/manrope.css",
  );
  assert.equal(urlOf("js", "x", "1.0.0"), "https://cdn.cmss.io/js/x/1.0.0");
});
