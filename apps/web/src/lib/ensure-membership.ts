import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureNeighborhoodMembership(
  supabase: SupabaseClient,
  userId: string,
  neighborhoodId: string,
): Promise<{ success: boolean; membershipId?: string; error?: string }> {
  const { data: existing, error: lookupError } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("neighborhood_id", neighborhoodId)
    .maybeSingle();
  if (lookupError) return { success: false, error: lookupError.message };
  if (existing?.id) return { success: true, membershipId: existing.id };

  const { data: inserted, error } = await supabase
    .from("memberships")
    .insert({ user_id: userId, neighborhood_id: neighborhoodId, role: "member", status: "pending", deleted_at: null })
    .select("id")
    .maybeSingle();
  if (error || !inserted?.id) return { success: false, error: error?.message || "Membership was not created." };
  return { success: true, membershipId: inserted.id };
}
