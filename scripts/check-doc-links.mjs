#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const markdownFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !["node_modules", ".git", ".next"].includes(entry.name)) await walk(path);
    else if (entry.isFile() && entry.name.endsWith(".md")) markdownFiles.push(path);
  }
}
await walk(root);
const failures = [];
for (const path of markdownFiles) {
  const text = await readFile(path, "utf8");
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split(/[?#]/, 1)[0];
    if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
    const resolved = target.startsWith("/") ? join(root, target) : resolve(dirname(path), target);
    try { await readFile(resolved); } catch { failures.push(`${relative(root, path)} -> ${target}`); }
  }
}
if (failures.length) {
  console.error("Documentation link check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Documentation link check passed (${markdownFiles.length} Markdown files scanned).`);
