/**
 * Server-side impersonation utilities
 *
 * Staff admins can impersonate regular users to:
 * - See the app from their perspective
 * - Perform actions on their behalf (with audit trail)
 *
 * Impersonation state is stored in an HTTP-only cookie.
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import type { User } from "@blockclub/shared";

const IMPERSONATION_COOKIE = "bc_impersonating";
const MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours

export interface ImpersonationContext {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedUser: User | null;
  staffUserId: string;
  staffEmail: string;
}

/**
 * Get the current impersonation context from server-side cookies.
 * Returns null if the user is not a staff admin.
 */
export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !isStaffAdmin(authUser.email)) {
    return null;
  }

  const cookieStore = await cookies();
  const impersonatingUserId = cookieStore.get(IMPERSONATION_COOKIE)?.value;

  if (!impersonatingUserId) {
    return {
      isImpersonating: false,
      impersonatedUserId: null,
      impersonatedUser: null,
      staffUserId: authUser.id,
      staffEmail: authUser.email || "",
    };
  }

  // Fetch impersonated user data using admin client (bypasses RLS)
  const adminSupabase = createAdminClient();
  const { data: impersonatedUser } = await adminSupabase
    .from("users")
    .select("*")
    .eq("id", impersonatingUserId)
    .single();

  // If impersonated user doesn't exist, clear the cookie
  if (!impersonatedUser) {
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE);
    return {
      isImpersonating: false,
      impersonatedUserId: null,
      impersonatedUser: null,
      staffUserId: authUser.id,
      staffEmail: authUser.email || "",
    };
  }

  return {
    isImpersonating: true,
    impersonatedUserId: impersonatingUserId,
    impersonatedUser: impersonatedUser as User,
    staffUserId: authUser.id,
    staffEmail: authUser.email || "",
  };
}

/**
 * Get the effective user ID for queries.
 * Returns the impersonated user ID if impersonating, otherwise the authenticated user ID.
 */
export async function getEffectiveUserId(): Promise<string | null> {
  const context = await getImpersonationContext();

  if (context?.isImpersonating && context.impersonatedUserId) {
    return context.impersonatedUserId;
  }

  if (context) {
    return context.staffUserId;
  }

  // Not a staff admin, return regular user ID
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Get the effective user profile for queries.
 * Returns the impersonated user if impersonating, otherwise the authenticated user profile.
 */
export async function getEffectiveUser(): Promise<User | null> {
  const context = await getImpersonationContext();

  if (context?.isImpersonating && context.impersonatedUser) {
    return context.impersonatedUser;
  }

  // Fetch the actual user profile
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return profile as User | null;
}

/**
 * Check if the current request is in impersonation mode.
 */
export async function isImpersonating(): Promise<boolean> {
  const context = await getImpersonationContext();
  return context?.isImpersonating ?? false;
}

/**
 * Set the impersonation cookie to start impersonating a user.
 * This should only be called from a server action after validating staff status.
 */
export async function setImpersonationCookie(targetUserId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Clear the impersonation cookie to stop impersonating.
 */
export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);
}
