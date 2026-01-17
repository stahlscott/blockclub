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
  slug: string;
}

interface ItemRow {
  id: string;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: neighborhoodId } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only staff admins can delete neighborhoods
  if (!isStaffAdmin(user.email)) {
    logger.warn("Non-staff admin attempted to delete neighborhood", {
      userId: user.id,
      neighborhoodId,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Fetch the neighborhood to verify it exists
  const { data: neighborhoodData, error: fetchError } = await adminSupabase
    .from("neighborhoods")
    .select("id, name, slug")
    .eq("id", neighborhoodId)
    .single();

  const neighborhood = neighborhoodData as NeighborhoodRow | null;

  if (fetchError || !neighborhood) {
    return NextResponse.json(
      { error: "Neighborhood not found" },
      { status: 404 }
    );
  }

  logger.info("Staff admin deleting neighborhood", {
    userId: user.id,
    email: user.email,
    neighborhoodId,
    neighborhoodName: neighborhood.name,
  });

  // Delete in order to respect foreign key constraints
  // Order: loans -> items -> posts -> memberships -> neighborhoods

  // 1. Delete loans for items in this neighborhood
  const { data: itemsData } = await adminSupabase
    .from("items")
    .select("id")
    .eq("neighborhood_id", neighborhoodId);

  const items = (itemsData || []) as ItemRow[];
  const itemIds = items.map((i) => i.id);

  if (itemIds.length > 0) {
    const { error: loansError } = await adminSupabase
      .from("loans")
      .delete()
      .in("item_id", itemIds);

    if (loansError) {
      logger.error("Error deleting loans", loansError, { neighborhoodId });
      return NextResponse.json(
        { error: "Failed to delete neighborhood data" },
        { status: 500 }
      );
    }
  }

  // 2. Delete items
  const { error: itemsError } = await adminSupabase
    .from("items")
    .delete()
    .eq("neighborhood_id", neighborhoodId);

  if (itemsError) {
    logger.error("Error deleting items", itemsError, { neighborhoodId });
    return NextResponse.json(
      { error: "Failed to delete neighborhood data" },
      { status: 500 }
    );
  }

  // 3. Delete posts
  const { error: postsError } = await adminSupabase
    .from("posts")
    .delete()
    .eq("neighborhood_id", neighborhoodId);

  if (postsError) {
    logger.error("Error deleting posts", postsError, { neighborhoodId });
    return NextResponse.json(
      { error: "Failed to delete neighborhood data" },
      { status: 500 }
    );
  }

  // 4. Delete memberships
  const { error: membershipsError } = await adminSupabase
    .from("memberships")
    .delete()
    .eq("neighborhood_id", neighborhoodId);

  if (membershipsError) {
    logger.error("Error deleting memberships", membershipsError, { neighborhoodId });
    return NextResponse.json(
      { error: "Failed to delete neighborhood data" },
      { status: 500 }
    );
  }

  // 5. Delete the neighborhood itself
  const { error: neighborhoodError } = await adminSupabase
    .from("neighborhoods")
    .delete()
    .eq("id", neighborhoodId);

  if (neighborhoodError) {
    logger.error("Error deleting neighborhood", neighborhoodError, { neighborhoodId });
    return NextResponse.json(
      { error: "Failed to delete neighborhood" },
      { status: 500 }
    );
  }

  logger.info("Neighborhood deleted successfully", {
    userId: user.id,
    neighborhoodId,
    neighborhoodName: neighborhood.name,
  });

  return NextResponse.json({ success: true });
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

  // Only staff admins can update neighborhoods via this endpoint
  if (!isStaffAdmin(user.email)) {
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

  const neighborhood = neighborhoodData as (NeighborhoodRow & { settings?: Record<string, unknown> }) | null;

  if (fetchError || !neighborhood) {
    return NextResponse.json(
      { error: "Neighborhood not found" },
      { status: 404 }
    );
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};

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
    .update(updateData as never)
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
