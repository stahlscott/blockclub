import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth-context";
import { isStaffAdminUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: membershipId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the target membership
  const { data: targetMembership, error: fetchError } = await supabase
    .from("memberships")
    .select("*, neighborhood:neighborhoods(*)")
    .eq("id", membershipId)
    .single();

  if (fetchError || !targetMembership) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );
  }

  // Only active memberships can be marked as moved out
  if (targetMembership.status !== "active") {
    return NextResponse.json(
      { error: "Only active memberships can be marked as moved out" },
      { status: 400 }
    );
  }

  const neighborhoodId = targetMembership.neighborhood_id;
  const targetUserId = targetMembership.user_id;
  const isOwnMembership = targetUserId === user.id;
  const userIsStaffAdmin = await isStaffAdminUser(createAdminClient(), user.id);

  // Check if current user is a neighborhood admin
  const { data: userMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const isNeighborhoodAdmin = userMembership?.role === "admin";

  // Permission check: user can mark their own membership OR admin can mark any member
  if (!isOwnMembership && !isNeighborhoodAdmin && !userIsStaffAdmin) {
    return NextResponse.json(
      { error: "You don't have permission to perform this action" },
      { status: 403 }
    );
  }

  if (!isOwnMembership) {
    // Admin/staff move-out requires the staff-capable atomic function so the
    // database can record effective-user and actor audit fields. Do not fall
    // back to split browser writes or hard deletes.
    return NextResponse.json(
      { error: userIsStaffAdmin || isNeighborhoodAdmin ? "Administrative move-out is temporarily unavailable" : "You don't have permission to perform this action" },
      { status: userIsStaffAdmin || isNeighborhoodAdmin ? 501 : 403 },
    );
  }

  const { queryClient } = await getAuthContext(supabase, user);
  const { data: result, error: moveOutError } = await queryClient.rpc("move_out_membership", {
    p_membership_id: membershipId,
  });

  if (moveOutError) {
    logger.error("Error moving out membership", moveOutError, { membershipId });
    return NextResponse.json({ error: "Failed to complete move-out" }, { status: 500 });
  }
  if (!result?.success || result.membership_id !== membershipId) {
    return NextResponse.json(
      { error: result?.reason === "not_authorized" ? "You don't have permission to perform this action" : "Move-out could not be completed", result },
      { status: result?.reason === "not_authorized" ? 403 : 409 },
    );
  }

  return NextResponse.json({
    success: true,
    result,
    message: "You have been marked as moved out. Your items and loan history were preserved.",
  });
}
