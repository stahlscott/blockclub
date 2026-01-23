/**
 * Loan business logic and state machine.
 * Defines valid transitions and display helpers.
 */

import type { LoanStatus } from "./types";

/**
 * Human-readable display text for loan status.
 */
export function getLoanStatusDisplay(status: LoanStatus): string {
  const displays: Record<LoanStatus, string> = {
    requested: "Requested",
    approved: "Approved",
    active: "Borrowed",
    returned: "Returned",
    cancelled: "Cancelled",
  };
  return displays[status];
}

/**
 * Semantic color key for loan status.
 * Maps to CSS variables or design tokens.
 */
export function getLoanStatusColor(
  status: LoanStatus
): "warning" | "info" | "success" | "neutral" {
  const colors: Record<LoanStatus, "warning" | "info" | "success" | "neutral"> =
    {
      requested: "warning",
      approved: "info",
      active: "info",
      returned: "success",
      cancelled: "neutral",
    };
  return colors[status];
}

/**
 * Actions that can be taken on a loan.
 */
export type LoanAction =
  | "approve"
  | "decline"
  | "cancel"
  | "pickup"
  | "return";

/**
 * Valid status transitions based on action.
 */
const TRANSITIONS: Record<LoanStatus, Partial<Record<LoanAction, LoanStatus>>> =
  {
    requested: {
      approve: "approved",
      decline: "cancelled",
      cancel: "cancelled",
    },
    approved: {
      pickup: "active",
      cancel: "cancelled",
    },
    active: {
      return: "returned",
    },
    returned: {},
    cancelled: {},
  };

/**
 * Check if a loan can transition via the given action.
 */
export function canTransitionLoan(
  currentStatus: LoanStatus,
  action: LoanAction
): boolean {
  return TRANSITIONS[currentStatus][action] !== undefined;
}

/**
 * Get the resulting status after an action.
 * Returns null if the transition is invalid.
 */
export function getNextLoanStatus(
  currentStatus: LoanStatus,
  action: LoanAction
): LoanStatus | null {
  return TRANSITIONS[currentStatus][action] ?? null;
}

/**
 * Get available actions for a loan based on current status and role.
 */
export function getAvailableLoanActions(
  status: LoanStatus,
  isOwner: boolean,
  isBorrower: boolean
): LoanAction[] {
  const actions: LoanAction[] = [];

  if (status === "requested") {
    if (isOwner) {
      actions.push("approve", "decline");
    }
    if (isBorrower) {
      actions.push("cancel");
    }
  }

  if (status === "approved") {
    if (isOwner) {
      actions.push("pickup"); // Owner confirms borrower picked up
    }
    if (isBorrower) {
      actions.push("cancel");
    }
  }

  if (status === "active") {
    if (isOwner) {
      actions.push("return"); // Owner confirms item returned
    }
  }

  return actions;
}

/**
 * Check if a loan is in a "pending" state requiring action.
 */
export function isLoanPending(status: LoanStatus): boolean {
  return status === "requested" || status === "approved";
}

/**
 * Check if a loan is complete (returned or cancelled).
 */
export function isLoanComplete(status: LoanStatus): boolean {
  return status === "returned" || status === "cancelled";
}
