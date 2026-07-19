#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const status = await readFile("docs/reviews/2026-07-15-codebase-panel-remediation-status.md", "utf8");
const design = await readFile("docs/plans/2026-07-14-codebase-panel-remediation-design.md", "utf8");
const finalReport = await readFile("docs/reviews/2026-07-19-final-finding-dispositions.md", "utf8");
const requiredFindings = [
  ...Array.from({ length: 38 }, (_, index) => `F${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `N${index + 1}`),
];
const missing = requiredFindings.filter((finding) => !design.includes(finding) || !finalReport.includes(finding));
const dispositionRows = finalReport.split(/\r?\n/).filter((line) => /^\|\s*[^|]+\|\s*[^|]+\|\s*[^|]+\|/.test(line));
const dispositionText = dispositionRows.join("\n");
const missingRows = requiredFindings.filter((finding) => !dispositionRows.some((row) => new RegExp(`^\\|\\s*[^|]*\\b${finding}\\b[^|]*\\|`).test(row)));
const invalidDispositionRows = dispositionRows.filter((row) => !/^\|\s*(?:F|N)\d/.test(row) ? false : !/\|\s*(?:Fixed|Fixed with contained compatibility boundary|Waived with evidence|Rebutted|Rebutted as stated|Rebutted as a distinct finding|Fixed or waived)\s*\|/.test(row));
const requiredArtifacts = [
  "docs/plans/2026-07-19-approved-mutation-inventory.md",
  "docs/reviews/2026-07-15-codebase-panel-remediation-status.md",
  "docs/reviews/2026-07-19-final-finding-dispositions.md",
  "docs/architecture/data-integrity-and-authorization.md",
];
const missingArtifacts = [];
for (const artifact of requiredArtifacts) {
  try { await readFile(artifact); } catch { missingArtifacts.push(artifact); }
}
if (missing.length || missingRows.length || invalidDispositionRows.length || missingArtifacts.length || !status.includes("## Open gaps and release risks")) {
  console.error("Finding disposition check failed.");
  if (missing.length) console.error(`Missing finding references: ${missing.join(", ")}`);
  if (missingRows.length) console.error(`Missing disposition rows: ${missingRows.join(", ")}`);
  if (invalidDispositionRows.length) console.error(`Invalid disposition rows: ${invalidDispositionRows.join("\n")}`);
  if (missingArtifacts.length) console.error(`Missing artifacts: ${missingArtifacts.join(", ")}`);
  if (!status.includes("## Open gaps and release risks")) console.error("Status report is missing its open-risk section.");
  process.exit(1);
}
console.log(`Finding disposition check passed (${requiredFindings.length} finding references and ${requiredArtifacts.length} artifacts).`);
