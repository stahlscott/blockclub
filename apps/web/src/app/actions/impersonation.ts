"use server";

/**
 * Server actions for staff impersonation
 *
 * These actions allow staff admins to impersonate regular users.
 * Impersonation state is stored in an HTTP-only cookie.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { setImpersonationCookie, clearImpersonationCookie } from "@/lib/impersonation";
import { logger } from "@/lib/logger";

/**
 * Start impersonating a user.
 * Only staff admins can call this action.
 *
 * @param targetUserId - The ID of the user to impersonate
 * @returns Success status - caller handles navigation
 */
export async function startImpersonation(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !isStaffAdmin(authUser.email)) {
    return { success: false, error: "Unauthorized: Only staff admins can impersonate users" };
  }

  // Use admin client to fetch target user (bypasses RLS)
  const adminSupabase = createAdminClient();
  const { data: targetUser, error } = await adminSupabase
    .from("users")
    .select("id, email, name")
    .eq("id", targetUserId)
    .single();

  if (error || !targetUser) {
    return { success: false, error: "Target user not found" };
  }

  // Type assertion - we know what fields we selected
  const user = targetUser as { id: string; email: string; name: string };

  // Prevent impersonating another staff admin
  if (isStaffAdmin(user.email)) {
    return { success: false, error: "Cannot impersonate another staff admin" };
  }

  logger.info("Staff impersonation started", {
    staffUserId: authUser.id,
    staffEmail: authUser.email,
    targetUserId: user.id,
    targetEmail: user.email,
    targetName: user.name,
  });

  await setImpersonationCookie(targetUserId);
  return { success: true };
}

/**
 * Stop impersonating a user and return to staff view.
 * Only staff admins can call this action.
 *
 * @returns Success status - caller handles navigation
 */
export async function stopImpersonation(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !isStaffAdmin(authUser.email)) {
    return { success: false, error: "Unauthorized" };
  }

  logger.info("Staff impersonation stopped", {
    staffUserId: authUser.id,
    staffEmail: authUser.email,
  });

  await clearImpersonationCookie();
  return { success: true };
}
