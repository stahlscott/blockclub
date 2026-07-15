import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { isStaffAdmin } from "@/lib/auth";

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
  const { effectiveUserId, isImpersonating, queryClient } = await getAuthContext(supabase, authUser);
  const isUserStaffAdmin = isStaffAdmin(authUser.email);

  if (isUserStaffAdmin && !isImpersonating) {
    return <>{children}</>;
  }

  // Check for active memberships
  const { data: activeMemberships } = await queryClient
    .from("memberships")
    .select("id")
    .eq("user_id", effectiveUserId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1);

  if (activeMemberships && activeMemberships.length > 0) {
    return <>{children}</>;
  }

  // No active memberships — check for pending
  const { data: pendingMemberships } = await queryClient
    .from("memberships")
    .select("id")
    .eq("user_id", effectiveUserId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .limit(1);

  if (pendingMemberships && pendingMemberships.length > 0) {
    redirect("/waiting");
  }

  redirect("/get-started");
}
