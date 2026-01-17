"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { getImpersonationContext } from "@/lib/impersonation";
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
