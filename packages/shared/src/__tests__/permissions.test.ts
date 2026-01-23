import { describe, it, expect } from "vitest";
import {
  isAdmin,
  isActiveMember,
  canManageMembers,
  canModeratePosts,
  isItemOwner,
  canEditItem,
  canDeleteItem,
  canRequestLoan,
  canManageLoanRequest,
  canCancelLoan,
  canMarkLoanReturned,
  isPostAuthor,
  canEditPost,
  canDeletePost,
  canPinPost,
} from "../permissions";
import type { Membership, Item, Loan, Post } from "../types";

// Test fixtures
const adminMembership: Membership = {
  id: "m1",
  user_id: "u1",
  neighborhood_id: "n1",
  role: "admin",
  status: "active",
  joined_at: "2024-01-01",
  deleted_at: null,
};

const memberMembership: Membership = {
  id: "m2",
  user_id: "u2",
  neighborhood_id: "n1",
  role: "member",
  status: "active",
  joined_at: "2024-01-01",
  deleted_at: null,
};

const pendingMembership: Membership = {
  id: "m3",
  user_id: "u3",
  neighborhood_id: "n1",
  role: "member",
  status: "pending",
  joined_at: "2024-01-01",
  deleted_at: null,
};

const item: Item = {
  id: "i1",
  neighborhood_id: "n1",
  owner_id: "owner123",
  name: "Drill",
  description: null,
  category: "tools",
  photo_urls: [],
  availability: "available",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  deleted_at: null,
};

const borrowedItem: Item = {
  ...item,
  availability: "borrowed",
};

const requestedLoan: Loan = {
  id: "l1",
  item_id: "i1",
  borrower_id: "borrower123",
  status: "requested",
  requested_at: "2024-01-01",
  start_date: null,
  due_date: null,
  returned_at: null,
  notes: null,
  deleted_at: null,
};

const activeLoan: Loan = {
  ...requestedLoan,
  status: "active",
};

const approvedLoan: Loan = {
  ...requestedLoan,
  status: "approved",
};

const post: Post = {
  id: "p1",
  neighborhood_id: "n1",
  author_id: "author123",
  content: "Hello neighbors!",
  image_url: null,
  is_pinned: false,
  expires_at: null,
  edited_at: null,
  edited_by: null,
  created_at: "2024-01-01",
  deleted_at: null,
};

