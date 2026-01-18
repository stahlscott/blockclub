"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { formatDateLocal } from "@/lib/date-utils";
import {
  notifyLoanApproved,
  notifyLoanDeclined,
  notifyLoanReturned,
} from "@/lib/email/notifications";

export interface LoanActionState {
  success?: boolean;
  error?: string;
}

/**
 * Approve a loan request.
 * Sets loan status to active and marks item as borrowed.
 * Sends notification to borrower.
 */
export async function approveLoan(
  _prevState: LoanActionState,
  formData: FormData
): Promise<LoanActionState> {
  const loanId = formData.get("loanId") as string;
  const itemId = formData.get("itemId") as string;
  const slug = formData.get("slug") as string;
  const dueDate = formData.get("dueDate") as string | null;
  const noDueDate = formData.get("noDueDate") === "true";

  if (!loanId || !itemId || !slug) {
    return { error: "Missing required fields" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  try {
    // Update loan to active
    const { error: loanError } = await supabase
      .from("loans")
      .update({
        status: "active",
        start_date: formatDateLocal(new Date()),
        due_date: noDueDate ? null : dueDate,
      })
      .eq("id", loanId);

    if (loanError) throw loanError;

    // Update item availability
    const { error: itemError } = await supabase
      .from("items")
      .update({ availability: "borrowed" })
      .eq("id", itemId);

    if (itemError) throw itemError;

    // Send notification (fire-and-forget)
    notifyLoanApproved(loanId).catch((err) =>
      logger.error("Failed to send loan approved notification", err, { loanId })
    );

    revalidatePath(`/neighborhoods/${slug}/library/${itemId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve loan";
    logger.error("Failed to approve loan", err, { loanId, itemId });
    return { error: message };
  }
}

/**
 * Decline a loan request.
 * Sets loan status to cancelled.
 * Sends notification to borrower.
 */
export async function declineLoan(
  _prevState: LoanActionState,
  formData: FormData
): Promise<LoanActionState> {
  const loanId = formData.get("loanId") as string;
  const itemId = formData.get("itemId") as string;
  const slug = formData.get("slug") as string;

  if (!loanId || !itemId || !slug) {
    return { error: "Missing required fields" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  try {
    // Decline/cancel the request
    const { error: loanError } = await supabase
      .from("loans")
      .update({ status: "cancelled" })
      .eq("id", loanId);

    if (loanError) throw loanError;

    // Send notification (fire-and-forget)
    notifyLoanDeclined(loanId).catch((err) =>
      logger.error("Failed to send loan declined notification", err, { loanId })
    );

    revalidatePath(`/neighborhoods/${slug}/library/${itemId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to decline loan";
    logger.error("Failed to decline loan", err, { loanId, itemId });
    return { error: message };
  }
}

/**
 * Mark a loan as returned.
 * Sets loan status to returned and marks item as available.
 * Sends notification to owner.
 */
export async function markLoanReturned(
  _prevState: LoanActionState,
  formData: FormData
): Promise<LoanActionState> {
  const loanId = formData.get("loanId") as string;
  const itemId = formData.get("itemId") as string;
  const slug = formData.get("slug") as string;

  if (!loanId || !itemId || !slug) {
    return { error: "Missing required fields" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  try {
    // Mark as returned
    const { error: loanError } = await supabase
      .from("loans")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
      })
      .eq("id", loanId);

    if (loanError) throw loanError;

    // Mark item as available
    const { error: itemError } = await supabase
      .from("items")
      .update({ availability: "available" })
      .eq("id", itemId);

    if (itemError) throw itemError;

    // Send notification (fire-and-forget)
    notifyLoanReturned(loanId).catch((err) =>
      logger.error("Failed to send loan returned notification", err, { loanId })
    );

    revalidatePath(`/neighborhoods/${slug}/library/${itemId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark loan as returned";
    logger.error("Failed to mark loan as returned", err, { loanId, itemId });
    return { error: message };
  }
}
