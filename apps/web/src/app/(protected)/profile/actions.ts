"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";
import { getImpersonationContext } from "@/lib/impersonation";
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
}

export async function updateProfile(data: ProfileUpdateData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { success: false, error: "Not authenticated" };
  }

  const userIsStaffAdmin = isStaffAdmin(authUser.email);
  const impersonationContext = userIsStaffAdmin
    ? await getImpersonationContext()
    : null;
  const isImpersonating = impersonationContext?.isImpersonating ?? false;

  // Verify the userId matches the expected user
  const expectedUserId = isImpersonating && impersonationContext?.impersonatedUserId
    ? impersonationContext.impersonatedUserId
    : authUser.id;

  if (data.userId !== expectedUserId) {
    return { success: false, error: "User ID mismatch" };
  }

  // Use admin client when impersonating to bypass RLS
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
    })
    .eq("id", data.userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true };
}
