#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configuredEmails = (process.env.STAFF_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Could not list auth users: ${error.message}`);
  users.push(...data.users);
  if (data.users.length < 1000) break;
}

const matches = users.filter((user) => configuredEmails.includes((user.email || "").toLowerCase()));
const missing = configuredEmails.filter(
  (email) => !matches.some((user) => (user.email || "").toLowerCase() === email),
);
if (missing.length > 0) {
  throw new Error(`Configured staff emails have no auth user: ${missing.join(", ")}`);
}

for (const user of matches) {
  if (!user.email) continue;
  const { error } = await supabase.from("staff_admins").upsert(
    { user_id: user.id, email: user.email.toLowerCase(), active: true },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not provision ${user.email}: ${error.message}`);
}

const activeIds = matches.map((user) => user.id);
const { data: existing, error: existingError } = await supabase
  .from("staff_admins")
  .select("user_id")
  .eq("active", true);
if (existingError) throw new Error(`Could not read staff allowlist: ${existingError.message}`);

for (const row of existing || []) {
  if (activeIds.includes(row.user_id)) continue;
  const { error } = await supabase
    .from("staff_admins")
    .update({ active: false })
    .eq("user_id", row.user_id);
  if (error) throw new Error(`Could not deactivate staff user ${row.user_id}: ${error.message}`);
}

console.log(`Synchronized ${matches.length} staff admin(s); deactivated ${Math.max((existing || []).length - activeIds.length, 0)} stale row(s).`);
