/**
 * Centralized queries for the users table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, User } from "@blockclub/shared";

type Client = SupabaseClient<Database>;

/**
 * Get a user by ID.
 */
export async function getUserById(client: Client, userId: string) {
  const result = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return result as { data: User | null; error: typeof result.error };
}

/**
 * Get a user by email.
 */
export async function getUserByEmail(client: Client, email: string) {
  const result = await client
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  return result as { data: User | null; error: typeof result.error };
}
