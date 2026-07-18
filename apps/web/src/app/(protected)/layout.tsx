import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { getPendingMembershipsForUser, hasActiveMembership } from "@/lib/queries";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/signin");
  }

  const supabase = await createClient();
  const { effectiveUserId, isImpersonating, isStaffAdmin: isUserStaffAdmin, queryClient } =
    await getAuthContext(supabase, authUser);

  if (isUserStaffAdmin && !isImpersonating) {
    return <>{children}</>;
  }

  // Check for active memberships
  if (await hasActiveMembership(queryClient, effectiveUserId)) {
    return <>{children}</>;
  }

  // No active memberships — check for pending
  const { data: pendingMemberships } = await getPendingMembershipsForUser(queryClient, effectiveUserId);

  if (pendingMemberships && pendingMemberships.length > 0) {
    redirect("/waiting");
  }

  redirect("/get-started");
}
