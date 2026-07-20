"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";

export type MembershipModerationResult =
  | { success: true; data: { membershipId: string; neighborhoodId: string; status: "active" | "inactive"; deletedAt: string | null } }
  | { success: false; code: string; error: string };

export async function moderateMembership(input: {
  membershipId: string;
  neighborhoodSlug: string;
  decision: "approve" | "decline";
}): Promise<MembershipModerationResult> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { success: false, code: "UNAUTHENTICATED", error: "You must be signed in." };

  const auth = await getAuthContext(supabase, authUser);
  if (auth.isStaffAdmin) {
    return { success: false, code: "FORBIDDEN", error: "Staff moderation uses the staff membership workflow." };
  }

  const { data: neighborhood } = await auth.queryClient
    .from("neighborhoods")
    .select("id")
    .eq("slug", input.neighborhoodSlug)
    .maybeSingle();
  if (!neighborhood) return { success: false, code: "NOT_FOUND", error: "Neighborhood not found." };

  const { data: actorMembership } = await auth.queryClient
    .from("memberships")
    .select("id")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", auth.effectiveUserId)
    .eq("status", "active")
    .eq("role", "admin")
    .is("deleted_at", null)
    .maybeSingle();
  if (!actorMembership) return { success: false, code: "FORBIDDEN", error: "You are not allowed to moderate this neighborhood." };

  const { data: result, error } = await supabase.rpc("moderate_pending_membership", {
    p_membership_id: input.membershipId,
    p_decision: input.decision,
  });
  if (error) {
    logger.error("Failed to moderate membership", error, { membershipId: input.membershipId, neighborhoodId: neighborhood.id });
    return { success: false, code: "SERVER_ERROR", error: "The membership could not be updated." };
  }
  if (!result?.success || result.affected_membership_count !== 1 || result.membership_id !== input.membershipId || result.neighborhood_id !== neighborhood.id) {
    return { success: false, code: result?.reason === "not_authorized_or_conflict" ? "CONFLICT" : "SERVER_ERROR", error: "This membership request is no longer pending. Refresh and try again." };
  }

  revalidatePath(`/neighborhoods/${input.neighborhoodSlug}/members/pending`);
  revalidatePath(`/neighborhoods/${input.neighborhoodSlug}/members`);
  return { success: true, data: { membershipId: result.membership_id, neighborhoodId: result.neighborhood_id, status: result.status === "active" ? "active" : "inactive", deletedAt: result.deleted_at } };
}
