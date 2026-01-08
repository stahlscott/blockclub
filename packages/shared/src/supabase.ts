import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

export type TypedSupabaseClient = SupabaseClient<Database>;

let supabaseClient: TypedSupabaseClient | null = null;

/**
 * Get or create a singleton Supabase client for client-side usage.
 * Uses the publishable key (safe to expose in browser/app).
 */
export function getSupabaseClient(url?: string, publishableKey?: string): TypedSupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = 
    url || 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.EXPO_PUBLIC_SUPABASE_URL;
  
  const supabasePublishableKey = 
    publishableKey || 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (web) or EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (mobile)"
    );
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabasePublishableKey);
  return supabaseClient;
}

/**
 * Create a new Supabase client instance (useful for server-side or isolated usage).
 * Does not cache the client.
 * 
 * @param url - Supabase project URL
 * @param key - Publishable key for client-side, or secret key for server-side
 */
export function createSupabaseClient(url: string, key: string): TypedSupabaseClient {
  return createClient<Database>(url, key);
}

/**
 * Create a Supabase client for server-side operations using the secret key.
 * NEVER expose the secret key to the client.
 */
export function createSupabaseServerClient(url: string, secretKey: string): TypedSupabaseClient {
  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Re-export Supabase types
export type { SupabaseClient } from "@supabase/supabase-js";
export type { TypedSupabaseClient as SupabaseClientTyped };
