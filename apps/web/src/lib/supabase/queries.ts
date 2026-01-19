/**
 * Type-safe query definitions for Supabase.
 *
 * Instead of manually defining interfaces for nested joins and then using
 * `as unknown as Type` casts, we define explicit types here that match
 * the actual runtime data shape from Supabase queries.
 *
 * These types are safer than `as unknown as T` because:
 * 1. They're defined once and reused consistently
 * 2. They document the expected query shape explicitly
 * 3. Changes to the types will surface compilation errors at all usage sites
 */

import type { NotificationPreferences } from "@blockclub/shared";

// ============================================================================
// LOAN NOTIFICATION QUERY TYPES
// ============================================================================

/**
 * Shape returned by loan requested notification query.
 * Query: loans.select(id, notes, borrower:users(id, name), item:items(id, name, owner_id, neighborhood:neighborhoods(slug)))
 */
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

/**
 * Shape returned by loan approved/declined notification query.
 * Query: loans.select(id, due_date, borrower:users(id, name, email, notification_preferences),
 *                     item:items(id, name, owner:users(id, name), neighborhood:neighborhoods(slug)))
 */
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

/**
 * Shape returned by loan returned notification query.
 * Query: loans.select(id, borrower:users(id, name),
 *                     item:items(id, name, owner:users(id, name, email, notification_preferences), neighborhood:neighborhoods(slug)))
 */
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

/**
 * Shape returned by owner query with notification preferences.
 * Query: users.select(id, name, email, notification_preferences)
 */
export interface OwnerRow {
  id: string;
  name: string;
  email: string;
  notification_preferences: NotificationPreferences | null;
}

// ============================================================================
// MEMBERSHIP QUERY TYPES
// ============================================================================

/**
 * Shape returned by membership with neighborhood query.
 * Query: memberships.select(id, role, neighborhood:neighborhoods(id, name, slug))
 */
export interface MembershipWithNeighborhoodRow {
  id: string;
  role: string;
  neighborhood: { id: string; name: string; slug: string } | null;
}

// ============================================================================
// TYPE NARROWING HELPERS
// ============================================================================

/**
 * Type guard to filter out null neighborhoods from membership results.
 * Use with .filter() to narrow the array type.
 *
 * Example:
 *   const memberships = data.filter(hasNeighborhood);
 *   // memberships is now correctly typed with non-null neighborhood
 */
export function hasNeighborhood<
  T extends { neighborhood: { id: string; name: string; slug: string } | null },
>(membership: T): membership is T & { neighborhood: NonNullable<T["neighborhood"]> } {
  return membership.neighborhood !== null;
}

/**
 * Type guard for notification preferences.
 * Supabase returns Json type, this narrows it to NotificationPreferences.
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
