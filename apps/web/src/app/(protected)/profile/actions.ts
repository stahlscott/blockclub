"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth-context";
import { revalidatePath } from "next/cache";
import { cleanupImageUrl } from "@/lib/image-reference-safety";

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
  const { data: previousProfile } = await (isImpersonating ? createAdminClient() : supabase).from("users").select("avatar_url, photo_urls").eq("id", effectiveUserId).maybeSingle();

  // Verify the userId matches the expected user
  if (data.userId !== effectiveUserId) {
    return { success: false, error: "User ID mismatch" };
  }

  // Use admin client only when impersonating to bypass RLS
  const queryClient = isImpersonating ? createAdminClient() : supabase;

  const { data: updatedProfile, error: updateError } = await queryClient
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
    .eq("id", data.userId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedProfile?.id || updatedProfile.id !== data.userId) {
    const newUrls = [
      previousProfile?.avatar_url !== data.avatarUrl ? data.avatarUrl : null,
      ...data.photoUrls.filter((url) => !(previousProfile?.photo_urls ?? []).includes(url)),
    ];
    await Promise.all(newUrls.filter(Boolean).map((url) => cleanupImageUrl("avatars", url)));
    return { success: false, error: updateError?.message || "The profile could not be updated. Please try again." };
  }

  const removedUrls = [
    previousProfile?.avatar_url && previousProfile.avatar_url !== data.avatarUrl ? previousProfile.avatar_url : null,
    ...(previousProfile?.photo_urls ?? []).filter((url) => !data.photoUrls.includes(url)),
  ];
  await Promise.all(removedUrls.filter(Boolean).map((url) => cleanupImageUrl("avatars", url)));

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true };
}
