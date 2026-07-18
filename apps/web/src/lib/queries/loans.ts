/**
 * Centralized queries for the loans table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LoanStatus } from "@blockclub/shared";
import type {
  ActiveLoanSummary,
  LoanNotificationQuery,
  LoanWithDashboardDetails,
  LoanWithDetails,
  LoanWithItemAndOwner,
} from "./types";

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

/** Get the loan row used by the requested notification. */
export async function getLoanRequestedNotification(client: Client, loanId: string) {
  const result = await client
    .from("loans")
    .select("id, notes, borrower:users!loans_borrower_id_fkey(id, name), item:items!loans_item_id_fkey(id, name, owner_id, neighborhood:neighborhoods!items_neighborhood_id_fkey(slug))")
    .eq("id", loanId)
    .is("deleted_at", null)
    .single();
  return result as { data: LoanNotificationQuery | null; error: typeof result.error };
}

/** Get the loan row used by approved/declined notifications. */
export async function getLoanDecisionNotification(client: Client, loanId: string) {
  const result = await client
    .from("loans")
    .select("id, due_date, borrower:users!loans_borrower_id_fkey(id, name, email, notification_preferences), item:items!loans_item_id_fkey(id, name, owner:users!items_owner_id_fkey(id, name), neighborhood:neighborhoods!items_neighborhood_id_fkey(slug))")
    .eq("id", loanId)
    .is("deleted_at", null)
    .single();
  return result as { data: LoanNotificationQuery | null; error: typeof result.error };
}

/** Get the loan row used by returned notifications. */
export async function getLoanReturnedNotification(client: Client, loanId: string) {
  const result = await client
    .from("loans")
    .select("id, borrower:users!loans_borrower_id_fkey(id, name), item:items!loans_item_id_fkey(id, name, owner:users!items_owner_id_fkey(id, name, email, notification_preferences), neighborhood:neighborhoods!items_neighborhood_id_fkey(slug))")
    .eq("id", loanId)
    .is("deleted_at", null)
    .single();
  return result as { data: LoanNotificationQuery | null; error: typeof result.error };
}

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
  options?: { status?: LoanStatus | LoanStatus[]; neighborhoodId?: string }
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

  if (options?.neighborhoodId) {
    query = query.eq("item.neighborhood_id", options.neighborhoodId);
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
export async function getActiveLoanForItem(
  client: Client,
  itemId: string,
  neighborhoodId?: string,
) {
  let query = client
    .from("loans")
    .select(LOAN_WITH_DETAILS_SELECT)
    .eq("item_id", itemId)
    .in("status", ["requested", "approved", "active"])
    .is("deleted_at", null);

  if (neighborhoodId) {
    query = query.eq("item.neighborhood_id", neighborhoodId);
  }

  const result = await query.maybeSingle();

  return result as {
    data: LoanWithDetails | null;
    error: typeof result.error;
  };
}

/** Get a lightweight live-loan row for item deletion/availability checks. */
export async function getActiveLoanSummaryForItem(client: Client, itemId: string) {
  const result = await client
    .from("loans")
    .select("id")
    .eq("item_id", itemId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  return result as { data: ActiveLoanSummary | null; error: typeof result.error };
}

/** Get a borrower's live request for one item within a neighborhood. */
export async function getBorrowerLoanForItem(
  client: Client,
  itemId: string,
  borrowerId: string,
  neighborhoodId?: string,
) {
  let query = client
    .from("loans")
    .select(LOAN_WITH_ITEM_AND_OWNER_SELECT)
    .eq("item_id", itemId)
    .eq("borrower_id", borrowerId)
    .in("status", ["requested", "approved", "active"])
    .is("deleted_at", null);

  if (neighborhoodId) {
    query = query.eq("item.neighborhood_id", neighborhoodId);
  }

  const result = await query.maybeSingle();
  return result as {
    data: LoanWithItemAndOwner | null;
    error: typeof result.error;
  };
}

/** Get pending requests for an owner's items, with neighborhood and borrower display data. */
export async function getPendingLoanRequestsForItems(client: Client, itemIds: string[]) {
  if (itemIds.length === 0) {
    return { data: [], error: null };
  }

  const result = await client
    .from("loans")
    .select(`
      *,
      item:items!loans_item_id_fkey(id, name, neighborhood_id, neighborhood:neighborhoods(slug)),
      borrower:users!loans_borrower_id_fkey(id, name, avatar_url)
    `)
    .in("item_id", itemIds)
    .eq("status", "requested")
    .is("deleted_at", null)
    .order("requested_at", { ascending: true });

  return result as {
    data: LoanWithDashboardDetails[] | null;
    error: typeof result.error;
  };
}

/** Get a user's active loans in a neighborhood, preserving tenant scope through the item join. */
export async function getActiveLoansForBorrower(
  client: Client,
  borrowerId: string,
  neighborhoodId?: string,
) {
  return getLoansForBorrower(client, borrowerId, {
    status: "active",
    neighborhoodId,
  });
}

/** Get live reservations for an owner's items. */
export async function getReservationsForItems(client: Client, itemIds: string[]) {
  if (itemIds.length === 0) {
    return { data: [], error: null };
  }

  const result = await client
    .from("loans")
    .select("item_id, status")
    .in("item_id", itemIds)
    .eq("status", "requested")
    .is("deleted_at", null);

  return result as {
    data: Array<{ item_id: string; status: LoanStatus }> | null;
    error: typeof result.error;
  };
}
