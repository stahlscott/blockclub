import { describe, expect, it } from "vitest";
import { hasAffectedRow, requireAffectedRow } from "../mutation-results";

describe("mutation results", () => {
  it("mutation_result_requires_affected_row", () => {
    expect(hasAffectedRow(null)).toBe(false);
    expect(hasAffectedRow([])).toBe(false);
    expect(hasAffectedRow({ id: "loan-1" })).toBe(true);
    expect(requireAffectedRow([{ id: "loan-1" }], "approve loan")).toEqual({
      data: { id: "loan-1" },
      affected: true,
    });
  });

  it("rejects zero-row results", () => {
    expect(() => requireAffectedRow([], "approve loan")).toThrow("approve loan did not affect a row");
    expect(() => requireAffectedRow(null, "approve loan")).toThrow("approve loan did not affect a row");
  });
});
