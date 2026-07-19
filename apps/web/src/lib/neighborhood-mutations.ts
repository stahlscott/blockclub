import type { NeighborhoodInsert, NeighborhoodSettings } from "@blockclub/shared";
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
  const client = createAdminClient();
  const { data, error } = await client
    .from("neighborhoods")
    .insert(record satisfies NeighborhoodInsert)
    .select("id")
    .maybeSingle();
  return { id: (data as { id: string } | null)?.id ?? null, error };
}
