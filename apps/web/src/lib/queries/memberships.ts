/**
 * Centralized queries for the memberships table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MembershipRole } from "@blockclub/shared";
import type { MembershipWithUser, MembershipWithNeighborhood } from "./types";

type Client = SupabaseClient<Database>;

// Standard select for membership with user details
const MEMBERSHIP_WITH_USER_SELECT = `
  *,
  user:users!memberships_user_id_fkey(id, name, email, avatar_url, phones)
` as const;

// Standard select for membership with neighborhood
const MEMBERSHIP_WITH_NEIGHBORHOOD_SELECT = `
  *,
  neighborhood:neighborhoods(*)
` as const;

/**
 * Get a user's active membership in a specific neighborhood.
 * Returns null if user is not an active member.
 */
export async function getActiveMembership(
  client: Client,
  neighborhoodId: string,
  userId: string
) {
  // Use maybeSingle() to return null instead of throwing when no membership exists
  const result = await client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  return result as { data: MembershipWithUser | null; error: typeof result.error };
}

/**
 * Get all active members of a neighborhood (for directory).
 * Ordered by join date (oldest first).
 */
export async function getMembersByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: { role?: MembershipRole; status?: "active" | "pending" }
) {
  let query = client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (options?.role) {
    query = query.eq("role", options.role);
  }

  // Default to active if not specified
  const status = options?.status ?? "active";
  query = query.eq("status", status);

  const result = await query;
  return result as { data: MembershipWithUser[] | null; error: typeof result.error };
}

/**
 * Get all neighborhoods a user belongs to.
 * Used for neighborhood switcher.
 */
export async function getNeighborhoodsForUser(
  client: Client,
  userId: string,
  options?: { includeInactive?: boolean }
) {
  let query = client
    .from("memberships")
    .select(MEMBERSHIP_WITH_NEIGHBORHOOD_SELECT)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (!options?.includeInactive) {
    query = query.eq("status", "active");
  }

  const result = await query;
  return result as { data: MembershipWithNeighborhood[] | null; error: typeof result.error };
}

/**
 * Check if a user has an active membership in a neighborhood.
 * Lightweight check without fetching full data.
 */
export async function checkMembership(
  client: Client,
  neighborhoodId: string,
  userId: string
): Promise<{ isMember: boolean; role: MembershipRole | null }> {
  // Use maybeSingle() to avoid throwing when no membership exists
  const { data } = await client
    .from("memberships")
    .select("role")
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  const row = data as { role: MembershipRole } | null;
  return {
    isMember: !!row,
    role: row?.role ?? null,
  };
}
