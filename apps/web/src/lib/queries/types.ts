/**
 * Type-safe query result types for Supabase.
 *
 * These types match the actual runtime data shape from Supabase queries
 * with joins. Use these instead of `as unknown as T` double-casts.
 */

import type {
  Neighborhood,
  Membership,
  Item,
  Loan,
  Post,
  NotificationPreferences,
} from "@blockclub/shared";

// ============================================================================
// USER QUERY TYPES
// ============================================================================

/** User with minimal fields for display (avatars, names in lists) */
export interface UserSummary {
  id: string;
  name: string;
  avatar_url: string | null;
}

/** User with contact info for directory/profiles */
export interface UserWithContact extends UserSummary {
  email: string;
  phones: Array<{ label: string; number: string }> | null;
}

/** User with notification preferences */
export interface UserWithPreferences extends UserWithContact {
  notification_preferences: NotificationPreferences | null;
}

// ============================================================================
// MEMBERSHIP QUERY TYPES
// ============================================================================

/** Membership with user summary (for member lists) */
export interface MembershipWithUser extends Membership {
  user: UserWithContact;
}

/** Membership with neighborhood (for user's neighborhood list) */
export interface MembershipWithNeighborhood extends Membership {
  neighborhood: Neighborhood;
}

/** Membership with both user and neighborhood */
export interface MembershipFull extends Membership {
  user: UserWithContact;
  neighborhood: Neighborhood;
}

// ============================================================================
// ITEM QUERY TYPES
// ============================================================================

/** Item with owner info (standard library view) */
export interface ItemWithOwner extends Item {
  owner: UserSummary;
}

// ============================================================================
// LOAN QUERY TYPES
// ============================================================================

/** Loan with item and borrower (for owner's loan management) */
export interface LoanWithDetails extends Loan {
  item: Item;
  borrower: UserSummary;
}

/** Loan with full item including owner (for borrower's view) */
export interface LoanWithItemAndOwner extends Loan {
  item: ItemWithOwner;
  borrower: UserSummary;
}

// ============================================================================
// POST QUERY TYPES
// ============================================================================

/** Post with author info */
export interface PostWithAuthor extends Post {
  author: UserSummary;
}

// ============================================================================
// NOTIFICATION QUERY TYPES (moved from lib/supabase/queries.ts)
// ============================================================================

/** Shape for loan requested notification query */
export interface LoanRequestedRow {
  id: string;
  notes: string | null;
  borrower: { id: string; name: string };
  item: {
    id: string;
    name: string;
    owner_id: string;
    neighborhood: { slug: string };
  };
}

/** Shape for loan approved/declined notification query */
export interface LoanWithBorrowerRow {
  id: string;
  due_date: string | null;
  borrower: {
    id: string;
    name: string;
    email: string;
    notification_preferences: NotificationPreferences | null;
  };
  item: {
    id: string;
    name: string;
    owner: { id: string; name: string };
    neighborhood: { slug: string };
  };
}

/** Shape for loan returned notification query */
export interface LoanReturnedRow {
  id: string;
  borrower: { id: string; name: string };
  item: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      email: string;
      notification_preferences: NotificationPreferences | null;
    };
    neighborhood: { slug: string };
  };
}

/** Shape for owner query with notification preferences */
export interface OwnerRow {
  id: string;
  name: string;
  email: string;
  notification_preferences: NotificationPreferences | null;
}

// ============================================================================
// TYPE NARROWING HELPERS
// ============================================================================

/**
 * Type guard to filter out null neighborhoods from membership results.
 */
export function hasNeighborhood<
  T extends { neighborhood: { id: string; name: string; slug: string } | null },
>(membership: T): membership is T & { neighborhood: NonNullable<T["neighborhood"]> } {
  return membership.neighborhood !== null;
}

/**
 * Type guard for notification preferences.
 */
export function isNotificationPreferences(
  value: unknown
): value is NotificationPreferences {
  if (typeof value !== "object" || value === null) return false;
  const prefs = value as Record<string, unknown>;
  return (
    typeof prefs.version === "number" &&
    typeof prefs.email_enabled === "boolean" &&
    typeof prefs.channels === "object"
  );
}
