"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { formatDateLocal } from "@/lib/date-utils";
import {
  notifyLoanApproved,
  notifyLoanDeclined,
  notifyLoanReturned,
} from "@/lib/email/notifications";
import type { LoanOperationResult } from "@blockclub/shared";

export interface LoanActionState {
  success?: boolean;
  error?: string;
  conflict?: boolean;
}

function getRequiredText(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function resultError(result: LoanOperationResult): LoanActionState {
  switch (result.reason) {
    case "not_authorized":
      return { error: "You are not allowed to manage this loan." };
    case "not_found":
      return { error: "This loan is no longer available.", conflict: true };
    case "invalid_transition":
      return { error: "This loan has already changed and needs a refresh.", conflict: true };
    case "conflict":
      return { error: "This loan changed before your action completed. Refresh and try again.", conflict: true };
    default:
      return { error: "The loan could not be updated." };
  }
}

async function getMutationContext() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/signin");
  return getAuthContext(supabase, authUser);
}

export async function approveLoan(
  _prevState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const loanId = getRequiredText(formData, "loanId");
  const slug = getRequiredText(formData, "slug");
  const itemIdHint = getRequiredText(formData, "itemId");
  if (!loanId || !slug) return { error: "Missing required loan fields" };

  try {
    const { queryClient } = await getMutationContext();
    const { data: result, error } = await queryClient.rpc("approve_loan", { p_loan_id: loanId });
    if (error) throw error;
    if (!result?.success || !result.loan_id || result.affected_loan_count !== 1) {
      return result ? resultError(result) : { error: "The loan approval was not confirmed.", conflict: true };
    }

    notifyLoanApproved(result.loan_id).catch((notificationError) =>
      logger.error("Failed to send loan approved notification", notificationError, { loanId: result.loan_id }),
    );
    revalidatePath(`/neighborhoods/${slug}/library/${itemIdHint ?? result.item_id ?? ""}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to approve loan", error, { loanId });
    return { error: "The loan could not be approved." };
  }
}

export async function activateLoan(
  _prevState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const loanId = getRequiredText(formData, "loanId");
  const slug = getRequiredText(formData, "slug");
  const itemIdHint = getRequiredText(formData, "itemId");
  const dueDateValue = formData.get("dueDate");
  const dueDate = formData.get("noDueDate") === "true" ? null : typeof dueDateValue === "string" && dueDateValue.length > 0 ? dueDateValue : null;
  if (!loanId || !slug) return { error: "Missing required loan fields" };

  try {
    const { queryClient } = await getMutationContext();
    const { data: result, error } = await queryClient.rpc("activate_loan", {
      p_loan_id: loanId,
      p_start_date: formatDateLocal(new Date()),
      p_due_date: dueDate,
    });
    if (error) throw error;
    if (!result?.success || result.affected_loan_count !== 1 || result.affected_item_count !== 1) {
      return result ? resultError(result) : { error: "The pickup was not confirmed.", conflict: true };
    }

    revalidatePath(`/neighborhoods/${slug}/library/${itemIdHint ?? result.item_id ?? ""}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to activate loan", error, { loanId });
    return { error: "The pickup could not be confirmed." };
  }
}

export async function declineLoan(
  _prevState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const loanId = getRequiredText(formData, "loanId");
  const slug = getRequiredText(formData, "slug");
  const itemIdHint = getRequiredText(formData, "itemId");
  if (!loanId || !slug) return { error: "Missing required loan fields" };

  try {
    const { queryClient } = await getMutationContext();
    const { data: result, error } = await queryClient.rpc("decline_loan", { p_loan_id: loanId });
    if (error) throw error;
    if (!result?.success || result.affected_loan_count !== 1 || !result.loan_id) {
      return result ? resultError(result) : { error: "The decline was not confirmed.", conflict: true };
    }

    notifyLoanDeclined(result.loan_id).catch((notificationError) =>
      logger.error("Failed to send loan declined notification", notificationError, { loanId: result.loan_id }),
    );
    revalidatePath(`/neighborhoods/${slug}/library/${itemIdHint ?? result.item_id ?? ""}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to decline loan", error, { loanId });
    return { error: "The loan could not be declined." };
  }
}

export async function cancelLoan(
  _prevState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const loanId = getRequiredText(formData, "loanId");
  const slug = getRequiredText(formData, "slug");
  const itemIdHint = getRequiredText(formData, "itemId");
  if (!loanId || !slug) return { error: "Missing required loan fields" };

  try {
    const { queryClient } = await getMutationContext();
    const { data: result, error } = await queryClient.rpc("cancel_loan", { p_loan_id: loanId });
    if (error) throw error;
    if (!result?.success || result.affected_loan_count !== 1) {
      return result ? resultError(result) : { error: "The cancellation was not confirmed.", conflict: true };
    }

    revalidatePath(`/neighborhoods/${slug}/library/${itemIdHint ?? result.item_id ?? ""}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to cancel loan", error, { loanId });
    return { error: "The loan could not be cancelled." };
  }
}

export async function markLoanReturned(
  _prevState: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  const loanId = getRequiredText(formData, "loanId");
  const slug = getRequiredText(formData, "slug");
  const itemIdHint = getRequiredText(formData, "itemId");
  if (!loanId || !slug) return { error: "Missing required loan fields" };

  try {
    const { queryClient } = await getMutationContext();
    const { data: result, error } = await queryClient.rpc("return_loan", { p_loan_id: loanId });
    if (error) throw error;
    if (!result?.success || result.affected_loan_count !== 1 || result.affected_item_count !== 1 || !result.loan_id) {
      return result ? resultError(result) : { error: "The return was not confirmed.", conflict: true };
    }

    notifyLoanReturned(result.loan_id).catch((notificationError) =>
      logger.error("Failed to send loan returned notification", notificationError, { loanId: result.loan_id }),
    );
    revalidatePath(`/neighborhoods/${slug}/library/${itemIdHint ?? result.item_id ?? ""}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to return loan", error, { loanId });
    return { error: "The loan could not be marked returned." };
  }
}
