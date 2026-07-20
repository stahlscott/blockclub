import { describe, expect, it } from "vitest";
import { resolveBorrowedItemsState } from "../borrowed-items-state";

describe("resolveBorrowedItemsState", () => {
  it("treats the expected no-membership fixture failure as a plain empty state", () => {
    const state = resolveBorrowedItemsState(null, true, 0);
    expect(state).toEqual({ loans: [], degraded: false });
  });

  it("marks failures degraded for users with active memberships", () => {
    const state = resolveBorrowedItemsState(null, true, 2);
    expect(state).toEqual({ loans: [], degraded: true });
  });

  it("never renders stale loans alongside an error", () => {
    const state = resolveBorrowedItemsState([{ id: "loan-1" }], true, 1);
    expect(state).toEqual({ loans: [], degraded: true });
  });

  it("passes loans through on success", () => {
    const loans = [{ id: "loan-1" }, { id: "loan-2" }];
    expect(resolveBorrowedItemsState(loans, false, 1)).toEqual({ loans, degraded: false });
  });

  it("normalizes a null success result to an empty list", () => {
    expect(resolveBorrowedItemsState(null, false, 1)).toEqual({ loans: [], degraded: false });
  });
});
