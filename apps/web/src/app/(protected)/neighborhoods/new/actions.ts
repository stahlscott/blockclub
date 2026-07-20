"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdminUser } from "@/lib/auth";
import { MAX_LENGTHS, validateLength } from "@blockclub/shared";
import { ensureUserProfile } from "@/lib/ensure-profile";
import { insertStaffNeighborhood } from "@/lib/neighborhood-mutations";

export interface CreateNeighborhoodInput {
  name: string;
  description: string;
  location: string;
  requireApproval: boolean;
}

export async function createNeighborhood(input: CreateNeighborhoodInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };
  if (!(await isStaffAdminUser(createAdminClient(), user.id))) return { success: false, error: "Only staff admins can create neighborhoods." };
  const profile = await ensureUserProfile(supabase, user);
  if (!profile.success) return profile;

  const name = input.name.trim();
  const description = input.description.trim();
  const location = input.location.trim();
  const nameError = validateLength(name, "Neighborhood name", MAX_LENGTHS.neighborhoodName);
  if (!name) return { success: false, error: "Neighborhood name cannot be empty." };
  if (nameError) return { success: false, error: nameError };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) return { success: false, error: "Choose a name that produces a valid URL." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("neighborhoods").select("id").eq("slug", slug).maybeSingle();
  if (existing) return { success: false, error: "A neighborhood with this name already exists." };

  const { id, error } = await insertStaffNeighborhood({
    name,
    slug,
    description: description || null,
    location: location || null,
    settings: { require_approval: input.requireApproval, allow_public_directory: false },
    created_by: user.id,
    staff_actor_id: user.id,
  });

  if (error || !id) return { success: false, error: "The neighborhood could not be created." };
  revalidatePath("/staff");
  revalidatePath("/staff/neighborhoods");
  return { success: true };
}
