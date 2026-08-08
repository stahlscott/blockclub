"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdminUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import type { MembershipRole } from "@blockclub/shared";
import { runStaffMembershipOperation } from "@/lib/staff-membership";

interface StaffMembershipActionResult {
  success: boolean;
  error?: string;
}

async function getStaffActor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isStaffAdminUser(createAdminClient(), user.id))) return null;
  return user;
}

async function runMembershipOperation(
  operation: string,
  membershipId: string,
  neighborhoodSlug: string,
  role?: MembershipRole,
): Promise<StaffMembershipActionResult> {
  const actor = await getStaffActor();
  if (!actor) return { success: false, error: "Unauthorized" };

  const { data, error } = await runStaffMembershipOperation({
    operation,
    membershipId,
    role,
    staffActorId: actor.id,
  });

  if (error || !data?.success || data.affected_membership_count !== 1) {
    logger.error(`Failed to ${operation} membership`, error, { membershipId, operation });
    return { success: false, error: data?.reason || `Failed to ${operation} membership` };
  }

  revalidatePath(`/staff/neighborhoods/${neighborhoodSlug}`);
  return { success: true };
}

export async function approveMembership(
  membershipId: string,
  neighborhoodSlug: string,
): Promise<StaffMembershipActionResult> {
  return runMembershipOperation("approve", membershipId, neighborhoodSlug);
}

export async function declineMembership(
  membershipId: string,
  neighborhoodSlug: string,
): Promise<StaffMembershipActionResult> {
  return runMembershipOperation("decline", membershipId, neighborhoodSlug);
}

export async function removeMembership(
  membershipId: string,
  neighborhoodSlug: string,
): Promise<StaffMembershipActionResult> {
  return runMembershipOperation("remove", membershipId, neighborhoodSlug);
}
