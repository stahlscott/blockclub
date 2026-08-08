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

type StaffNeighborhoodInsert = Record<string, unknown> & CreateNeighborhoodRecord;


export async function insertStaffNeighborhood(
  record: CreateNeighborhoodRecord,
): Promise<{ id: string | null; error: unknown }> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("neighborhoods")
    .insert(record as StaffNeighborhoodInsert)
    .select("id")
    .maybeSingle();
  return { id: (data as { id: string } | null)?.id ?? null, error };
}
