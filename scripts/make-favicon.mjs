#!/usr/bin/env node
// Regenerate public/favicon.ico from public/favicon.svg (16, 32 and 48 px, PNG-compressed ICO).
//   pnpm favicon      run after editing public/favicon.svg, then commit both files
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIZES = [16, 32, 48];

/** An ICO file holding one PNG image per size (supported by every current browser and by Windows). */
export async function buildIco(svg, sizes = SIZES) {
  const pngs = [];
  for (const s of sizes) {
    // Render large and scale down: crisper edges than rasterizing at 16 px directly.
    pngs.push(await sharp(svg, { density: 288 }).resize(s, s).png().toBuffer());
  }
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s, 0); // width
    e.writeUInt8(s, 1); // height
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });
  return Buffer.concat([head, ...entries, ...pngs]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ico = await buildIco(readFileSync(join(root, "public", "favicon.svg")));
  writeFileSync(join(root, "public", "favicon.ico"), ico);
  console.log(`public/favicon.ico: ${ico.length} bytes (${SIZES.join(", ")} px)`);
}
