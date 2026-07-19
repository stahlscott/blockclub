#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "apps/web/src");
const inventoryPath = join(root, "docs/plans/2026-07-19-approved-mutation-inventory.md");
const productionFiles = [];
const ignored = ["/test/", "/__tests__/", ".test.ts", ".test.tsx"];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name) && !ignored.some((part) => path.includes(part))) productionFiles.push(path);
  }
}
await walk(sourceRoot);
const inventory = await readFile(inventoryPath, "utf8");
const violations = [];
for (const path of productionFiles) {
  const rawText = await readFile(path, "utf8");
  const text = rawText
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const relativePath = relative(root, path);
  if (/\bas never\b|@ts-ignore|@ts-expect-error/.test(text)) violations.push(`${relativePath}: forbidden unsafe cast/directive`);
  const databaseMutation = /\.from\(\s*["'][^"']+["']\s*\)[\s\S]{0,220}?\.(insert|update|delete)\s*\(/.test(text) || /\.rpc\s*\(/.test(text);
  if (/\.from\(\s*["'][^"']+["']\s*\)[\s\S]{0,220}?\.delete\s*\(/.test(text)) violations.push(`${relativePath}: direct production delete is not approved`);
  if (databaseMutation) {
    if (!inventory.includes(`\`${relativePath}\``) && !/[\/]actions\.ts$/.test(relativePath) && !/[\/]route\.ts$/.test(relativePath) && !relativePath.endsWith("neighborhood-mutations.ts")) {
      violations.push(`${relativePath}: mutation call site is not listed in the approved inventory`);
    }
  }
}
if (violations.length) {
  console.error("Static mutation inventory check failed:\n" + violations.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Static mutation inventory passed (${productionFiles.length} production files scanned).`);
