import { describe, it, expect } from "vitest";
import {
  getLoanStatusDisplay,
  getLoanStatusColor,
  canTransitionLoan,
  getNextLoanStatus,
  getAvailableLoanActions,
  isLoanPending,
  isLoanComplete,
} from "../loans";

describe("loans", () => {
  describe("getLoanStatusDisplay", () => {
    it("returns display text for each status", () => {
      expect(getLoanStatusDisplay("requested")).toBe("Requested");
      expect(getLoanStatusDisplay("approved")).toBe("Approved");
      expect(getLoanStatusDisplay("active")).toBe("Borrowed");
      expect(getLoanStatusDisplay("returned")).toBe("Returned");
      expect(getLoanStatusDisplay("cancelled")).toBe("Cancelled");
    });
  });

  describe("getLoanStatusColor", () => {
    it("returns warning for requested", () => {
      expect(getLoanStatusColor("requested")).toBe("warning");
    });

    it("returns info for approved and active", () => {
      expect(getLoanStatusColor("approved")).toBe("info");
      expect(getLoanStatusColor("active")).toBe("info");
    });

    it("returns success for returned", () => {
      expect(getLoanStatusColor("returned")).toBe("success");
    });

    it("returns neutral for cancelled", () => {
      expect(getLoanStatusColor("cancelled")).toBe("neutral");
    });
  });

  describe("canTransitionLoan", () => {
    describe("from requested", () => {
      it("can approve", () => {
        expect(canTransitionLoan("requested", "approve")).toBe(true);
      });

      it("can decline", () => {
        expect(canTransitionLoan("requested", "decline")).toBe(true);
      });

      it("can cancel", () => {
        expect(canTransitionLoan("requested", "cancel")).toBe(true);
      });

      it("cannot pickup or return", () => {
        expect(canTransitionLoan("requested", "pickup")).toBe(false);
        expect(canTransitionLoan("requested", "return")).toBe(false);
      });
    });

    describe("from approved", () => {
      it("can pickup", () => {
        expect(canTransitionLoan("approved", "pickup")).toBe(true);
      });

      it("can cancel", () => {
        expect(canTransitionLoan("approved", "cancel")).toBe(true);
      });

      it("cannot approve, decline, or return", () => {
        expect(canTransitionLoan("approved", "approve")).toBe(false);
        expect(canTransitionLoan("approved", "decline")).toBe(false);
        expect(canTransitionLoan("approved", "return")).toBe(false);
      });
    });

    describe("from active", () => {
      it("can return", () => {
        expect(canTransitionLoan("active", "return")).toBe(true);
      });

      it("cannot do anything else", () => {
        expect(canTransitionLoan("active", "approve")).toBe(false);
        expect(canTransitionLoan("active", "decline")).toBe(false);
        expect(canTransitionLoan("active", "cancel")).toBe(false);
        expect(canTransitionLoan("active", "pickup")).toBe(false);
      });
    });

    describe("from terminal states", () => {
      it("cannot transition from returned", () => {
        expect(canTransitionLoan("returned", "approve")).toBe(false);
        expect(canTransitionLoan("returned", "return")).toBe(false);
      });

      it("cannot transition from cancelled", () => {
        expect(canTransitionLoan("cancelled", "approve")).toBe(false);
        expect(canTransitionLoan("cancelled", "cancel")).toBe(false);
      });
    });
  });

  describe("getNextLoanStatus", () => {
    it("returns correct next status for valid transitions", () => {
      expect(getNextLoanStatus("requested", "approve")).toBe("approved");
      expect(getNextLoanStatus("requested", "decline")).toBe("cancelled");
      expect(getNextLoanStatus("approved", "pickup")).toBe("active");
      expect(getNextLoanStatus("active", "return")).toBe("returned");
    });

    it("returns null for invalid transitions", () => {
      expect(getNextLoanStatus("requested", "return")).toBeNull();
      expect(getNextLoanStatus("returned", "approve")).toBeNull();
    });
  });

  describe("getAvailableLoanActions", () => {
    describe("for requested status", () => {
      it("owner can approve or decline", () => {
        const actions = getAvailableLoanActions("requested", true, false);
        expect(actions).toContain("approve");
        expect(actions).toContain("decline");
        expect(actions).not.toContain("cancel");
      });

      it("borrower can cancel", () => {
        const actions = getAvailableLoanActions("requested", false, true);
        expect(actions).toContain("cancel");
        expect(actions).not.toContain("approve");
      });

      it("neither owner nor borrower gets empty array", () => {
        const actions = getAvailableLoanActions("requested", false, false);
        expect(actions).toHaveLength(0);
      });
    });

    describe("for approved status", () => {
      it("owner can confirm pickup", () => {
        const actions = getAvailableLoanActions("approved", true, false);
        expect(actions).toContain("pickup");
      });

      it("borrower can cancel", () => {
        const actions = getAvailableLoanActions("approved", false, true);
        expect(actions).toContain("cancel");
      });
    });

    describe("for active status", () => {
      it("owner can mark returned", () => {
        const actions = getAvailableLoanActions("active", true, false);
        expect(actions).toContain("return");
      });

      it("borrower has no actions", () => {
        const actions = getAvailableLoanActions("active", false, true);
        expect(actions).toHaveLength(0);
      });
    });

    describe("for terminal states", () => {
      it("no actions for returned", () => {
        expect(getAvailableLoanActions("returned", true, false)).toHaveLength(0);
        expect(getAvailableLoanActions("returned", false, true)).toHaveLength(0);
      });

      it("no actions for cancelled", () => {
        expect(getAvailableLoanActions("cancelled", true, false)).toHaveLength(0);
        expect(getAvailableLoanActions("cancelled", false, true)).toHaveLength(0);
      });
    });
  });

  describe("isLoanPending", () => {
    it("returns true for requested and approved", () => {
      expect(isLoanPending("requested")).toBe(true);
      expect(isLoanPending("approved")).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(isLoanPending("active")).toBe(false);
      expect(isLoanPending("returned")).toBe(false);
      expect(isLoanPending("cancelled")).toBe(false);
    });
  });

  describe("isLoanComplete", () => {
    it("returns true for returned and cancelled", () => {
      expect(isLoanComplete("returned")).toBe(true);
      expect(isLoanComplete("cancelled")).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(isLoanComplete("requested")).toBe(false);
      expect(isLoanComplete("approved")).toBe(false);
      expect(isLoanComplete("active")).toBe(false);
    });
  });
});
