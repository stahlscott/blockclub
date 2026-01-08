// Environment variable validation and access
// This module validates required env vars at import time and provides typed access

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
] as const;

// Validate required env vars
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}\n` +
      `Please check your .env.local file or deployment environment variables.`
    );
  }
}

// Export validated environment variables with proper types
export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  
  // Optional env vars with defaults
  SUPER_ADMIN_EMAILS: (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean),
} as const;
