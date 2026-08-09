#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const fixtureRoot = path.resolve(process.argv[2] || "apps/web/e2e/fixtures/images");
const outputPath = path.resolve(process.argv[3] || "test-results/image-profile-benchmark.json");
const requiredNames = ["portrait-exif.jpg", "desktop.jpg", "transparent.png", "small.webp", "large.jpg", "animated.gif"];

const entries = await fs.readdir(fixtureRoot).catch(() => []);
const missing = requiredNames.filter((name) => !entries.includes(name));
if (missing.length > 0) {
  console.error(`Missing required image fixtures: ${missing.join(", ")}`);
  process.exit(1);
}

const results = await Promise.all(entries.filter((name) => /\.(jpe?g|png|webp|gif)$/i.test(name)).map(async (name) => {
  const input = path.join(fixtureRoot, name);
  const metadata = await sharp(input, { animated: true }).metadata();
  return {
    file: name,
    bytes: (await fs.stat(input)).size,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    pages: metadata.pages || 1,
    hasAlpha: Boolean(metadata.hasAlpha),
    orientation: metadata.orientation || 1,
  };
}));
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), fixtures: results }, null, 2)}\n`);
console.log(`Wrote ${results.length} fixture records to ${outputPath}`);
