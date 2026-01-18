/**
 * Auth context utility for server actions and API routes.
 *
 * This consolidates the common auth pattern used across the codebase:
 * - Get authenticated user
 * - Check staff admin status
 * - Handle impersonation context
 * - Return effective user ID and appropriate query client
 */

import type { User as AuthUser } from "@supabase/supabase-js";
import { isStaffAdmin } from "@/lib/auth";
import { getImpersonationContext, ImpersonationContext } from "@/lib/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthContext<T> {
  /** The authenticated Supabase auth user */
  authUser: AuthUser;
  /** Whether the authenticated user is a staff admin */
  isStaffAdmin: boolean;
  /** Whether staff admin is currently impersonating another user */
  isImpersonating: boolean;
  /** The impersonation context (null if not a staff admin) */
  impersonationContext: ImpersonationContext | null;
  /** The effective user ID for queries (impersonated user ID or actual user ID) */
  effectiveUserId: string;
  /** The appropriate Supabase client (admin client for staff, regular client otherwise) */
  queryClient: T;
}

/**
 * Get the auth context for server actions and API routes.
 *
 * This handles the common pattern of:
 * 1. Checking staff admin status
 * 2. Loading impersonation context if staff admin
 * 3. Determining effective user ID
 * 4. Selecting appropriate query client
 *
 * @param supabase - The regular Supabase client from createClient()
 * @param authUser - The authenticated user from supabase.auth.getUser()
 * @returns AuthContext with all relevant auth information
 *
 * @example
 * ```typescript
 * const supabase = await createClient();
 * const { data: { user: authUser } } = await supabase.auth.getUser();
 * if (!authUser) redirect("/signin");
 *
 * const { effectiveUserId, queryClient, isImpersonating } = await getAuthContext(supabase, authUser);
 *
 * // Use queryClient for database queries
 * const { data } = await queryClient.from("items").select("*");
 * ```
 */
export async function getAuthContext<T>(
  supabase: T,
  authUser: AuthUser
): Promise<AuthContext<T>> {
  const userIsStaffAdmin = isStaffAdmin(authUser.email);

  // Check for impersonation (only for staff admins)
  const impersonationContext = userIsStaffAdmin
    ? await getImpersonationContext()
    : null;
  const isImpersonating = impersonationContext?.isImpersonating ?? false;

  // Determine effective user ID (impersonated user or actual user)
  const effectiveUserId =
    isImpersonating && impersonationContext?.impersonatedUserId
      ? impersonationContext.impersonatedUserId
      : authUser.id;

  // Use admin client for staff admins to bypass RLS
  // Cast to T because both clients have the same interface at runtime
  const queryClient = (userIsStaffAdmin ? createAdminClient() : supabase) as T;

  return {
    authUser,
    isStaffAdmin: userIsStaffAdmin,
    isImpersonating,
    impersonationContext,
    effectiveUserId,
    queryClient,
  };
}
