/**
 * @deprecated Import from @/lib/queries instead
 * This file is kept for backwards compatibility during migration.
 */

export type {
  LoanRequestedRow,
  LoanWithBorrowerRow,
  LoanReturnedRow,
  OwnerRow,
} from "@/lib/queries";

export {
  hasNeighborhood,
  isNotificationPreferences,
} from "@/lib/queries";

// Note: MembershipWithNeighborhoodRow is now MembershipWithNeighborhood in @/lib/queries/types
export type { MembershipWithNeighborhood as MembershipWithNeighborhoodRow } from "@/lib/queries";
