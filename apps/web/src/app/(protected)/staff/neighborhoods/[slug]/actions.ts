"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
export async function approveMembership(
  membershipId: string,
  neighborhoodSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    return { success: false, error: "Unauthorized" };
  }

  const adminSupabase = createAdminClient();
    const { error } = await (adminSupabase as any)
    .from("memberships")
    .update({ status: "active" })
    .eq("id", membershipId);

  if (error) {
    logger.error("Failed to approve membership", error);
    return { success: false, error: "Failed to approve membership" };
  }

  revalidatePath(`/staff/neighborhoods/${neighborhoodSlug}`);
  return { success: true };
}

export async function declineMembership(
  membershipId: string,
  neighborhoodSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    return { success: false, error: "Unauthorized" };
  }

  const adminSupabase = createAdminClient();
    const { error } = await (adminSupabase as any)
    .from("memberships")
    .update({ status: "inactive", deleted_at: new Date().toISOString() })
    .eq("id", membershipId);

  if (error) {
    logger.error("Failed to decline membership", error);
    return { success: false, error: "Failed to decline membership" };
  }

  revalidatePath(`/staff/neighborhoods/${neighborhoodSlug}`);
  return { success: true };
}

export async function removeMembership(
  membershipId: string,
  neighborhoodSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    return { success: false, error: "Unauthorized" };
  }

  const adminSupabase = createAdminClient();
    const { error } = await (adminSupabase as any)
    .from("memberships")
    .update({ status: "inactive", deleted_at: new Date().toISOString() })
    .eq("id", membershipId);

  if (error) {
    logger.error("Failed to remove membership", error);
    return { success: false, error: "Failed to remove membership" };
  }

  revalidatePath(`/staff/neighborhoods/${neighborhoodSlug}`);
  return { success: true };
}
