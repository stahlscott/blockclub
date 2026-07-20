"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { ensureUserProfile } from "@/lib/ensure-profile";
import { logger } from "@/lib/logger";

export interface MembershipJoinData {
  membershipId: string;
  neighborhoodId: string;
  status: "pending" | "active";
  isRejoin: boolean;
}

export type MembershipJoinResult =
  | { success: true; data: MembershipJoinData }
  | { success: false; code: string; error: string };

function failure(code: string, error: string): MembershipJoinResult {
  return { success: false, code, error };
}

export async function requestMembership(input: { neighborhoodId: string }): Promise<MembershipJoinResult> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return failure("UNAUTHENTICATED", "You must be signed in to join a neighborhood.");

  const auth = await getAuthContext(supabase, authUser);
  const { data: neighborhood } = await auth.queryClient
    .from("neighborhoods")
    .select("id")
    .eq("id", input.neighborhoodId)
    .maybeSingle();
  if (!neighborhood) return failure("NOT_FOUND", "Neighborhood not found.");

  const profile = await ensureUserProfile(auth.queryClient, authUser);
  if (!profile.success) return failure("PROFILE_ERROR", profile.error || "Your profile could not be prepared.");

  const { data: existing } = await auth.queryClient
    .from("memberships")
    .select("id, status, deleted_at")
    .eq("user_id", auth.effectiveUserId)
    .eq("neighborhood_id", input.neighborhoodId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) return failure("ALREADY_MEMBER", "You already have a membership request for this neighborhood.");

  const { data: inserted, error: insertError } = await auth.queryClient
    .from("memberships")
    .insert({ user_id: auth.effectiveUserId, neighborhood_id: input.neighborhoodId, role: "member", status: "pending", deleted_at: null })
    .select("id")
    .maybeSingle();
  if (insertError || !inserted?.id) {
    logger.error("Failed to create membership request", insertError, { neighborhoodId: input.neighborhoodId, userId: auth.effectiveUserId });
    return failure("DATABASE_ERROR", "Your membership request could not be created.");
  }

  const { data: membership, error: membershipError } = await auth.queryClient
    .from("memberships")
    .select("id, neighborhood_id, status")
    .eq("id", inserted.id)
    .eq("user_id", auth.effectiveUserId)
    .is("deleted_at", null)
    .maybeSingle();
  if (membershipError || !membership || (membership.status !== "pending" && membership.status !== "active")) {
    logger.error("Failed to confirm membership request", membershipError, { membershipId: inserted.id });
    return failure("CONFLICT", "The membership request could not be confirmed. Please try again.");
  }

  revalidatePath(`/join/${input.neighborhoodId}`);
  return { success: true, data: { membershipId: membership.id, neighborhoodId: membership.neighborhood_id, status: membership.status, isRejoin: false } };
}

export async function rejoinMembership(input: { membershipId: string }): Promise<MembershipJoinResult> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return failure("UNAUTHENTICATED", "You must be signed in to rejoin.");

  const auth = await getAuthContext(supabase, authUser);
  const { data: membership } = await auth.queryClient
    .from("memberships")
    .select("id, user_id, neighborhood_id, role, status, deleted_at, neighborhood:neighborhoods(id, settings)")
    .eq("id", input.membershipId)
    .eq("user_id", auth.effectiveUserId)
    .eq("status", "moved_out")
    .is("deleted_at", null)
    .maybeSingle();
  if (!membership) return failure("NOT_FOUND", "That membership is no longer eligible for rejoining.");

  const neighborhood = Array.isArray(membership.neighborhood) ? membership.neighborhood[0] : membership.neighborhood;
  if (!neighborhood) return failure("NOT_FOUND", "Neighborhood not found.");
  const { count: activeMemberCount } = await auth.queryClient
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("neighborhood_id", membership.neighborhood_id)
    .eq("status", "active")
    .is("deleted_at", null);
  const status = activeMemberCount === 0 || neighborhood.settings?.require_approval === false ? "active" : "pending";

  const { data: updated, error } = await auth.queryClient
    .from("memberships")
    .update({ status })
    .eq("id", membership.id)
    .eq("user_id", auth.effectiveUserId)
    .eq("neighborhood_id", membership.neighborhood_id)
    .eq("status", "moved_out")
    .is("deleted_at", null)
    .select("id, neighborhood_id, status")
    .maybeSingle();
  if (error || !updated || updated.status !== status) {
    logger.error("Failed to rejoin membership", error, { membershipId: input.membershipId, userId: auth.effectiveUserId });
    return failure("CONFLICT", "Your membership could not be reactivated. Please refresh and try again.");
  }

  revalidatePath(`/dashboard`);
  return { success: true, data: { membershipId: updated.id, neighborhoodId: updated.neighborhood_id, status: updated.status, isRejoin: true } };
}
