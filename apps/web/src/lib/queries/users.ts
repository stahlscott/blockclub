/**
 * Centralized queries for the users table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, User } from "@blockclub/shared";
import type { StaffUserSearchResult, UserProfile } from "./types";

type Client = SupabaseClient<Database>;

/**
 * Get a user by ID.
 */
export async function getUserById(client: Client, userId: string) {
  const result = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return result as { data: User | null; error: typeof result.error };
}

/** Get the profile fields required to resolve a user's primary neighborhood. */
export async function getUserProfile(client: Client, userId: string) {
  const result = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return result as { data: UserProfile | null; error: typeof result.error };
}

/** Get the profile fields required by the impersonated global layout. */
export async function getImpersonatedLayoutProfile(client: Client, userId: string) {
  const result = await client
    .from("users")
    .select("primary_neighborhood_id, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return result as {
    data: { primary_neighborhood_id: string | null; avatar_url: string | null } | null;
    error: typeof result.error;
  };
}

/**
 * Get a user by email.
 */
export async function getUserByEmail(client: Client, email: string) {
  const result = await client
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  return result as { data: User | null; error: typeof result.error };
}

/** Search non-deleted users with their non-deleted memberships for staff tools. */
export async function searchStaffUsers(client: Client, query: string, limit = 50) {
  const searchPattern = `%${query}%`;
  const { data: users, error } = await client
    .from("users")
    .select("id, name, email, avatar_url")
    .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`)
    .limit(limit);
  if (error || !users) return { data: [] as StaffUserSearchResult[], error };

  const userRows = users as Array<{ id: string; name: string | null; email: string; avatar_url: string | null }>;
  const userIds = userRows.map((user) => user.id);
  const { data: memberships, error: membershipsError } = await client
    .from("memberships")
    .select("id, user_id, neighborhood_id, role, status, neighborhood:neighborhoods(name, slug)")
    .in("user_id", userIds.length ? userIds : [""])
    .is("deleted_at", null);
  type MembershipRow = {
    id: string;
    user_id: string;
    neighborhood_id: string;
    role: string;
    status: string;
    neighborhood: { name: string; slug: string } | { name: string; slug: string }[] | null;
  };
  const membershipRows = (memberships ?? []) as MembershipRow[];
  const membershipsByUser = new Map<string, StaffUserSearchResult["memberships"]>();
  for (const membership of membershipRows) {
    const neighborhood = Array.isArray(membership.neighborhood)
      ? membership.neighborhood[0]
      : membership.neighborhood;
    if (!neighborhood) continue;
    const rows = membershipsByUser.get(membership.user_id) ?? [];
    rows.push({
      membership_id: membership.id,
      neighborhood_id: membership.neighborhood_id,
      neighborhood_name: neighborhood.name,
      neighborhood_slug: neighborhood.slug,
      role: membership.role,
      status: membership.status,
    });
    membershipsByUser.set(membership.user_id, rows);
  }

  return {
    data: userRows.map((user) => ({ ...user, memberships: membershipsByUser.get(user.id) ?? [] })),
    error: membershipsError,
  };
}
