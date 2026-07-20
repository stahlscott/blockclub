/**
 * Centralized queries for the memberships table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Membership, MembershipRole, User } from "@blockclub/shared";
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
  options?: { role?: MembershipRole; status?: "active" | "pending" | "all" }
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

  // Filter by status unless "all" is specified
  // Default to active if not specified
  const status = options?.status ?? "active";
  if (status !== "all") {
    query = query.eq("status", status);
  }

  const result = await query;
  return result as { data: MembershipWithUser[] | null; error: typeof result.error };
}

/** Get active directory members with full user profiles for the public directory UI. */
export async function getDirectoryMembers(client: Client, neighborhoodId: string) {
  const result = await client
    .from("memberships")
    .select("*, user:users!memberships_user_id_fkey(*)")
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("joined_at", { ascending: true });

  return result as { data: Array<Membership & { user: User }> | null; error: typeof result.error };
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

/** Get a user's membership record for one neighborhood. */
export async function getMembershipForUserInNeighborhood(
  client: Client,
  userId: string,
  neighborhoodId: string,
) {
  const result = await client
    .from("memberships")
    .select("id, status, deleted_at")
    .eq("user_id", userId)
    .eq("neighborhood_id", neighborhoodId)
    .maybeSingle();

  return result as {
    data: { id: string; status: Membership["status"]; deleted_at: string | null } | null;
    error: typeof result.error;
  };
}

/** Check whether a user has any active, non-deleted membership. */
export async function hasActiveMembership(client: Client, userId: string) {
  const result = await client
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1);

  return (result.data?.length ?? 0) > 0;
}

/** Get a user's active memberships with full neighborhood data. */
export async function getActiveMembershipsForUser(client: Client, userId: string) {
  const result = await client
    .from("memberships")
    .select(MEMBERSHIP_WITH_NEIGHBORHOOD_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null);

  return result as { data: MembershipWithNeighborhood[] | null; error: typeof result.error };
}

/** Get a user's pending memberships with full neighborhood data. */
export async function getPendingMembershipsForUserWithNeighborhood(
  client: Client,
  userId: string,
) {
  const result = await client
    .from("memberships")
    .select(MEMBERSHIP_WITH_NEIGHBORHOOD_SELECT)
    .eq("user_id", userId)
    .eq("status", "pending")
    .is("deleted_at", null);

  return result as { data: MembershipWithNeighborhood[] | null; error: typeof result.error };
}

/** Get a user's pending membership requests with neighborhood names. */
export async function getPendingMembershipsForUser(client: Client, userId: string) {
  const result = await client
    .from("memberships")
    .select("id, neighborhood:neighborhoods(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .is("deleted_at", null);

  return result as {
    data: Array<{ id: string; neighborhood: { name: string } | { name: string }[] | null }> | null;
    error: typeof result.error;
  };
}

/** Get the active membership used to authorize a neighborhood-admin page. */
export async function getActiveMembershipForUser(client: Client, neighborhoodId: string, userId: string) {
  const result = await client
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  return result as { data: Membership | null; error: typeof result.error };
}

/** Get the newest active members for the dashboard. */
export async function getRecentMembers(client: Client, neighborhoodId: string, limit = 6) {
  const result = await client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("joined_at", { ascending: false })
    .limit(limit);

  return result as { data: MembershipWithUser[] | null; error: typeof result.error };
}

/** Count pending membership requests in a neighborhood. */
export async function countPendingMemberships(client: Client, neighborhoodId: string) {
  const result = await client
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "pending")
    .is("deleted_at", null);

  return result.count ?? 0;
}

/** Count active memberships in a neighborhood. */
export async function countActiveMemberships(client: Client, neighborhoodId: string) {
  const result = await client
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "active")
    .is("deleted_at", null);

  return result.count ?? 0;
}

/** Get pending memberships with contact details for neighborhood moderation. */
export async function getPendingMembersByNeighborhood(client: Client, neighborhoodId: string) {
  const result = await client
    .from("memberships")
    .select("*, user:users!memberships_user_id_fkey(id, name, email, avatar_url, address)")
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("joined_at", { ascending: true });

  return result as {
    data: MembershipWithUser[] | null;
    error: typeof result.error;
  };
}
