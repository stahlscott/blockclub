#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const webRoot = join(repoRoot, "apps", "web");
const allowNonLocal = process.env.ALLOW_NON_LOCAL_SUPABASE === "true";
const checkOnly = process.argv.includes("--check-only");

function fail(message) {
  console.error(`\nIntegration preflight failed: ${message}\n`);
  process.exit(1);
}

function parseEnvOutput(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return values;
}

function findIntegrationTests(directory) {
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", "e2e"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...findIntegrationTests(path));
    else if (/\.integration\.(test|spec)\.(ts|tsx)$/.test(entry.name)) results.push(path);
  }
  return results;
}

if (!existsSync(join(repoRoot, "supabase", "config.toml"))) {
  fail(`expected local project at ${join(repoRoot, "supabase", "config.toml")}`);
}

const integrationTests = findIntegrationTests(join(webRoot, "src"));
if (integrationTests.length === 0) {
  fail("no *.integration.test.ts or *.integration.spec.ts files are registered");
}

const explicitValues = {
  API_URL: process.env.SUPABASE_INTEGRATION_URL,
  ANON_KEY: process.env.SUPABASE_INTEGRATION_ANON_KEY,
  SERVICE_ROLE_KEY: process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY,
};

const hasAnyExplicitValue = Object.values(explicitValues).some(Boolean);
const hasCompleteExplicitValues = Object.values(explicitValues).every(Boolean);
if (hasAnyExplicitValue && !hasCompleteExplicitValues) {
  fail("integration credentials must be supplied as a complete SUPABASE_INTEGRATION_URL/ANON_KEY/SERVICE_ROLE_KEY triplet; refusing to mix partial credentials with application environment variables");
}

let values = hasCompleteExplicitValues ? explicitValues : null;

if (checkOnly) {
  console.log(`Integration preflight static checks passed (${integrationTests.length} test file${integrationTests.length === 1 ? "" : "s"} found)`);
  process.exit(0);
}

if (!values || !values.API_URL || !values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
  const status = spawnSync("supabase", ["status", "--output", "env"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (status.error) {
    fail("set SUPABASE_INTEGRATION_URL, SUPABASE_INTEGRATION_ANON_KEY, and SUPABASE_INTEGRATION_SERVICE_ROLE_KEY, or install the Supabase CLI and run `supabase start` first");
  }
  if (status.status !== 0) {
    fail("local Supabase is not running; run `supabase start` and retry, or provide explicit integration credentials");
  }
  const output = parseEnvOutput(status.stdout);
  values = {
    API_URL: values?.API_URL ?? output.API_URL,
    ANON_KEY: values?.ANON_KEY ?? output.ANON_KEY,
    SERVICE_ROLE_KEY: values?.SERVICE_ROLE_KEY ?? output.SERVICE_ROLE_KEY,
  };
}

if (!values.API_URL || !values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
  fail("Supabase status did not provide API_URL, ANON_KEY, and SERVICE_ROLE_KEY");
}

let url;
try {
  url = new URL(values.API_URL);
} catch {
  fail(`invalid Supabase URL: ${values.API_URL}`);
}

if (!allowNonLocal && !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
  fail(`refusing non-local Supabase host ${url.hostname}; set ALLOW_NON_LOCAL_SUPABASE=true only for an intentional isolated environment`);
}

for (const path of ["/rest/v1/", "/auth/v1/health"]) {
  try {
    const response = await fetch(new URL(path, values.API_URL));
    if (!response) fail(`no response from ${path}`);
  } catch (error) {
    fail(`cannot reach ${path} at ${values.API_URL}: ${error.message}`);
  }
}

process.env.SUPABASE_INTEGRATION_URL = values.API_URL;
process.env.SUPABASE_INTEGRATION_ANON_KEY = values.ANON_KEY;
process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY = values.SERVICE_ROLE_KEY;

const vitest = spawnSync("npx", ["vitest", "--config", "vitest.integration.config.ts", "run"], {
  cwd: webRoot,
  stdio: "inherit",
  env: process.env,
});
process.exit(vitest.status ?? 1);
