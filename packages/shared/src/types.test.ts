import { describe, it, expect } from "vitest";
import type {
  MembershipRole,
  MembershipStatus,
  ItemCategory,
  ItemAvailability,
  LoanStatus,
  User,
  Neighborhood,
  Membership,
  Item,
  Loan,
} from "./types";

/**
 * Type assertion tests for the shared types package.
 * These tests verify that type definitions compile correctly
 * and exported constants match expected values.
 */

describe("Type exports", () => {
  it("exports MembershipRole type with correct values", () => {
    const roles: MembershipRole[] = ["admin", "member"];
    expect(roles).toHaveLength(2);
    expect(roles).toContain("admin");
    expect(roles).toContain("member");
  });

  it("exports MembershipStatus type with correct values", () => {
    const statuses: MembershipStatus[] = ["pending", "active", "inactive", "moved_out"];
    expect(statuses).toHaveLength(4);
    expect(statuses).toContain("pending");
    expect(statuses).toContain("active");
  });

  it("exports ItemCategory type with correct values", () => {
    const categories: ItemCategory[] = [
      "tools",
      "kitchen",
      "outdoor",
      "sports",
      "games",
      "electronics",
      "books",
      "baby",
      "travel",
      "other",
    ];
    expect(categories).toHaveLength(10);
    expect(categories).toContain("tools");
    expect(categories).toContain("other");
  });

  it("exports ItemAvailability type with correct values", () => {
    const availabilities: ItemAvailability[] = ["available", "borrowed", "unavailable"];
    expect(availabilities).toHaveLength(3);
  });

  it("exports LoanStatus type with correct values", () => {
    const statuses: LoanStatus[] = [
      "requested",
      "approved",
      "active",
      "returned",
      "cancelled",
    ];
    expect(statuses).toHaveLength(5);
  });
});

describe("Interface structure", () => {
  it("User interface has required fields", () => {
    // Type-level check - if this compiles, the interface is correct
    const user: User = {
      id: "test-id",
      email: "test@example.com",
      name: "Test User",
      avatar_url: null,
      bio: null,
      phone: null,
      phones: null,
      emails: null,
      primary_neighborhood_id: null,
      address: null,
      unit: null,
      move_in_year: null,
      children: null,
      pets: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(user.id).toBe("test-id");
    expect(user.email).toBe("test@example.com");
  });

  it("Item interface has required fields", () => {
    const item: Item = {
      id: "item-id",
      neighborhood_id: "neighborhood-id",
      owner_id: "owner-id",
      name: "Test Item",
      description: null,
      category: "tools",
      photo_urls: [],
      availability: "available",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    expect(item.name).toBe("Test Item");
    expect(item.category).toBe("tools");
  });
});
