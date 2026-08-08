"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { getActiveMembership, getBorrowerLoanForItem, getItemOwnership } from "@/lib/queries";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS, validateLength } from "@blockclub/shared";
import type { LoanInsert } from "@blockclub/shared";
import { notifyLoanRequested } from "@/lib/email/notifications";

export interface RequestLoanState {
  success?: boolean;
  error?: string;
  conflict?: boolean;
}

export async function requestLoan(
  _prevState: RequestLoanState,
  formData: FormData
): Promise<RequestLoanState> {
  const itemId = formData.get("itemId") as string;
  const slug = formData.get("slug") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!itemId || !slug) {
    return { error: "Missing required fields" };
  }

  const notesError = notes ? validateLength(notes, "Loan notes", MAX_LENGTHS.loanNotes) : null;
  if (notesError) return { error: notesError };

  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const { effectiveUserId, queryClient, isStaffAdmin, isImpersonating } =
    await getAuthContext(supabase, authUser);

  // Verify the item exists and is available
  const { data: item } = await getItemOwnership(queryClient, itemId);

  if (!item) {
    return { error: "Item not found" };
  }

  if (item.owner_id === effectiveUserId) {
    return { error: "You cannot borrow your own item" };
  }

  if (item.availability !== "available") {
    return { error: "Item is not available for borrowing" };
  }

  const { data: membership } = await getActiveMembership(
    queryClient,
    item.neighborhood_id,
    effectiveUserId,
  );
  if (!membership) return { error: "You must be an active neighborhood member to borrow items" };

  // Check if user already has a pending/active request for this item
  const { data: existingLoan } = await getBorrowerLoanForItem(
    queryClient,
    itemId,
    effectiveUserId,
    item.neighborhood_id,
  );

  if (existingLoan) {
    return { error: "You already have an active request for this item" };
  }

  const insertData: LoanInsert = {
    item_id: itemId,
    borrower_id: effectiveUserId,
    status: "requested",
    notes,
    deleted_at: null,
  };
  if (isStaffAdmin && isImpersonating) insertData.staff_actor_id = authUser.id;

  const { data: newLoan, error: insertError } = await queryClient
    .from("loans")
    .insert(insertData)
    .select("id")
    .maybeSingle();

  if (insertError) {
    logger.error("Loan request error", insertError, { itemId });
    return { error: insertError.message };
  }
  if (!newLoan?.id) {
    return { error: "The loan request was not created. Please refresh and try again.", conflict: true };
  }

  // Send notification to item owner (fire-and-forget)
  if (newLoan) {
    notifyLoanRequested(newLoan.id).catch((err) =>
      logger.error("Failed to send loan requested notification", err, {
        loanId: newLoan.id,
      })
    );
  }

  revalidatePath(`/neighborhoods/${slug}/library/${itemId}`);
  return { success: true };
}
