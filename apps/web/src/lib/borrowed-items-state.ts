/**
 * Resolves the dashboard borrowed-items section from the loan query result.
 *
 * The borrowed-items query is expected to fail for users with no active
 * memberships (the default E2E fixture state), so that case renders as a
 * plain empty section. A failure for a user WITH active memberships is a
 * genuine degradation: it must be logged and surfaced, never rendered as an
 * empty state the user could mistake for "nothing borrowed".
 */
export interface BorrowedItemsState<T> {
  loans: T[];
  degraded: boolean;
}

export function resolveBorrowedItemsState<T>(
  loans: T[] | null,
  hasError: boolean,
  activeMembershipCount: number,
): BorrowedItemsState<T> {
  return {
    loans: hasError ? [] : loans ?? [],
    degraded: hasError && activeMembershipCount > 0,
  };
}
