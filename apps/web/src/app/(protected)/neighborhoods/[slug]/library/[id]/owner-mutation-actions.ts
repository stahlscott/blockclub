"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import type { ItemRemovalResult } from "@blockclub/shared";

export interface OwnerMutationState {
  success?: boolean;
  error?: string;
  conflict?: boolean;
}

function text(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function context() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  return getAuthContext(supabase, authUser);
}

function itemRemovalError(result: ItemRemovalResult): OwnerMutationState {
  switch (result.reason) {
    case "not_found":
      return { error: "This item is no longer available.", conflict: true };
    case "not_authorized":
      return { error: "You are not allowed to remove this item." };
    case "active_loan":
      return { error: "This item cannot be removed while it is actively borrowed.", conflict: true };
    case "conflict":
      return { error: "The item changed before it could be removed. Refresh and try again.", conflict: true };
    default:
      return { error: "The item could not be removed." };
  }
}

export async function softDeleteItem(
  _previous: OwnerMutationState,
  formData: FormData,
): Promise<OwnerMutationState> {
  const itemId = text(formData, "itemId");
  const slug = text(formData, "slug");
  if (!itemId || !slug) return { error: "Missing required fields" };

  const auth = await context();
  if (!auth) return { error: "You must be signed in" };
  if (auth.isImpersonating) {
    return { error: "Item removal is not available while impersonating a user." };
  }

  try {
    const supabase = await createClient();
    const { data: result, error } = await supabase.rpc("soft_delete_item", {
      p_item_id: itemId,
    });
    if (error) throw error;

    const typedResult = result as ItemRemovalResult | null;
    if (!typedResult?.success || typedResult.affected_item_count !== 1 || typedResult.item_id !== itemId) {
      return typedResult ? itemRemovalError(typedResult) : { error: "The item removal was not confirmed.", conflict: true };
    }

    revalidatePath(`/neighborhoods/${slug}/library`);
    revalidatePath(`/neighborhoods/${slug}/library/${itemId}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to remove item", error, { itemId });
    return { error: "The item could not be removed." };
  }
}

export async function updateLoanDueDate(
  _previous: OwnerMutationState,
  formData: FormData,
): Promise<OwnerMutationState> {
  const loanId = text(formData, "loanId");
  const itemId = text(formData, "itemId");
  const slug = text(formData, "slug");
  const dueDate = formData.get("noDueDate") === "true" ? null : text(formData, "dueDate");
  if (!loanId || !itemId || !slug) return { error: "Missing required fields" };
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: "Enter a valid due date" };

  const auth = await context();
  if (!auth) return { error: "You must be signed in" };
  try {
    const { data: loan } = await auth.queryClient
      .from("loans")
      .select("id, item_id, status, item:items!loans_item_id_fkey(id, owner_id, neighborhood_id, deleted_at)")
      .eq("id", loanId)
      .is("deleted_at", null)
      .maybeSingle();
    const item = Array.isArray(loan?.item) ? loan.item[0] : loan?.item;
    if (!loan || !item || loan.item_id !== itemId || item.id !== itemId || item.deleted_at || loan.status !== "active") {
      return { error: "This active loan is no longer available", conflict: true };
    }
    if (item.owner_id !== auth.effectiveUserId) return { error: "You are not allowed to edit this loan" };

    const { data, error } = await auth.queryClient
      .from("loans")
      .update({ due_date: dueDate })
      .eq("id", loan.id)
      .eq("item_id", item.id)
      .eq("status", "active")
      .select("id");
    if (error) throw error;
    if (!data || data.length !== 1) return { error: "The due date was not updated", conflict: true };
    revalidatePath(`/neighborhoods/${slug}/library/${item.id}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to update loan due date", error, { loanId, itemId });
    return { error: "The due date could not be updated" };
  }
}

export async function toggleItemAvailability(
  _previous: OwnerMutationState,
  formData: FormData,
): Promise<OwnerMutationState> {
  const itemId = text(formData, "itemId");
  const slug = text(formData, "slug");
  if (!itemId || !slug) return { error: "Missing required fields" };

  const auth = await context();
  if (!auth) return { error: "You must be signed in" };
  try {
    const { data: item } = await auth.queryClient
      .from("items")
      .select("id, owner_id, neighborhood_id, availability")
      .eq("id", itemId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!item || item.owner_id !== auth.effectiveUserId) return { error: "You are not allowed to update this item" };

    const { data: activeLoan } = await auth.queryClient
      .from("loans")
      .select("id")
      .eq("item_id", item.id)
      .in("status", ["requested", "approved", "active"])
      .is("deleted_at", null)
      .maybeSingle();
    if (activeLoan) return { error: "Availability cannot change while a loan request is open", conflict: true };

    const availability = item.availability === "available" ? "unavailable" : "available";
    const { data, error } = await auth.queryClient
      .from("items")
      .update({ availability })
      .eq("id", item.id)
      .eq("owner_id", auth.effectiveUserId)
      .is("deleted_at", null)
      .select("id");
    if (error) throw error;
    if (!data || data.length !== 1) return { error: "Availability was not updated", conflict: true };
    revalidatePath(`/neighborhoods/${slug}/library/${item.id}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to update item availability", error, { itemId });
    return { error: "Availability could not be updated" };
  }
}
