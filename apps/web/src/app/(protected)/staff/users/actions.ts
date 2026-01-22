"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export interface UserMembership {
  membership_id: string;
  neighborhood_id: string;
  neighborhood_name: string;
  neighborhood_slug: string;
  role: string;
  status: string;
}

export interface UserSearchResult {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  memberships: UserMembership[];
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

interface MembershipRow {
  id: string;
  user_id: string;
  neighborhood_id: string;
  role: string;
  status: string;
  neighborhood: {
    name: string;
    slug: string;
  } | null;
}

/**
 * Search for users by name or email.
 * Only staff admins can call this action.
 * Returns users with their neighborhood memberships.
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !isStaffAdmin(authUser.email)) {
    logger.warn("Unauthorized user search attempt", {
      userId: authUser?.id,
      email: authUser?.email,
    });
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  const adminSupabase = createAdminClient();
  const searchPattern = `%${query}%`;

  // Search for users matching the query
  const { data: users, error: usersError } = await adminSupabase
    .from("users")
    .select("id, name, email, avatar_url")
    .or(`name.ilike.${searchPattern},email.ilike.${searchPattern}`)
    .limit(50);

  if (usersError) {
    logger.error("Failed to search users", usersError, { query });
    return [];
  }

  if (!users || users.length === 0) {
    return [];
  }

  const typedUsers = users as UserRow[];

  // Filter out staff admins from results
  const nonStaffUsers = typedUsers.filter((u) => !isStaffAdmin(u.email));

  if (nonStaffUsers.length === 0) {
    return [];
  }

  const userIds = nonStaffUsers.map((u) => u.id);

  // Get memberships for these users
  const { data: memberships, error: membershipsError } = await adminSupabase
    .from("memberships")
    .select(
      `
      id,
      user_id,
      neighborhood_id,
      role,
      status,
      neighborhood:neighborhoods(name, slug)
    `
    )
    .in("user_id", userIds)
    .is("deleted_at", null);

  if (membershipsError) {
    logger.error("Failed to fetch memberships", membershipsError, { userIds });
    // Continue without membership data
  }

  const typedMemberships = (memberships || []) as MembershipRow[];

  // Group memberships by user
  const membershipsByUser = typedMemberships.reduce<
    Record<string, UserMembership[]>
  >((acc, m) => {
    if (!acc[m.user_id]) {
      acc[m.user_id] = [];
    }
    if (m.neighborhood) {
      acc[m.user_id].push({
        membership_id: m.id,
        neighborhood_id: m.neighborhood_id,
        neighborhood_name: m.neighborhood.name,
        neighborhood_slug: m.neighborhood.slug,
        role: m.role,
        status: m.status,
      });
    }
    return acc;
  }, {});

  // Build results
  return nonStaffUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    memberships: membershipsByUser[user.id] || [],
  }));
}

export interface PaginatedUsersResult {
  users: UserSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get all users with pagination.
 * Only staff admins can call this action.
 * Returns users with their neighborhood memberships.
 */
export async function getAllUsers(
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedUsersResult> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !isStaffAdmin(authUser.email)) {
    logger.warn("Unauthorized get all users attempt", {
      userId: authUser?.id,
      email: authUser?.email,
    });
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  const adminSupabase = createAdminClient();
  const offset = (page - 1) * pageSize;

  // Get total count first (excluding staff admins is handled after fetch)
  const { count: rawCount } = await adminSupabase
    .from("users")
    .select("*", { count: "exact", head: true });

  // Get paginated users
  const { data: users, error: usersError } = await adminSupabase
    .from("users")
    .select("id, name, email, avatar_url")
    .order("name", { ascending: true, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  if (usersError) {
    logger.error("Failed to fetch users", usersError, { page, pageSize });
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }

  if (!users || users.length === 0) {
    return { users: [], totalCount: rawCount || 0, page, pageSize, totalPages: 0 };
  }

  const typedUsers = users as UserRow[];

  // Filter out staff admins from results
  const nonStaffUsers = typedUsers.filter((u) => !isStaffAdmin(u.email));

  if (nonStaffUsers.length === 0) {
    // If all users on this page were staff admins, return empty but keep count
    return {
      users: [],
      totalCount: rawCount || 0,
      page,
      pageSize,
      totalPages: Math.ceil((rawCount || 0) / pageSize),
    };
  }

  const userIds = nonStaffUsers.map((u) => u.id);

  // Get memberships for these users
  const { data: memberships, error: membershipsError } = await adminSupabase
    .from("memberships")
    .select(
      `
      id,
      user_id,
      neighborhood_id,
      role,
      status,
      neighborhood:neighborhoods(name, slug)
    `
    )
    .in("user_id", userIds)
    .is("deleted_at", null);

  if (membershipsError) {
    logger.error("Failed to fetch memberships", membershipsError, { userIds });
  }

  const typedMemberships = (memberships || []) as MembershipRow[];

  // Group memberships by user
  const membershipsByUser = typedMemberships.reduce<
    Record<string, UserMembership[]>
  >((acc, m) => {
    if (!acc[m.user_id]) {
      acc[m.user_id] = [];
    }
    if (m.neighborhood) {
      acc[m.user_id].push({
        membership_id: m.id,
        neighborhood_id: m.neighborhood_id,
        neighborhood_name: m.neighborhood.name,
        neighborhood_slug: m.neighborhood.slug,
        role: m.role,
        status: m.status,
      });
    }
    return acc;
  }, {});

  // Build results
  const resultUsers = nonStaffUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    memberships: membershipsByUser[user.id] || [],
  }));

  const totalCount = rawCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    users: resultUsers,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}
