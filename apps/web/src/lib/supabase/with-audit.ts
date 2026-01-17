/**
 * Audit trail helper for staff impersonation
 *
 * When a staff admin is impersonating a user and performs a mutation,
 * this helper adds the staff_actor_id to the data for audit purposes.
 */

import { getImpersonationContext } from "@/lib/impersonation";

export interface AuditContext {
  staffActorId?: string;
}

/**
 * Get the audit context for the current request.
 * Returns the staff user's ID if they are impersonating.
 */
export async function getAuditContext(): Promise<AuditContext> {
  const context = await getImpersonationContext();

  if (context?.isImpersonating) {
    return { staffActorId: context.staffUserId };
  }

  return {};
}

/**
 * Wrap data with staff_actor_id if the current user is impersonating.
 * Use this when inserting or updating records that need an audit trail.
 *
 * @example
 * const data = await withStaffAudit({
 *   name: "Drill",
 *   owner_id: userId,
 *   neighborhood_id: neighborhoodId,
 * });
 * await supabase.from("items").insert(data);
 */
export async function withStaffAudit<T extends Record<string, unknown>>(
  data: T
): Promise<T & { staff_actor_id?: string }> {
  const context = await getAuditContext();

  if (context.staffActorId) {
    return {
      ...data,
      staff_actor_id: context.staffActorId,
    };
  }

  return data;
}
