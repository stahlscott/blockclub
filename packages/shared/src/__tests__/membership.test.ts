import { describe, expect, it } from "vitest";
import { getMembershipStatusCopy } from "../membership";

describe("membership status copy", () => {
  it("maps every database status to human copy and a next step", () => {
    expect(getMembershipStatusCopy("pending")).toEqual({
      label: "Waiting for approval",
      nextStep: "A neighborhood admin needs to approve your request.",
    });
    expect(getMembershipStatusCopy("active").label).toBe("Active member");
    expect(getMembershipStatusCopy("inactive").nextStep).toContain("restore");
    expect(getMembershipStatusCopy("moved_out").nextStep).toContain("rejoin");
  });
});
