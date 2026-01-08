import { SupabaseClient, User } from "@supabase/supabase-js";
import { logger } from "./logger";

/**
 * Ensures a user profile exists in the public.users table.
 * Creates one if it doesn't exist (for users who signed up before profile creation was added).
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ success: boolean; error?: string }> {
  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existingProfile) {
    return { success: true };
  }

  // Create profile
  const { error: profileError } = await supabase.from("users").insert({
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
    avatar_url: null,
    bio: null,
    phone: null,
    address: null,
    unit: null,
    move_in_year: null,
    children: null,
    pets: null,
  });

  if (profileError) {
    logger.error("Error creating user profile", profileError, {
      userId: user.id,
    });
    return { success: false, error: profileError.message };
  }

  return { success: true };
}
