"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";

interface SaveGuideData {
  neighborhoodId: string;
  title: string;
  content: string;
  userId: string;
}

export async function saveGuide(
  data: SaveGuideData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const {
    isStaffAdmin: userIsStaffAdmin,
    isImpersonating,
    effectiveUserId,
    queryClient,
  } = await getAuthContext(supabase, authUser);

  // Verify admin access (staff admins without impersonation bypass, impersonating staff need admin role)
  if (!userIsStaffAdmin || isImpersonating) {
    const { data: membership } = await queryClient
      .from("memberships")
      .select("id, role")
      .eq("neighborhood_id", data.neighborhoodId)
      .eq("user_id", effectiveUserId)
      .eq("status", "active")
      .is("deleted_at", null)
      .single();

    if (!membership || membership.role !== "admin") {
      return { success: false, error: "Only admins can edit the guide" };
    }
  }

  // Get neighborhood slug for revalidation
  const { data: neighborhood } = await queryClient
    .from("neighborhoods")
    .select("slug")
    .eq("id", data.neighborhoodId)
    .single();

  if (!neighborhood) {
    return { success: false, error: "Neighborhood not found" };
  }

  // Check if guide exists
  const { data: existingGuide } = await queryClient
    .from("neighborhood_guides")
    .select("id")
    .eq("neighborhood_id", data.neighborhoodId)
    .maybeSingle();

  if (existingGuide) {
    // Update existing guide
    const { error: updateError } = await queryClient
      .from("neighborhood_guides")
      .update({
        title: data.title,
        content: data.content,
        updated_at: new Date().toISOString(),
        updated_by: effectiveUserId,
      })
      .eq("id", existingGuide.id);

    if (updateError) {
      logger.error("Error updating guide", updateError);
      return { success: false, error: updateError.message };
    }
  } else {
    // Create new guide
    const { error: insertError } = await queryClient
      .from("neighborhood_guides")
      .insert({
        neighborhood_id: data.neighborhoodId,
        title: data.title,
        content: data.content,
        updated_by: effectiveUserId,
      });

    if (insertError) {
      logger.error("Error creating guide", insertError);
      return { success: false, error: insertError.message };
    }
  }

  revalidatePath(`/neighborhoods/${neighborhood.slug}/guide`);
  return { success: true };
}
