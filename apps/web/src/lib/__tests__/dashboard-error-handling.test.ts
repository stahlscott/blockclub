import { describe, expect, it } from "vitest";

function shouldLogBorrowedItemsError(hasBorrowedItemsError: boolean, activeMembershipCount: number): boolean {
  return hasBorrowedItemsError && activeMembershipCount > 0;
}

describe("dashboard borrowed-item error logging", () => {
  it("does not log the expected no-membership fixture state", () => {
    expect(shouldLogBorrowedItemsError(true, 0)).toBe(false);
  });

  it("logs errors for users with active neighborhood context", () => {
    expect(shouldLogBorrowedItemsError(true, 1)).toBe(true);
  });

  it("does not log when the query succeeds", () => {
    expect(shouldLogBorrowedItemsError(false, 1)).toBe(false);
  });
});
