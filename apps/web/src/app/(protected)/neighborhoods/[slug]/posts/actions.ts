"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { getImpersonationContext } from "@/lib/impersonation";
import { logger } from "@/lib/logger";

interface CreatePostData {
  slug: string;
  content: string;
  imageUrl: string | null;
  expiresAt: string | null;
}

export async function createPost(data: CreatePostData): Promise<{ success: boolean; error?: string }> {
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
      return { success: false, error: "You must be a member to post" };
    }
  }

  // Create post with correct author and audit trail
  const insertData: Record<string, unknown> = {
    neighborhood_id: neighborhood.id,
    author_id: effectiveUserId,
    content: data.content.trim(),
    image_url: data.imageUrl || null,
    expires_at: data.expiresAt ? new Date(data.expiresAt + "T23:59:59").toISOString() : null,
  };

  // Add audit trail if staff admin is acting on behalf of another user
  if (userIsStaffAdmin && isImpersonating) {
    insertData.staff_actor_id = authUser.id;
  }

  const { error: insertError } = await queryClient.from("posts").insert(insertData);

  if (insertError) {
    logger.error("Error creating post", insertError);
    return { success: false, error: insertError.message };
  }

  revalidatePath(`/neighborhoods/${data.slug}/posts`);
  return { success: true };
}
