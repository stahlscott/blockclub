import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Data fetching functions for the dashboard.
 * Extracted for parallel execution and future caching with "use cache" directive.
 *
 * All functions accept an optional Supabase client parameter to support impersonation.
 * When impersonating, the admin client should be passed to bypass RLS.
 *
 * TODO: Enable caching when ready to adopt Suspense throughout the app:
 * 1. Enable cacheComponents: true in next.config.js
 * 2. Add "use cache" directive at top of this file
 * 3. Add cacheTag() calls to each function for invalidation
 * 4. Wrap dynamic routes in Suspense boundaries
 * 5. Add revalidateTag() calls to relevant server actions (createItem, createPost, etc.)
 */

export async function getRecentItems(neighborhoodId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  const { data: items } = await supabase
    .from("items")
    .select("*, owner:users!items_owner_id_fkey(name)")
    .eq("neighborhood_id", neighborhoodId)
    .eq("availability", "available")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);

  return items || [];
}

export async function getRecentMembers(neighborhoodId: string, currentUserId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  const { data: members } = await supabase
    .from("memberships")
    .select(
      `
      *,
      user:users!memberships_user_id_fkey(id, name, email, avatar_url, address)
    `
    )
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "active")
    .order("joined_at", { ascending: false })
    .limit(6);

  // Filter out staff admin users and current user from the recent members list
  return (members || []).filter(
    (m: any) => !isStaffAdmin(m.user?.email) && m.user_id !== currentUserId
  );
}

export async function getRecentPosts(neighborhoodId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  const { data: postsData } = await supabase
    .from("posts")
    .select("*, author:users!author_id(id, name, avatar_url)")
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  return postsData || [];
}

export async function getPendingMemberRequestsCount(neighborhoodId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  const { count } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "pending");

  return count || 0;
}

/**
 * Dashboard stat counts - for stat cards display
 */
export async function getDashboardStats(neighborhoodId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  // Fetch all counts in parallel
  const [postsResult, itemsResult, membersResult] = await Promise.all([
    // Active posts (not deleted)
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhoodId)
      .is("deleted_at", null),
    // Available items (not deleted, available status)
    supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhoodId)
      .eq("availability", "available")
      .is("deleted_at", null),
    // Active members
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhoodId)
      .eq("status", "active"),
  ]);

  return {
    postsCount: postsResult.count || 0,
    itemsCount: itemsResult.count || 0,
    neighborsCount: membersResult.count || 0,
  };
}
