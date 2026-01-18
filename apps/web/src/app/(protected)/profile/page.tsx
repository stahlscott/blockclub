import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth-context";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const { isImpersonating, effectiveUserId, impersonationContext } =
    await getAuthContext(supabase, authUser);

  // Use admin client when impersonating to bypass RLS
  const queryClient = isImpersonating ? createAdminClient() : supabase;

  // Fetch the profile
  const { data: profile } = await queryClient
    .from("users")
    .select("*")
    .eq("id", effectiveUserId)
    .single();

  if (!profile) {
    redirect("/signin");
  }

  return (
    <ProfileForm
      userId={effectiveUserId}
      profile={profile}
      isImpersonating={isImpersonating}
      impersonatedUserName={impersonationContext?.impersonatedUser?.name || null}
    />
  );
}
