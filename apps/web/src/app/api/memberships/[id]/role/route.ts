import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface MembershipRow {
  id: string;
  user_id: string;
  neighborhood_id: string;
  role: string;
  status: string;
  neighborhood: unknown;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: membershipId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  const body = await request.json();
  const { role } = body;

  if (!role || !["admin", "member"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be 'admin' or 'member'" },
      { status: 400 }
    );
  }

  const userIsStaffAdmin = isStaffAdmin(user.email);

  // Use admin client for staff admins to bypass RLS (they aren't members of neighborhoods)
  const queryClient = userIsStaffAdmin ? createAdminClient() : supabase;

  // Fetch the target membership
  const { data: targetMembershipData, error: fetchError } = await queryClient
    .from("memberships")
    .select("*, neighborhood:neighborhoods(*)")
    .eq("id", membershipId)
    .single();

  if (fetchError || !targetMembershipData) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );
  }

  const targetMembership = targetMembershipData as MembershipRow;
  const neighborhoodId = targetMembership.neighborhood_id;
  const currentRole = targetMembership.role;

  // Check if user is a neighborhood admin (only needed for non-staff admins)
  let isNeighborhoodAdmin = false;
  if (!userIsStaffAdmin) {
    const { data: userMembership } = await supabase
      .from("memberships")
      .select("role")
      .eq("neighborhood_id", neighborhoodId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    isNeighborhoodAdmin = userMembership?.role === "admin";
  }

  // Permission checks
  if (role === "admin" && currentRole === "member") {
    // Promoting: staff admin or neighborhood admin can do this
    if (!userIsStaffAdmin && !isNeighborhoodAdmin) {
      return NextResponse.json(
        { error: "Only admins can promote members" },
        { status: 403 }
      );
    }
  } else if (role === "member" && currentRole === "admin") {
    // Demoting: only staff admin can do this
    if (!userIsStaffAdmin) {
      return NextResponse.json(
        { error: "Only staff admins can demote admins" },
        { status: 403 }
      );
    }
  } else {
    // No change needed
    return NextResponse.json({ membership: targetMembership });
  }

  // Update the role
  // Note: Use FK hint for ambiguous relationship (memberships has multiple user FKs)
  const { data: updatedMembership, error: updateError } = await queryClient
    .from("memberships")
    .update({ role } as never)
    .eq("id", membershipId)
    .select("*, neighborhood:neighborhoods(*), user:users!memberships_user_id_fkey(*)")
    .single();

  if (updateError) {
    logger.error("Error updating membership role", updateError, { membershipId });
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }

  return NextResponse.json({ membership: updatedMembership });
}
