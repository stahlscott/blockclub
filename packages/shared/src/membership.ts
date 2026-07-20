import type { MembershipStatus } from "./types";

export interface MembershipStatusCopy {
  label: string;
  nextStep: string;
}

const STATUS_COPY: Record<MembershipStatus, MembershipStatusCopy> = {
  pending: { label: "Waiting for approval", nextStep: "A neighborhood admin needs to approve your request." },
  active: { label: "Active member", nextStep: "You can participate in this neighborhood." },
  inactive: { label: "Inactive membership", nextStep: "Ask a neighborhood admin to restore your membership." },
  moved_out: { label: "Moved out", nextStep: "You can rejoin this neighborhood from its join page." },
};

export function getMembershipStatusCopy(status: MembershipStatus): MembershipStatusCopy {
  return STATUS_COPY[status];
}
