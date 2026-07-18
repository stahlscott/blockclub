import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countActiveMemberships,
  countAvailableItems,
  countPendingMemberships,
  countPosts,
  getItemsByNeighborhood,
  getPostsByNeighborhood,
  getRecentMembers as getMembers,
} from "@/lib/queries";

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

  const { data: items } = await getItemsByNeighborhood(supabase, neighborhoodId, {
    limit: 8,
  });

  return items || [];
}

export async function getRecentMembers(neighborhoodId: string, currentUserId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  const { data: members } = await getMembers(supabase, neighborhoodId, 6);

  // Filter out staff admin users and current user from the recent members list
  return (members || []).filter(
    (m) => !isStaffAdmin(m.user?.email) && m.user_id !== currentUserId
  );
}

export async function getRecentPosts(neighborhoodId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  const { data: postsData } = await getPostsByNeighborhood(supabase, neighborhoodId, {
    limit: 5,
  });

  return postsData || [];
}

export async function getPendingMemberRequestsCount(neighborhoodId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  return countPendingMemberships(supabase, neighborhoodId);
}

/**
 * Dashboard stat counts - for stat cards display
 */
export async function getDashboardStats(neighborhoodId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();

  const [postsCount, itemsCount, neighborsCount] = await Promise.all([
    countPosts(supabase, neighborhoodId),
    countAvailableItems(supabase, neighborhoodId),
    countActiveMemberships(supabase, neighborhoodId),
  ]);

  return {
    postsCount,
    itemsCount,
    neighborsCount,
  };
}
