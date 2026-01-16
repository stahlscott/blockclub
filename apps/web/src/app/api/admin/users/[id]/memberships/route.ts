import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
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
  if (!isStaffAdmin(user.email)) {
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

  // Check if membership already exists
  const { data: existingMembership } = await adminSupabase
    .from("memberships")
    .select("id, status")
    .eq("user_id", userId)
    .eq("neighborhood_id", neighborhood_id)
    .single();

  if (existingMembership) {
    return NextResponse.json(
      { error: "User is already a member of this neighborhood" },
      { status: 400 }
    );
  }

  logger.info("Staff admin adding user to neighborhood", {
    adminId: user.id,
    adminEmail: user.email,
    targetUserId: userId,
    targetUserEmail: targetUser.email,
    neighborhoodId: neighborhood_id,
    neighborhoodName: neighborhood.name,
  });

  // Create the membership (active status, member role)
  const { error: insertError } = await adminSupabase
    .from("memberships")
    .insert({
      user_id: userId,
      neighborhood_id: neighborhood_id,
      role: "member",
      status: "active",
      joined_at: new Date().toISOString(),
    } as never);

  if (insertError) {
    logger.error("Error creating membership", insertError, { userId, neighborhood_id });
    return NextResponse.json(
      { error: "Failed to add user to neighborhood" },
      { status: 500 }
    );
  }

  logger.info("User added to neighborhood successfully", {
    adminId: user.id,
    targetUserId: userId,
    neighborhoodId: neighborhood_id,
  });

  return NextResponse.json({ success: true });
}
