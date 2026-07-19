/**
 * Centralized queries for the neighborhoods table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Neighborhood } from "@blockclub/shared";
import type { NeighborhoodGuideQuery } from "./types";

type Client = SupabaseClient<Database>;

type StaffNeighborhoodRow = Pick<Neighborhood, "id" | "name" | "slug" | "created_at">;
export interface StaffNeighborhoodSummary extends StaffNeighborhoodRow {
  memberCount: number;
  itemCount: number;
}
type StaffNeighborhoodDetailRow = Pick<Neighborhood, "id" | "name" | "slug">;
type StaffMembershipCountRow = { neighborhood_id: string };
type StaffItemCountRow = { neighborhood_id: string };
type StaffMembershipRow = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  status: "pending" | "active" | "inactive" | "moved_out";
  joined_at: string;
};
type StaffUserRow = { id: string; name: string | null; email: string; avatar_url: string | null };

/**
 * Get a neighborhood by slug.
 */
export async function getNeighborhoodBySlug(client: Client, slug: string) {
  const result = await client
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  return result as { data: Neighborhood | null; error: typeof result.error };
}

/**
 * Get a neighborhood by ID.
 */
export async function getNeighborhoodById(client: Client, id: string) {
  const result = await client
    .from("neighborhoods")
    .select("*")
    .eq("id", id)
    .single();

  return result as { data: Neighborhood | null; error: typeof result.error };
}

/** Get the visible guide content for one neighborhood. */
export async function getNeighborhoodGuide(client: Client, neighborhoodId: string) {
  const result = await client
    .from("neighborhood_guides")
    .select("title, content")
    .eq("neighborhood_id", neighborhoodId)
    .maybeSingle();

  return result as { data: { title: string; content: string } | null; error: typeof result.error };
}

/** Get guide content with the user who last updated it. */
export async function getNeighborhoodGuideWithUpdatedBy(client: Client, neighborhoodId: string) {
  const result = await client
    .from("neighborhood_guides")
    .select("*, updated_by_user:users!updated_by(id, name, avatar_url)")
    .eq("neighborhood_id", neighborhoodId)
    .maybeSingle();

  return result as { data: NeighborhoodGuideQuery | null; error: typeof result.error };
}

/** Count visible records used by the staff overview. */
export async function getStaffOverviewCounts(client: Client) {
  const [neighborhoods, users, items] = await Promise.all([
    client.from("neighborhoods").select("id", { count: "exact", head: true }),
    client.from("users").select("id", { count: "exact", head: true }),
    client.from("items").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  return {
    neighborhoodCount: neighborhoods.count ?? 0,
    userCount: users.count ?? 0,
    itemCount: items.count ?? 0,
  };
}

/** Staff neighborhood list with active-member and non-deleted-item counts. */
export async function getStaffNeighborhoods(client: Client) {
  const { data: neighborhoods, error } = await client
    .from("neighborhoods")
    .select("id, name, slug, created_at")
    .order("name");

  const typedNeighborhoods = (neighborhoods ?? []) as StaffNeighborhoodRow[];
  if (error || typedNeighborhoods.length === 0) return { data: [] as StaffNeighborhoodSummary[], error };
  const ids = typedNeighborhoods.map((neighborhood) => neighborhood.id);
  const [memberships, items] = await Promise.all([
    client.from("memberships").select("neighborhood_id").in("neighborhood_id", ids.length ? ids : [""]).eq("status", "active").is("deleted_at", null),
    client.from("items").select("neighborhood_id").in("neighborhood_id", ids.length ? ids : [""]).is("deleted_at", null),
  ]);
  const memberCounts = new Map<string, number>();
  const itemCounts = new Map<string, number>();
  const membershipRows = (memberships.data ?? []) as StaffMembershipCountRow[];
  const itemRows = (items.data ?? []) as StaffItemCountRow[];
  for (const row of membershipRows) memberCounts.set(row.neighborhood_id, (memberCounts.get(row.neighborhood_id) ?? 0) + 1);
  for (const row of itemRows) itemCounts.set(row.neighborhood_id, (itemCounts.get(row.neighborhood_id) ?? 0) + 1);

  return {
    data: typedNeighborhoods.map((neighborhood): StaffNeighborhoodSummary => ({
      ...neighborhood,
      memberCount: memberCounts.get(neighborhood.id) ?? 0,
      itemCount: itemCounts.get(neighborhood.id) ?? 0,
    })),
    error: memberships.error ?? items.error,
  };
}

/** Staff neighborhood detail data with soft-delete-aware membership and item reads. */
export async function getStaffNeighborhoodDetail(client: Client, slug: string) {
  const { data: neighborhood } = await client
    .from("neighborhoods")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();
  const typedNeighborhood = neighborhood as StaffNeighborhoodDetailRow | null;
  if (!typedNeighborhood) return null;

  const { data: memberships } = await client
    .from("memberships")
    .select("id, user_id, role, status, joined_at")
    .eq("neighborhood_id", typedNeighborhood.id)
    .is("deleted_at", null)
    .order("joined_at", { ascending: false });
  const membershipRows = (memberships ?? []) as StaffMembershipRow[];
  const userIds = membershipRows.map((membership) => membership.user_id);
  const { data: users } = await client
    .from("users")
    .select("id, name, email, avatar_url")
    .in("id", userIds.length ? userIds : [""]);
  const userRows = (users ?? []) as StaffUserRow[];
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  const members = membershipRows.map((membership) => {
    const user = usersById.get(membership.user_id);
    return {
      id: user?.id ?? membership.user_id,
      name: user?.name ?? null,
      email: user?.email ?? "unknown",
      avatar_url: user?.avatar_url ?? null,
      membership_id: membership.id,
      role: membership.role,
      status: membership.status,
      joined_at: membership.joined_at,
    };
  });
  const { count: itemCount } = await client
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("neighborhood_id", typedNeighborhood.id)
    .is("deleted_at", null);
  const adminMember = members.find((member) => member.role === "admin" && member.status === "active");
  return { neighborhood: typedNeighborhood, members, itemCount: itemCount ?? 0, adminUserId: adminMember?.id ?? null };
}
