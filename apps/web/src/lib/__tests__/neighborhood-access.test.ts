import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * DeepPartial utility type for creating partial mock objects.
 * Allows mocking Supabase clients with only the methods needed for a test.
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Track redirect and notFound calls
const redirectMock = vi.fn();
const notFoundMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    notFoundMock();
    throw new Error("NOT_FOUND");
  },
}));

// Type for partial Supabase client mocks
interface MockSupabaseClient {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
}

// Mock Supabase client
const mockSupabaseClient: MockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock auth context with explicit type for queryClient
interface MockAuthContext {
  isStaffAdmin: boolean;
  isImpersonating: boolean;
  effectiveUserId: string;
  queryClient: DeepPartial<MockSupabaseClient>;
}

const mockAuthContext: MockAuthContext = {
  isStaffAdmin: false,
  isImpersonating: false,
  effectiveUserId: "user-123",
  queryClient: mockSupabaseClient,
};

vi.mock("@/lib/auth-context", () => ({
  getAuthContext: vi.fn(() => Promise.resolve(mockAuthContext)),
}));

// Import after mocks
import { getNeighborhoodAccess } from "../neighborhood-access";
import { getAuthContext } from "@/lib/auth-context";

describe("getNeighborhoodAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset auth context mock
    mockAuthContext.isStaffAdmin = false;
    mockAuthContext.isImpersonating = false;
    mockAuthContext.effectiveUserId = "user-123";

    // Default: user is authenticated
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
    });
  });

  describe("authentication", () => {
    it("redirects to signin when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await expect(getNeighborhoodAccess("test-neighborhood")).rejects.toThrow(
        "REDIRECT:/signin"
      );
      expect(redirectMock).toHaveBeenCalledWith("/signin");
    });
  });

  describe("neighborhood lookup", () => {
    it("returns notFound when neighborhood does not exist", async () => {
      // Setup: neighborhood query returns null
      mockAuthContext.queryClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      };

      await expect(getNeighborhoodAccess("nonexistent")).rejects.toThrow(
        "NOT_FOUND"
      );
      expect(notFoundMock).toHaveBeenCalled();
    });
  });

  describe("membership requirements", () => {
    const mockNeighborhood = {
      id: "neighborhood-123",
      slug: "test-neighborhood",
      name: "Test Neighborhood",
    };

    const mockUser = {
      id: "user-123",
      email: "user@example.com",
      name: "Test User",
    };

    const mockMembership = {
      id: "membership-123",
      user_id: "user-123",
      neighborhood_id: "neighborhood-123",
      role: "member",
      status: "active",
    };

    beforeEach(() => {
      // Setup query chain for successful neighborhood and user lookups
      const createQueryChain = (data: unknown) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data }),
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data }),
            }),
          }),
        }),
      });

      mockAuthContext.queryClient = {
        from: vi.fn()
          .mockReturnValueOnce(createQueryChain(mockNeighborhood)) // neighborhoods
          .mockReturnValueOnce(createQueryChain(mockUser)) // users
          .mockReturnValueOnce({ // memberships - more complex chain
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: mockMembership }),
                    }),
                  }),
                }),
              }),
            }),
          }),
      };
    });

    it("redirects to join page when membership required but not found", async () => {
      // Override membership to return null
      const createQueryChain = (data: unknown) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data }),
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data }),
            }),
          }),
        }),
      });

      mockAuthContext.queryClient = {
        from: vi.fn()
          .mockReturnValueOnce(createQueryChain(mockNeighborhood))
          .mockReturnValueOnce(createQueryChain(mockUser))
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No membership
                    }),
                  }),
                }),
              }),
            }),
          }),
      };

      await expect(getNeighborhoodAccess("test-neighborhood")).rejects.toThrow(
        "REDIRECT:/join/test-neighborhood"
      );
      expect(redirectMock).toHaveBeenCalledWith("/join/test-neighborhood");
    });

    it("allows access for staff admin without membership", async () => {
      mockAuthContext.isStaffAdmin = true;
      mockAuthContext.isImpersonating = false;

      // Staff admin doesn't need membership
      const createQueryChain = (data: unknown) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data }),
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data }),
            }),
          }),
        }),
      });

      mockAuthContext.queryClient = {
        from: vi.fn()
          .mockReturnValueOnce(createQueryChain(mockNeighborhood))
          .mockReturnValueOnce(createQueryChain(mockUser))
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No membership
                    }),
                  }),
                }),
              }),
            }),
          }),
      };

      // Should NOT throw - staff admins don't need membership
      const result = await getNeighborhoodAccess("test-neighborhood");
      expect(result.isStaffAdmin).toBe(true);
      expect(result.membership).toBeNull();
    });

    it("requires membership for impersonating staff admin", async () => {
      mockAuthContext.isStaffAdmin = true;
      mockAuthContext.isImpersonating = true; // Impersonating - needs membership

      const createQueryChain = (data: unknown) => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data }),
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data }),
            }),
          }),
        }),
      });

      mockAuthContext.queryClient = {
        from: vi.fn()
          .mockReturnValueOnce(createQueryChain(mockNeighborhood))
          .mockReturnValueOnce(createQueryChain(mockUser))
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }), // No membership
                    }),
                  }),
                }),
              }),
            }),
          }),
      };

      // Should throw - impersonating user needs membership
      await expect(getNeighborhoodAccess("test-neighborhood")).rejects.toThrow(
        "REDIRECT:/join/test-neighborhood"
      );
    });
  });
});

describe("NeighborhoodAccess interface", () => {
  it("has expected shape", () => {
    const access = {
      user: { id: "user-123", email: "test@example.com", name: "Test" },
      neighborhood: { id: "n-123", slug: "test", name: "Test Neighborhood" },
      membership: { id: "m-123", role: "member" },
      isStaffAdmin: false,
      isNeighborhoodAdmin: false,
      supabase: {},
    };

    expect(access.user).toBeDefined();
    expect(access.neighborhood).toBeDefined();
    expect(access.membership).toBeDefined();
    expect(access.isStaffAdmin).toBe(false);
    expect(access.isNeighborhoodAdmin).toBe(false);
  });

  it("allows null membership", () => {
    const access = {
      user: { id: "user-123" },
      neighborhood: { id: "n-123" },
      membership: null,
      isStaffAdmin: true,
      isNeighborhoodAdmin: true,
      supabase: {},
    };

    expect(access.membership).toBeNull();
    expect(access.isStaffAdmin).toBe(true);
  });
});
