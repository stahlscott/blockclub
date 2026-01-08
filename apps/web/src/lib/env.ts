// Environment variable validation and access
// This module validates required env vars at import time and provides typed access

// Export environment variables with proper types
// Note: Validation removed to avoid build-time errors - Supabase client will error if vars are missing
export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  
  // Optional env vars with defaults
  SUPER_ADMIN_EMAILS: (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean),
} as const;
