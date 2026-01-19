/**
 * Centralized queries for the items table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ItemCategory } from "@blockclub/shared";
import type { ItemWithOwner } from "./types";

type Client = SupabaseClient<Database>;

// Standard select for items with owner join
// Note: FK hint required because items has multiple user references
const ITEM_WITH_OWNER_SELECT = `
  *,
  owner:users!items_owner_id_fkey(id, name, avatar_url)
` as const;

/**
 * Get all items in a neighborhood.
 * Default: only available items, ordered by newest first.
 */
export async function getItemsByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: {
    category?: ItemCategory;
    includeUnavailable?: boolean;
    limit?: number;
  }
) {
  let query = client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!options?.includeUnavailable) {
    query = query.in("availability", ["available", "borrowed"]);
  }

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const result = await query;
  return result as { data: ItemWithOwner[] | null; error: typeof result.error };
}

/**
 * Get a single item by ID.
 */
export async function getItemById(client: Client, itemId: string) {
  const result = await client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("id", itemId)
    .is("deleted_at", null)
    .single();

  return result as { data: ItemWithOwner | null; error: typeof result.error };
}

/**
 * Get all items owned by a specific user in a neighborhood.
 */
export async function getItemsByOwner(
  client: Client,
  neighborhoodId: string,
  ownerId: string,
  options?: { includeUnavailable?: boolean }
) {
  let query = client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!options?.includeUnavailable) {
    query = query.in("availability", ["available", "borrowed"]);
  }

  const result = await query;
  return result as { data: ItemWithOwner[] | null; error: typeof result.error };
}
