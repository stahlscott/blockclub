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

  // Update the effective user's primary neighborhood
  const { error } = await queryClient
    .from("users")
    .update({ primary_neighborhood_id: neighborhoodId })
    .eq("id", effectiveUserId);

  if (error) {
    logger.error("Failed to update primary neighborhood", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
