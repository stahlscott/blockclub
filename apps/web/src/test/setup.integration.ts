import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });

// The repository preflight supplies these values and rejects non-local targets by default.
if (!process.env.SUPABASE_INTEGRATION_URL || !process.env.SUPABASE_INTEGRATION_ANON_KEY || !process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY) {
  throw new Error(
    "Integration tests require SUPABASE_INTEGRATION_URL, SUPABASE_INTEGRATION_ANON_KEY, and SUPABASE_INTEGRATION_SERVICE_ROLE_KEY. Run the repository integration preflight."
  );
}
