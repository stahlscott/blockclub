#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const maxLines = 300;
const waiversPath = join(root, "scripts/component-size-waivers.json");
const waivers = JSON.parse(await readFile(waiversPath, "utf8"));
const files = Object.keys(waivers);
const failures = [];
for (const relativePath of files) {
  const text = await readFile(join(root, relativePath), "utf8");
  const lines = text.split(/\r?\n/).length;
  if (lines > maxLines && !waivers[relativePath]?.reason) failures.push(`${relativePath}: ${lines} lines without a waiver reason`);
  if (lines <= maxLines && waivers[relativePath]?.reason) console.warn(`${relativePath}: waiver is now unnecessary (${lines} lines)`);
}
if (failures.length) {
  console.error("Component size check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Component size check passed (${files.length} tracked components, max ${maxLines} lines).`);
