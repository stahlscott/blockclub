"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";

export async function switchNeighborhood(neighborhoodId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const { effectiveUserId, queryClient } = await getAuthContext(supabase, authUser);

  const { data: membership, error: membershipError } = await queryClient
    .from("memberships")
    .select("id")
    .eq("user_id", effectiveUserId)
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (membershipError) {
    logger.error("Failed to verify neighborhood membership", membershipError, { neighborhoodId, effectiveUserId });
    return { success: false, error: "The neighborhood could not be selected." };
  }
  if (!membership) {
    return { success: false, error: "You are not an active member of that neighborhood." };
  }

  const { data, error } = await queryClient
    .from("users")
    .update({ primary_neighborhood_id: neighborhoodId })
    .eq("id", effectiveUserId)
    .select("primary_neighborhood_id")
    .maybeSingle();

  if (error) {
    logger.error("Failed to update primary neighborhood", error, { neighborhoodId, effectiveUserId });
    return { success: false, error: "The neighborhood could not be selected." };
  }
  if (!data || data.primary_neighborhood_id !== neighborhoodId) {
    logger.error("Neighborhood switch affected no user row", { neighborhoodId, effectiveUserId });
    return { success: false, error: "The neighborhood selection was not saved. Please try again." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
