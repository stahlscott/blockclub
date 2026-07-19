#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "apps/web/src");
const maxLines = 300;
const waiversPath = join(root, "scripts/component-size-waivers.json");
const waivers = JSON.parse(await readFile(waiversPath, "utf8"));
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(tsx|jsx)$/.test(entry.name) && !path.includes("/test/") && !path.includes("/__tests__/")) files.push(path);
  }
}
await walk(sourceRoot);
const failures = [];
for (const path of files) {
  const relativePath = relative(root, path);
  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/).length;
  if (lines > maxLines && !waivers[relativePath]?.reason) failures.push(`${relativePath}: ${lines} lines without a waiver reason`);
  if (lines <= maxLines && waivers[relativePath]?.reason) console.warn(`${relativePath}: waiver is now unnecessary (${lines} lines)`);
}
for (const relativePath of Object.keys(waivers)) {
  if (!files.includes(join(root, relativePath))) failures.push(`${relativePath}: waiver target does not exist`);
}
if (failures.length) {
  console.error("Component size check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Component size check passed (${files.length} tracked components, max ${maxLines} lines).`);
