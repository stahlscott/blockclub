import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    // Fetch user profile to get primary neighborhood
    const { data: profile } = await queryClient
      .from("users")
      .select("primary_neighborhood_id")
      .eq("id", effectiveUserId)
      .single();

    if (profile?.primary_neighborhood_id) {
      // Get neighborhood name
      const { data: neighborhood } = await queryClient
        .from("neighborhoods")
        .select("name")
        .eq("id", profile.primary_neighborhood_id)
        .single();
      neighborhoodName = neighborhood?.name || null;

      // Get the membership ID for this neighborhood
      const { data: membership } = await queryClient
        .from("memberships")
        .select("id")
        .eq("user_id", effectiveUserId)
        .eq("neighborhood_id", profile.primary_neighborhood_id)
        .eq("status", "active")
        .single();
      membershipId = membership?.id || null;
    }

    // Fall back to first active membership if no primary set
    if (!membershipId) {
      type MembershipWithNeighborhood = {
        id: string;
        neighborhood: { name: string } | null;
      };
      const { data: membershipsData } = await queryClient
        .from("memberships")
        .select("id, neighborhood:neighborhoods(name)")
        .eq("user_id", effectiveUserId)
        .eq("status", "active")
        .limit(1);

      const memberships = (membershipsData as unknown as MembershipWithNeighborhood[]) || [];

      if (memberships[0]?.neighborhood) {
        neighborhoodName = memberships[0].neighborhood.name;
        membershipId = memberships[0].id;
      }
    }
  }

  return (
    <SettingsClient
      initialMembershipId={membershipId}
      initialNeighborhoodName={neighborhoodName}
      isImpersonating={isImpersonating}
    />
  );
}
