import type { SupabaseClient } from "@supabase/supabase-js";
import type { NeighborhoodSettings } from "@blockclub/shared";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreateNeighborhoodRecord {
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  settings: NeighborhoodSettings;
  created_by: string;
  staff_actor_id: string;
}

export async function insertStaffNeighborhood(
  record: CreateNeighborhoodRecord,
): Promise<{ id: string | null; error: unknown }> {
  const client = createAdminClient() as SupabaseClient;
  const { data, error } = await client
    .from("neighborhoods")
    .insert(record as never)
    .select("id")
    .maybeSingle();
  return { id: (data as { id: string } | null)?.id ?? null, error };
}
