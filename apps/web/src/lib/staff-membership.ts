import type { MembershipRole, StaffMembershipOperationResult } from "@blockclub/shared";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StaffMembershipOperationInput {
  operation: string;
  membershipId?: string | null;
  targetUserId?: string | null;
  neighborhoodId?: string | null;
  role?: MembershipRole | null;
  staffActorId: string;
}

export async function runStaffMembershipOperation(
  input: StaffMembershipOperationInput,
): Promise<{ data: StaffMembershipOperationResult | null; error: unknown }> {
  const client = createAdminClient();
  const { data, error } = await client.rpc("staff_membership_operation", {
    p_operation: input.operation,
    p_membership_id: input.membershipId ?? null,
    p_target_user_id: input.targetUserId ?? null,
    p_neighborhood_id: input.neighborhoodId ?? null,
    p_role: input.role ?? null,
    p_staff_actor_id: input.staffActorId,
  });
  return { data: data as StaffMembershipOperationResult | null, error };
}
