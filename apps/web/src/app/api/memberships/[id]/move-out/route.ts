import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
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
  const userIsStaffAdmin = isStaffAdmin(user.email);

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

  // Update the membership status to moved_out
  const { error: updateError } = await supabase
    .from("memberships")
    .update({ status: "moved_out" })
    .eq("id", membershipId);

  if (updateError) {
    logger.error("Error updating membership to moved_out", updateError, { membershipId });
    return NextResponse.json(
      { error: "Failed to update membership status" },
      { status: 500 }
    );
  }

  // Delete the user's lending library items in this neighborhood
  const { error: deleteItemsError } = await supabase
    .from("items")
    .delete()
    .eq("owner_id", targetUserId)
    .eq("neighborhood_id", neighborhoodId);

  if (deleteItemsError) {
    logger.error("Error deleting items for moved out member", deleteItemsError, {
      membershipId,
      userId: targetUserId,
      neighborhoodId,
    });
    // Don't fail the request - membership was already updated
  }

  return NextResponse.json({
    success: true,
    message: isOwnMembership
      ? "You have been marked as moved out"
      : "Member has been marked as moved out",
  });
}
