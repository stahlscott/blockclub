import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdminUser } from "@/lib/auth";
import { runStaffMembershipOperation } from "@/lib/staff-membership";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface NeighborhoodRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: userId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only staff admins can add users to neighborhoods
  if (!(await isStaffAdminUser(createAdminClient(), user.id))) {
    logger.warn("Non-staff admin attempted to add user to neighborhood", {
      userId: user.id,
      targetUserId: userId,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse request body
  const body = await request.json();
  const { neighborhood_id } = body;

  if (!neighborhood_id) {
    return NextResponse.json(
      { error: "neighborhood_id is required" },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Verify the user exists
  const { data: targetUserData, error: userError } = await adminSupabase
    .from("users")
    .select("id, name, email")
    .eq("id", userId)
    .single();

  const targetUser = targetUserData as UserRow | null;

  if (userError || !targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Verify the neighborhood exists
  const { data: neighborhoodData, error: neighborhoodError } = await adminSupabase
    .from("neighborhoods")
    .select("id, name")
    .eq("id", neighborhood_id)
    .single();

  const neighborhood = neighborhoodData as NeighborhoodRow | null;

  if (neighborhoodError || !neighborhood) {
    return NextResponse.json({ error: "Neighborhood not found" }, { status: 404 });
  }

  const { data: existingMembershipData } = await adminSupabase
    .from("memberships")
    .select("id, status, deleted_at")
    .eq("user_id", userId)
    .eq("neighborhood_id", neighborhood_id)
    .maybeSingle();
  const existingMembership = existingMembershipData as { id: string; status: string; deleted_at: string | null } | null;

  if (existingMembership && existingMembership.deleted_at === null) {
    return NextResponse.json({ error: "User is already a member of this neighborhood" }, { status: 400 });
  }

  logger.info("Staff admin adding user to neighborhood", {
    adminId: user.id,
    adminEmail: user.email,
    targetUserId: userId,
    targetUserEmail: targetUser.email,
    neighborhoodId: neighborhood_id,
    neighborhoodName: neighborhood.name,
    reactivating: Boolean(existingMembership),
  });

  const operation = existingMembership ? "reactivate" : "add";
  const { data: operationResult, error: operationError } = await runStaffMembershipOperation({
    operation,
    membershipId: existingMembership?.id,
    targetUserId: existingMembership ? null : userId,
    neighborhoodId: existingMembership ? null : neighborhood_id,
    role: "member",
    staffActorId: user.id,
  });

  if (operationError || !operationResult?.success || operationResult.affected_membership_count !== 1) {
    logger.error("Error applying staff membership operation", operationError, { userId, neighborhood_id, operation });
    return NextResponse.json({ error: operationResult?.reason || "Failed to add user to neighborhood" }, { status: 409 });
  }

  logger.info("User added to neighborhood successfully", {
    adminId: user.id,
    targetUserId: userId,
    neighborhoodId: neighborhood_id,
  });

  return NextResponse.json({ success: true });
}
