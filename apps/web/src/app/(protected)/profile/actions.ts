"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth-context";
import { revalidatePath } from "next/cache";

interface PhoneEntry {
  label: string;
  number: string;
}

interface EmailEntry {
  label: string;
  email: string;
}

interface ProfileUpdateData {
  userId: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  address: string;
  unit: string | null;
  moveInYear: number | null;
  children: string | null;
  pets: string | null;
  photoUrls: string[];
}

export async function updateProfile(data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, error: "Not authenticated" };
  }

  const { isImpersonating, effectiveUserId } = await getAuthContext(supabase, authUser);

  // Verify the userId matches the expected user
  if (data.userId !== effectiveUserId) {
    return { success: false, error: "User ID mismatch" };
  }

  // Use admin client only when impersonating to bypass RLS
  const queryClient = isImpersonating ? createAdminClient() : supabase;

  const { error: updateError } = await queryClient
    .from("users")
    .update({
      name: data.name,
      bio: data.bio,
      avatar_url: data.avatarUrl,
      phones: data.phones,
      phone: data.phones.length > 0 ? data.phones[0].number : null,
      emails: data.emails,
      address: data.address,
      unit: data.unit,
      move_in_year: data.moveInYear,
      children: data.children,
      pets: data.pets,
      photo_urls: data.photoUrls,
    })
    .eq("id", data.userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true };
}
