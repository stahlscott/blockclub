import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { StaffClient } from "./staff-client";

// Types for admin queries
interface NeighborhoodRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  memberships: { id: string; neighborhood_id: string; status: string }[];
}

export default async function StaffPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Only staff admins can access this page
  if (!isStaffAdmin(user.email)) {
    logger.warn("Non-staff admin attempted to access /staff", { userId: user.id, email: user.email });
    redirect("/dashboard");
  }

  // Use admin client to bypass RLS and get all data
  const adminSupabase = createAdminClient();

  // Fetch statistics
  // Note: Use !memberships_user_id_fkey to specify which FK to use (there are multiple user references)
  const [neighborhoodsResult, usersResult, itemsResult] = await Promise.all([
    adminSupabase.from("neighborhoods").select("*"),
    adminSupabase.from("users").select("*, memberships!memberships_user_id_fkey(id, neighborhood_id, status)"),
    adminSupabase.from("items").select("*", { count: "exact", head: true }),
  ]);

  const neighborhoods = (neighborhoodsResult.data || []) as NeighborhoodRow[];
  const users = (usersResult.data || []) as UserRow[];
  const totalItems = itemsResult.count || 0;

  if (neighborhoodsResult.error) {
    logger.error("Error fetching neighborhoods for admin", neighborhoodsResult.error);
  }
  if (usersResult.error) {
    logger.error("Error fetching users for admin", usersResult.error);
  }

  // Enrich neighborhoods with member and item counts
  const neighborhoodIds = neighborhoods.map((n) => n.id);

  const [membershipCounts, itemCounts] = await Promise.all([
    adminSupabase
      .from("memberships")
      .select("neighborhood_id")
      .in("neighborhood_id", neighborhoodIds.length > 0 ? neighborhoodIds : [""])
      .eq("status", "active"),
    adminSupabase
      .from("items")
      .select("neighborhood_id")
      .in("neighborhood_id", neighborhoodIds.length > 0 ? neighborhoodIds : [""]),
  ]);

  // Create lookup maps for counts
  const memberCountMap: Record<string, number> = {};
  const itemCountMap: Record<string, number> = {};

  ((membershipCounts.data || []) as { neighborhood_id: string }[]).forEach((m) => {
    memberCountMap[m.neighborhood_id] = (memberCountMap[m.neighborhood_id] || 0) + 1;
  });

  ((itemCounts.data || []) as { neighborhood_id: string }[]).forEach((i) => {
    itemCountMap[i.neighborhood_id] = (itemCountMap[i.neighborhood_id] || 0) + 1;
  });

  const enrichedNeighborhoods = neighborhoods.map((n) => ({
    ...n,
    memberCount: memberCountMap[n.id] || 0,
    itemCount: itemCountMap[n.id] || 0,
  }));

  // Enrich users with membership count and primary neighborhood
  const enrichedUsers = users.map((u) => {
    const activeMemberships = (u.memberships || []).filter((m) => m.status === "active");
    const primaryNeighborhoodId = activeMemberships[0]?.neighborhood_id;
    const primaryNeighborhood = primaryNeighborhoodId
      ? neighborhoods.find((n) => n.id === primaryNeighborhoodId)
      : null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar_url: u.avatar_url,
      created_at: u.created_at,
      membershipCount: activeMemberships.length,
      primaryNeighborhood: primaryNeighborhood?.name || null,
      memberships: u.memberships || [],
    };
  });

  // Filter out staff admins from the user list - they shouldn't appear in the user list
  const nonStaffUsers = enrichedUsers.filter((u) => !isStaffAdmin(u.email));

  return (
    <StaffClient
      neighborhoods={enrichedNeighborhoods}
      users={nonStaffUsers}
      stats={{
        neighborhoodCount: neighborhoods.length,
        userCount: nonStaffUsers.length,
        totalItems,
      }}
    />
  );
}
