/**
 * Centralized queries for the neighborhoods table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Neighborhood } from "@blockclub/shared";

type Client = SupabaseClient<Database>;

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
