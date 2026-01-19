/**
 * Centralized queries for the loans table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LoanStatus } from "@blockclub/shared";
import type { LoanWithDetails, LoanWithItemAndOwner } from "./types";

type Client = SupabaseClient<Database>;

// Select for loan with item and borrower (owner's view)
const LOAN_WITH_DETAILS_SELECT = `
  *,
  item:items!loans_item_id_fkey(*),
  borrower:users!loans_borrower_id_fkey(id, name, avatar_url)
` as const;

// Select for loan with full item including owner (borrower's view)
const LOAN_WITH_ITEM_AND_OWNER_SELECT = `
  *,
  item:items!loans_item_id_fkey(*, owner:users!items_owner_id_fkey(id, name, avatar_url)),
  borrower:users!loans_borrower_id_fkey(id, name, avatar_url)
` as const;

/**
 * Get loans for items owned by a user (owner's loan management).
 * Filters by status, ordered by most recent first.
 */
export async function getLoansForOwner(
  client: Client,
  ownerId: string,
  options?: { status?: LoanStatus | LoanStatus[]; neighborhoodId?: string }
) {
  let query = client
    .from("loans")
    .select(LOAN_WITH_DETAILS_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Filter by item owner via join
  query = query.eq("item.owner_id", ownerId);

  if (options?.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    query = query.in("status", statuses);
  }

  if (options?.neighborhoodId) {
    query = query.eq("item.neighborhood_id", options.neighborhoodId);
  }

  const result = await query;
  return result as { data: LoanWithDetails[] | null; error: typeof result.error };
}

/**
 * Get loans where user is the borrower.
 * Includes full item with owner info.
 */
export async function getLoansForBorrower(
  client: Client,
  borrowerId: string,
  options?: { status?: LoanStatus | LoanStatus[] }
) {
  let query = client
    .from("loans")
    .select(LOAN_WITH_ITEM_AND_OWNER_SELECT)
    .eq("borrower_id", borrowerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (options?.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    query = query.in("status", statuses);
  }

  const result = await query;
  return result as {
    data: LoanWithItemAndOwner[] | null;
    error: typeof result.error;
  };
}

/**
 * Get a single loan by ID with full details.
 */
export async function getLoanById(client: Client, loanId: string) {
  const result = await client
    .from("loans")
    .select(LOAN_WITH_ITEM_AND_OWNER_SELECT)
    .eq("id", loanId)
    .is("deleted_at", null)
    .single();

  return result as {
    data: LoanWithItemAndOwner | null;
    error: typeof result.error;
  };
}

/**
 * Get active loan for a specific item (if any).
 * Used to check if an item is currently borrowed.
 */
export async function getActiveLoanForItem(client: Client, itemId: string) {
  const result = await client
    .from("loans")
    .select(LOAN_WITH_DETAILS_SELECT)
    .eq("item_id", itemId)
    .in("status", ["approved", "active"])
    .is("deleted_at", null)
    .single();

  return result as {
    data: LoanWithDetails | null;
    error: typeof result.error;
  };
}
