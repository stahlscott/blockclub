/**
 * Centralized queries for the posts table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@blockclub/shared";
import type { PostWithAuthor } from "./types";

type Client = SupabaseClient<Database>;

// Standard select for posts with author
const POST_WITH_AUTHOR_SELECT = `
  *,
  author:users!posts_author_id_fkey(id, name, avatar_url)
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
export async function getPostById(client: Client, postId: string) {
  const result = await client
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("id", postId)
    .is("deleted_at", null)
    .single();

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
