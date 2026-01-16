// Admin Supabase client using service role key
// This client bypasses Row-Level Security (RLS) policies
// IMPORTANT: Only use this in server-side code for staff admin operations

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Create a singleton admin client
let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  if (!adminClient) {
    adminClient = createSupabaseClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return adminClient;
}
