"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { getImpersonationContext } from "@/lib/impersonation";
import { logger } from "@/lib/logger";
import type { ItemCategory } from "@blockclub/shared";

interface CreateItemData {
  slug: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  photoUrls: string[];
}

export async function createItem(data: CreateItemData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const userIsStaffAdmin = isStaffAdmin(authUser.email);

  // Check for impersonation
  const impersonationContext = userIsStaffAdmin
    ? await getImpersonationContext()
    : null;
  const isImpersonating = impersonationContext?.isImpersonating ?? false;

  // Determine effective user ID (impersonated user or actual user)
  const effectiveUserId = isImpersonating && impersonationContext?.impersonatedUserId
    ? impersonationContext.impersonatedUserId
    : authUser.id;

  // Use admin client for staff admins to bypass RLS
  const queryClient = userIsStaffAdmin ? createAdminClient() : supabase;

  // Get neighborhood
  const { data: neighborhood } = await queryClient
    .from("neighborhoods")
    .select("id")
    .eq("slug", data.slug)
    .single();

  if (!neighborhood) {
    return { success: false, error: "Neighborhood not found" };
  }

  // Verify membership (staff admins without impersonation bypass, impersonating staff need the impersonated user's membership)
  if (!userIsStaffAdmin || isImpersonating) {
    const { data: membership } = await queryClient
      .from("memberships")
      .select("id")
      .eq("neighborhood_id", neighborhood.id)
      .eq("user_id", effectiveUserId)
      .eq("status", "active")
      .is("deleted_at", null)
      .single();

    if (!membership) {
      return { success: false, error: "You must be a member to add items" };
    }
  }

  // Create item with correct owner and audit trail
  const insertData: Record<string, unknown> = {
    neighborhood_id: neighborhood.id,
    owner_id: effectiveUserId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    category: data.category,
    photo_urls: data.photoUrls,
    availability: "available",
  };

  // Add audit trail if staff admin is acting on behalf of another user
  if (userIsStaffAdmin && isImpersonating) {
    insertData.staff_actor_id = authUser.id;
  }

  const { error: insertError } = await queryClient.from("items").insert(insertData);

  if (insertError) {
    logger.error("Error creating item", insertError);
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/neighborhoods/${data.slug}/library`);
  return { success: true };
}
