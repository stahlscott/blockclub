/**
 * Centralized query layer for Supabase.
 *
 * Import query functions from here instead of writing inline queries.
 * All queries handle soft deletes, standard joins, and default ordering.
 *
 * Usage:
 *   import { getItemsByNeighborhood } from "@/lib/queries";
 *   const { data, error } = await getItemsByNeighborhood(supabase, neighborhoodId);
 */

export * from "./types";
export * from "./items";
export * from "./memberships";
export * from "./posts";
export * from "./loans";

// Query modules will be added here as they're created:
// export * from "./users";
// export * from "./neighborhoods";
