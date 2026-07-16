// Staff admin configuration
// Staff admins have system-wide privileges including:
// - Creating new neighborhoods
// - Automatic admin access to all neighborhoods
// - Ability to promote members to admin in any neighborhood
// - Ability to demote admins to member in any neighborhood
// - Impersonating users to see the app from their perspective

import type { SupabaseClient } from "@supabase/supabase-js";

type StaffLookupClient = SupabaseClient;
import { env } from "./env";

/**
 * Legacy synchronous check retained only for non-authoritative display paths.
 * Request authorization must use isStaffAdminUser(), which reads the database
 * allowlist provisioned from STAFF_ADMIN_EMAILS.
 */
export function isStaffAdmin(email: string | null | undefined): boolean {
  return env.STAFF_ADMIN_EMAILS.includes(email || "");
}

export async function isStaffAdminUser(
  supabase: StaffLookupClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("is_staff_admin", { p_user_id: userId });
  return !error && data === true;
}

