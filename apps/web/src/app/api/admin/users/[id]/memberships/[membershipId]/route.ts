import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdminUser } from "@/lib/auth";
import { runStaffMembershipOperation } from "@/lib/staff-membership";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string; membershipId: string }>;
}

interface MembershipRow {
  id: string;
  user_id: string;
  neighborhood_id: string;
  user: { name: string | null; email: string } | null;
  neighborhood: { name: string } | null;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: userId, membershipId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only staff admins can force-remove memberships
  if (!(await isStaffAdminUser(createAdminClient(), user.id))) {
    logger.warn("Non-staff admin attempted to force-remove membership", {
      userId: user.id,
      targetUserId: userId,
      membershipId,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Fetch the membership to verify it exists and belongs to the specified user
  // Note: Use FK hint for ambiguous relationship (memberships has multiple user FKs)
  const { data: membershipData, error: fetchError } = await adminSupabase
    .from("memberships")
    .select("*, user:users!memberships_user_id_fkey(name, email), neighborhood:neighborhoods(name)")
    .eq("id", membershipId)
    .eq("user_id", userId)
    .single();

  const membership = membershipData as MembershipRow | null;

  if (fetchError || !membership) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );
  }

  logger.info("Staff admin force-removing membership", {
    adminId: user.id,
    adminEmail: user.email,
    targetUserId: userId,
    targetUserEmail: membership.user?.email,
    membershipId,
    neighborhoodName: membership.neighborhood?.name,
  });

  const { data: operationResult, error: operationError } = await runStaffMembershipOperation({
    operation: "remove",
    membershipId,
    staffActorId: user.id,
  });

  if (operationError || !operationResult?.success || operationResult.affected_membership_count !== 1) {
    logger.error("Error removing membership", operationError, { membershipId });
    return NextResponse.json({ error: operationResult?.reason || "Failed to remove membership" }, { status: 409 });
  }

  logger.info("Membership removed successfully", {
    adminId: user.id,
    membershipId,
    targetUserId: userId,
  });

  return NextResponse.json({ success: true });
}
