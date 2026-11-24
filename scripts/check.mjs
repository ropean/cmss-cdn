#!/usr/bin/env node
// Run every pre-flight check in order; print one line each, dump output only for failures.
import { spawn } from "node:child_process";

const PM =
  process.env.npm_config_user_agent?.startsWith("bun") || process.versions.bun ? "bun" : "pnpm";
const CHECKS = ["check:names", "lint", "check:format", "test", "build"];

const run = (name) =>
  new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(PM, ["run", name], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ name, code, ms: Date.now() - start, out }));
  });

const failed = [];
for (const name of CHECKS) {
  const r = await run(name);
  console.log(`${r.code === 0 ? "PASS" : "FAIL"}  ${name}  ${(r.ms / 1000).toFixed(1)}s`);
  if (r.code !== 0) failed.push(r);
}
for (const f of failed) console.error(`\n── ${f.name} output ──\n${f.out}`);
process.exit(failed.length);
