import { NextRequest, NextResponse } from "next/server";
import type { NeighborhoodUpdate } from "@blockclub/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdminUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: neighborhoodId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only database-allowlisted staff admins can delete neighborhoods
  if (!(await isStaffAdminUser(createAdminClient(), user.id))) {
    logger.warn("Non-staff admin attempted to delete neighborhood", {
      userId: user.id,
      neighborhoodId,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error: "Physical neighborhood teardown is deprecated and disabled. Preserve history and use the documented recovery workflow.",
      code: "NEIGHBORHOOD_TEARDOWN_DISABLED",
    },
    { status: 410 },
  );
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: neighborhoodId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only database-allowlisted staff admins can update neighborhoods via this endpoint
  if (!(await isStaffAdminUser(createAdminClient(), user.id))) {
    logger.warn("Non-staff admin attempted to update neighborhood", {
      userId: user.id,
      neighborhoodId,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse request body
  const body = await request.json();
  const { slug, name, description, location, settings } = body;

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Fetch the neighborhood to verify it exists
  const { data: neighborhoodData, error: fetchError } = await adminSupabase
    .from("neighborhoods")
    .select("id, name, slug, settings")
    .eq("id", neighborhoodId)
    .single();

  const neighborhood = neighborhoodData as {
    id: string;
    name: string;
    slug: string;
    settings?: Record<string, unknown>;
  } | null;

  if (fetchError || !neighborhood) {
    return NextResponse.json(
      { error: "Neighborhood not found" },
      { status: 404 }
    );
  }

  // Build update object with only provided fields
  const updateData: NeighborhoodUpdate = {};

  if (slug !== undefined) {
    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    // Check if the new slug is already taken by another neighborhood
    const { data: existingNeighborhood } = await adminSupabase
      .from("neighborhoods")
      .select("id")
      .eq("slug", slug)
      .neq("id", neighborhoodId)
      .single();

    if (existingNeighborhood) {
      return NextResponse.json(
        { error: "This slug is already in use by another neighborhood" },
        { status: 400 }
      );
    }

    updateData.slug = slug;
  }

  if (name !== undefined) {
    updateData.name = name;
  }

  if (description !== undefined) {
    updateData.description = description || null;
  }

  if (location !== undefined) {
    updateData.location = location || null;
  }

  if (settings !== undefined) {
    // Merge with existing settings
    updateData.settings = { ...neighborhood.settings, ...settings };
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  logger.info("Staff admin updating neighborhood", {
    userId: user.id,
    email: user.email,
    neighborhoodId,
    neighborhoodName: neighborhood.name,
    updates: Object.keys(updateData),
  });

  // Update the neighborhood
  const { error: updateError } = await adminSupabase
    .from("neighborhoods")
    .update(updateData)
    .eq("id", neighborhoodId);

  if (updateError) {
    logger.error("Error updating neighborhood", updateError, { neighborhoodId });
    return NextResponse.json(
      { error: "Failed to update neighborhood" },
      { status: 500 }
    );
  }

  logger.info("Neighborhood updated successfully", {
    userId: user.id,
    neighborhoodId,
  });

  return NextResponse.json({ success: true });
}
