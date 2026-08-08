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
  if (!user.email) return { success: false, error: "Your account is missing an email address." };

  // The auth trigger is the primary creator. This insert is an idempotent
  // fallback for legacy users and never updates an existing profile.
  const { error: profileError } = await supabase.from("users").upsert({
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
  }, { onConflict: "id", ignoreDuplicates: true });

  if (profileError) {
    logger.error("Error creating user profile", profileError, {
      userId: user.id,
    });
    return { success: false, error: profileError.message };
  }

  return { success: true };
}
