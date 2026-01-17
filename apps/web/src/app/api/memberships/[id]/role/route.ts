import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
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

  const neighborhoodId = targetMembership.neighborhood_id;
  const currentRole = targetMembership.role;
  const userIsStaffAdmin = isStaffAdmin(user.email);

  // Check if user is a neighborhood admin
  const { data: userMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const isNeighborhoodAdmin = userMembership?.role === "admin";

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
  const { data: updatedMembership, error: updateError } = await supabase
    .from("memberships")
    .update({ role })
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
