"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS, validateLength } from "@blockclub/shared";
import type { NeighborhoodSettings } from "@blockclub/shared";

export interface NeighborhoodSettingsInput {
  name: string;
  description: string;
  location: string;
  requireApproval: boolean;
}

export interface NeighborhoodSettingsResult {
  success: boolean;
  error?: string;
}

export async function updateNeighborhoodSettings(
  slug: string,
  input: NeighborhoodSettingsInput,
): Promise<NeighborhoodSettingsResult> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, error: "You must be signed in." };

  const auth = await getAuthContext(supabase, authUser);
  const { data: neighborhood } = await auth.queryClient
    .from("neighborhoods")
    .select("id, settings")
    .eq("slug", slug)
    .maybeSingle();
  if (!neighborhood) return { success: false, error: "Neighborhood not found." };

  if (!auth.isStaffAdmin || auth.isImpersonating) {
    const { data: membership } = await auth.queryClient
      .from("memberships")
      .select("id, role")
      .eq("neighborhood_id", neighborhood.id)
      .eq("user_id", auth.effectiveUserId)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();
    if (membership?.role !== "admin") return { success: false, error: "Only neighborhood admins can update settings." };
  }

  const name = input.name.trim();
  const description = input.description.trim();
  const location = input.location.trim();
  const nameError = validateLength(name, "Neighborhood name", MAX_LENGTHS.neighborhoodName);
  if (!name) return { success: false, error: "Neighborhood name cannot be empty." };
  if (nameError) return { success: false, error: nameError };

  const settings: NeighborhoodSettings = {
    require_approval: input.requireApproval,
    allow_public_directory: neighborhood.settings?.allow_public_directory ?? false,
  };
  const { data: updated, error } = await auth.queryClient
    .from("neighborhoods")
    .update({ name, description: description || null, location: location || null, settings })
    .eq("id", neighborhood.id)
    .select("id")
    .maybeSingle();

  if (error || !updated?.id || updated.id !== neighborhood.id) {
    logger.error("Failed to update neighborhood settings", error, { slug, neighborhoodId: neighborhood.id });
    return { success: false, error: "The neighborhood settings could not be saved. Refresh and try again." };
  }

  revalidatePath(`/neighborhoods/${slug}/settings`);
  revalidatePath(`/neighborhoods/${slug}`);
  return { success: true };
}
