// Neighborhood access helper for staff admin bypass
// Provides a unified way to check access and get appropriate Supabase client

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import type { User, Neighborhood, Membership } from "@blockclub/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface NeighborhoodAccess {
  user: User;
  neighborhood: Neighborhood;
  membership: Membership | null;
  isStaffAdmin: boolean;
  isNeighborhoodAdmin: boolean;
  supabase: SupabaseClient;
}

/**
 * Get neighborhood access for a user, handling staff admin bypass.
 *
 * For staff admins:
 * - Returns admin client that bypasses RLS
 * - Does not require membership
 *
 * For regular users:
 * - Requires active membership
 * - Returns regular client with RLS
 *
 * @param slug - The neighborhood slug
 * @param options.requireMembership - If true, redirects non-members (default: true)
 * @returns NeighborhoodAccess object with user, neighborhood, and appropriate client
 */
export async function getNeighborhoodAccess(
  slug: string,
  options: { requireMembership?: boolean } = {}
): Promise<NeighborhoodAccess> {
  const { requireMembership = true } = options;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const userIsStaffAdmin = isStaffAdmin(authUser.email);

  // Use admin client for staff admins to bypass RLS
  const queryClient = userIsStaffAdmin ? createAdminClient() : supabase;

  // Fetch neighborhood
  const { data: neighborhood } = await queryClient
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!neighborhood) {
    notFound();
  }

  // Fetch user profile
  const { data: user } = await queryClient
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!user) {
    redirect("/signin");
  }

  // Check membership
  const { data: membership } = await queryClient
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", authUser.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  // Determine if user has access
  const hasAccess = userIsStaffAdmin || membership !== null;

  if (requireMembership && !hasAccess) {
    redirect(`/neighborhoods/${slug}`);
  }

  return {
    user,
    neighborhood,
    membership,
    isStaffAdmin: userIsStaffAdmin,
    isNeighborhoodAdmin: membership?.role === "admin" || userIsStaffAdmin,
    supabase: queryClient,
  };
}
