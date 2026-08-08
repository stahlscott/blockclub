"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS, validateLength } from "@blockclub/shared";
import type { ItemCategory, ItemInsert } from "@blockclub/shared";

interface CreateItemData {
  slug: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  photoUrls: string[];
}

interface UpdateItemData extends CreateItemData {
  itemId: string;
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

  const { isStaffAdmin: userIsStaffAdmin, isImpersonating, effectiveUserId, queryClient } =
    await getAuthContext(supabase, authUser);

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
  const insertData: ItemInsert = {
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

export async function updateItem(data: UpdateItemData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");

  const { effectiveUserId, queryClient } = await getAuthContext(supabase, authUser);
  const { data: neighborhood } = await queryClient
    .from("neighborhoods")
    .select("id")
    .eq("slug", data.slug)
    .single();
  if (!neighborhood) return { success: false, error: "Neighborhood not found" };

  const { data: item } = await queryClient
    .from("items")
    .select("id, owner_id, neighborhood_id, deleted_at")
    .eq("id", data.itemId)
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!item) return { success: false, error: "Item not found" };
  if (item.owner_id !== effectiveUserId) return { success: false, error: "You can only edit your own items" };

  const name = data.name.trim();
  const description = data.description?.trim() || null;
  const nameError = validateLength(name, "Item name", MAX_LENGTHS.itemName);
  const descriptionError = validateLength(description || "", "Item description", MAX_LENGTHS.itemDescription);
  if (!name) return { success: false, error: "Item name cannot be empty" };
  if (nameError || descriptionError) return { success: false, error: nameError || descriptionError || "Invalid item details" };

  const { data: updated, error } = await queryClient
    .from("items")
    .update({ name, description, category: data.category, photo_urls: data.photoUrls })
    .eq("id", item.id)
    .eq("owner_id", effectiveUserId)
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated?.id || updated.id !== data.itemId) {
    logger.error("Error updating item", error, { itemId: data.itemId, neighborhoodId: neighborhood.id });
    return { success: false, error: "The item could not be updated. Refresh and try again." };
  }

  revalidatePath(`/neighborhoods/${data.slug}/library`);
  revalidatePath(`/neighborhoods/${data.slug}/library/${data.itemId}`);
  return { success: true };
}