describe("permissions", () => {
  describe("membership permissions", () => {
    describe("isAdmin", () => {
      it("returns true for active admin", () => {
        expect(isAdmin(adminMembership)).toBe(true);
      });

      it("returns false for active member", () => {
        expect(isAdmin(memberMembership)).toBe(false);
      });

      it("returns false for pending admin", () => {
        const pendingAdmin = { ...adminMembership, status: "pending" as const };
        expect(isAdmin(pendingAdmin)).toBe(false);
      });

      it("returns false for null/undefined", () => {
        expect(isAdmin(null)).toBe(false);
        expect(isAdmin(undefined)).toBe(false);
      });
    });

    describe("isActiveMember", () => {
      it("returns true for active members", () => {
        expect(isActiveMember(adminMembership)).toBe(true);
        expect(isActiveMember(memberMembership)).toBe(true);
      });

      it("returns false for pending members", () => {
        expect(isActiveMember(pendingMembership)).toBe(false);
      });

      it("returns false for null/undefined", () => {
        expect(isActiveMember(null)).toBe(false);
        expect(isActiveMember(undefined)).toBe(false);
      });
    });

    describe("canManageMembers", () => {
      it("returns true for admin", () => {
        expect(canManageMembers(adminMembership)).toBe(true);
      });

      it("returns false for member", () => {
        expect(canManageMembers(memberMembership)).toBe(false);
      });
    });

    describe("canModeratePosts", () => {
      it("returns true for admin", () => {
        expect(canModeratePosts(adminMembership)).toBe(true);
      });

      it("returns false for member", () => {
        expect(canModeratePosts(memberMembership)).toBe(false);
      });
    });
  });

  describe("item permissions", () => {
    describe("isItemOwner", () => {
      it("returns true for owner", () => {
        expect(isItemOwner("owner123", item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(isItemOwner("other", item)).toBe(false);
      });
    });

    describe("canEditItem", () => {
      it("returns true for owner", () => {
        expect(canEditItem("owner123", item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(canEditItem("other", item)).toBe(false);
      });

      it("returns false for admin who is not owner", () => {
        expect(canEditItem("admin", item)).toBe(false);
      });
    });

    describe("canDeleteItem", () => {
      it("returns true for owner", () => {
        expect(canDeleteItem("owner123", item, memberMembership)).toBe(true);
      });

      it("returns true for admin", () => {
        expect(canDeleteItem("admin", item, adminMembership)).toBe(true);
      });

      it("returns false for non-owner non-admin", () => {
        expect(canDeleteItem("other", item, memberMembership)).toBe(false);
      });
    });

    describe("canRequestLoan", () => {
      it("returns true for non-owner on available item", () => {
        expect(canRequestLoan("other", item)).toBe(true);
      });

      it("returns false for owner", () => {
        expect(canRequestLoan("owner123", item)).toBe(false);
      });

      it("returns false for borrowed item", () => {
        expect(canRequestLoan("other", borrowedItem)).toBe(false);
      });
    });
  });

  describe("loan permissions", () => {
    describe("canManageLoanRequest", () => {
      it("returns true for owner on requested loan", () => {
        expect(canManageLoanRequest("owner123", requestedLoan, item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(canManageLoanRequest("other", requestedLoan, item)).toBe(false);
      });

      it("returns false for active loan", () => {
        expect(canManageLoanRequest("owner123", activeLoan, item)).toBe(false);
      });
    });

    describe("canCancelLoan", () => {
      it("returns true for borrower on requested loan", () => {
        expect(canCancelLoan("borrower123", requestedLoan)).toBe(true);
      });

      it("returns true for borrower on approved loan", () => {
        expect(canCancelLoan("borrower123", approvedLoan)).toBe(true);
      });

      it("returns false for non-borrower", () => {
        expect(canCancelLoan("other", requestedLoan)).toBe(false);
      });

      it("returns false for active loan", () => {
        expect(canCancelLoan("borrower123", activeLoan)).toBe(false);
      });
    });

    describe("canMarkLoanReturned", () => {
      it("returns true for owner on active loan", () => {
        expect(canMarkLoanReturned("owner123", activeLoan, item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(canMarkLoanReturned("other", activeLoan, item)).toBe(false);
      });

      it("returns false for non-active loan", () => {
        expect(canMarkLoanReturned("owner123", requestedLoan, item)).toBe(false);
      });
    });
  });

  describe("post permissions", () => {
    describe("isPostAuthor", () => {
      it("returns true for author", () => {
        expect(isPostAuthor("author123", post)).toBe(true);
      });

      it("returns false for non-author", () => {
        expect(isPostAuthor("other", post)).toBe(false);
      });
    });

    describe("canEditPost", () => {
      it("returns true for author", () => {
        expect(canEditPost("author123", post)).toBe(true);
      });

      it("returns false for non-author", () => {
        expect(canEditPost("other", post)).toBe(false);
      });
    });

    describe("canDeletePost", () => {
      it("returns true for author", () => {
        expect(canDeletePost("author123", post, memberMembership)).toBe(true);
      });

      it("returns true for admin", () => {
        expect(canDeletePost("admin", post, adminMembership)).toBe(true);
      });

      it("returns false for non-author non-admin", () => {
        expect(canDeletePost("other", post, memberMembership)).toBe(false);
      });
    });

    describe("canPinPost", () => {
      it("returns true for admin", () => {
        expect(canPinPost(adminMembership)).toBe(true);
      });

      it("returns false for member", () => {
        expect(canPinPost(memberMembership)).toBe(false);
      });
    });
  });
});
