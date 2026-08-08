/**
 * Centralized queries for the posts table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@blockclub/shared";
import type { PostWithAuthor, PostReactionQuery } from "./types";

type Client = SupabaseClient<Database>;

// Standard select for posts with author
const POST_WITH_AUTHOR_SELECT = `
  *,
  author:users!posts_author_id_fkey(id, name, avatar_url),
  editor:users!edited_by(id, name, avatar_url)
` as const;

/**
 * Get all posts in a neighborhood.
 * Pinned posts first, then by newest.
 */
export async function getPostsByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: { limit?: number; includePinned?: boolean }
) {
  let query = client
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const result = await query;
  return result as { data: PostWithAuthor[] | null; error: typeof result.error };
}

/**
 * Get a single post by ID.
 */
export async function getPostById(client: Client, postId: string, neighborhoodId?: string) {
  let query = client
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("id", postId)
    .is("deleted_at", null);

  if (neighborhoodId) {
    query = query.eq("neighborhood_id", neighborhoodId);
  }

  const result = await query.single();

  return result as { data: PostWithAuthor | null; error: typeof result.error };
}

/**
 * Get posts by a specific author in a neighborhood.
 */
export async function getPostsByAuthor(
  client: Client,
  neighborhoodId: string,
  authorId: string
) {
  const result = await client
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return result as { data: PostWithAuthor[] | null; error: typeof result.error };
}

/** Get the newest posts for the dashboard. */
export async function getRecentPosts(client: Client, neighborhoodId: string, limit = 5) {
  return getPostsByNeighborhood(client, neighborhoodId, { limit });
}

/** Get reactions for a set of posts, returning no rows for an empty set. */
export async function getPostReactions(client: Client, postIds: string[]) {
  if (postIds.length === 0) {
    return { data: [] as PostReactionQuery[], error: null };
  }

  const result = await client
    .from("post_reactions")
    .select("*")
    .in("post_id", postIds);

  return result as { data: PostReactionQuery[] | null; error: typeof result.error };
}

/** Count visible posts in a neighborhood. */
export async function countPosts(client: Client, neighborhoodId: string) {
  const result = await client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null);

  return result.count ?? 0;
}
