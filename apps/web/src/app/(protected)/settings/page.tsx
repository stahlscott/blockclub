import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNeighborhoodsForUser, getUserProfile } from "@/lib/queries";
import { getImpersonationContext } from "@/lib/impersonation";
import { getAuthContext } from "@/lib/auth-context";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const impersonationContext = await getImpersonationContext();
  const isImpersonating = impersonationContext?.isImpersonating ?? false;

  // Get the effective user context for data fetching
  const { effectiveUserId, queryClient } = await getAuthContext(supabase, authUser);

  let membershipId: string | null = null;
  let neighborhoodName: string | null = null;

  if (effectiveUserId) {
    const { data: profile } = await getUserProfile(queryClient, effectiveUserId);
    const { data: memberships } = await getNeighborhoodsForUser(queryClient, effectiveUserId);
    const activeMemberships = memberships ?? [];
    const primaryMembership = profile?.primary_neighborhood_id
      ? activeMemberships.find(
          (membership) => membership.neighborhood?.id === profile.primary_neighborhood_id,
        )
      : undefined;
    const membership = primaryMembership ?? activeMemberships[0];

    if (membership?.neighborhood) {
      membershipId = membership.id;
      neighborhoodName = membership.neighborhood.name;
    }
  }

  return (
    <SettingsClient
      initialMembershipId={membershipId}
      initialNeighborhoodName={neighborhoodName}
      isImpersonating={isImpersonating}
      userEmail={authUser.email || ""}
    />
  );
}
