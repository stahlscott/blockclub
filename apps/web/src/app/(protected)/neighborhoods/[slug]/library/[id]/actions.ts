"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface RequestLoanState {
  success?: boolean;
  error?: string;
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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Verify the item exists and is available
  const { data: item } = await supabase
    .from("items")
    .select("id, availability, neighborhood_id")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { error: "Item not found" };
  }

  if (item.availability !== "available") {
    return { error: "Item is not available for borrowing" };
  }

  // Check if user already has a pending/active request for this item
  const { data: existingLoan } = await supabase
    .from("loans")
    .select("id, status")
    .eq("item_id", itemId)
    .eq("borrower_id", user.id)
    .in("status", ["requested", "approved", "active"])
    .single();

  if (existingLoan) {
    return { error: "You already have an active request for this item" };
  }

  const { error: insertError } = await supabase.from("loans").insert({
    item_id: itemId,
    borrower_id: user.id,
    status: "requested",
    notes,
  });

  if (insertError) {
    logger.error("Loan request error", insertError, { itemId });
    return { error: insertError.message };
  }

  revalidatePath(`/neighborhoods/${slug}/library/${itemId}`);
  return { success: true };
}
