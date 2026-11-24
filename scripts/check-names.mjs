#!/usr/bin/env node
// Naming rule (CLAUDE.md): every tracked file and folder name is lowercase, words joined with "-"
// (dots only before extensions). Exceptions: *.md in UPPER-KEBAB, LICENSE, dotfiles/folders, `_headers`.
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const LOWER = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;

function ok(part, leaf) {
  if (part.startsWith(".")) return true;
  if (leaf && (part === "_headers" || part === "LICENSE")) return true;
  if (leaf && part.endsWith(".md")) return /^[A-Z0-9]+(?:-[A-Z0-9]+)*\.md$/.test(part);
  return LOWER.test(part);
}

const bad = [];
for (const file of files) {
  const parts = file.split("/");
  parts.forEach((part, i) => {
    if (!ok(part, i === parts.length - 1)) bad.push(file);
  });
}
if (bad.length) {
  console.error("Names must be lowercase words joined by '-':");
  for (const b of new Set(bad)) console.error("  " + b);
  process.exit(1);
}
console.log(`names ok (${files.length} files)`);
