import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Check for redirect: first query param, then cookie, then default
  const cookieStore = await cookies();
  const authRedirectCookie = cookieStore.get("authRedirect");
  const next = searchParams.get("next") ?? authRedirectCookie?.value ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user to check for pending neighborhood
      const { data: { user } } = await supabase.auth.getUser();
      const pendingNeighborhoodId = user?.user_metadata?.pending_neighborhood_id;

      if (pendingNeighborhoodId && user) {
        // Ensure user profile exists (trigger may not have run yet)
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          // Create profile if trigger hasn't run yet
          await supabase.from("users").insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email?.split("@")[0],
            address: user.user_metadata?.address || null,
          });
        }

        // Check for existing membership
        const { data: existingMembership } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", user.id)
          .eq("neighborhood_id", pendingNeighborhoodId)
          .maybeSingle();

        if (!existingMembership) {
          // Create membership - database trigger handles auto-approval
          await supabase.from("memberships").insert({
            user_id: user.id,
            neighborhood_id: pendingNeighborhoodId,
            role: "member",
            status: "pending",
          });
        }

        // Clear the pending neighborhood from metadata
        await supabase.auth.updateUser({
          data: { pending_neighborhood_id: null }
        });

        // Redirect to dashboard instead of join page
        const response = NextResponse.redirect(`${origin}/dashboard`);
        if (authRedirectCookie) {
          response.cookies.delete("authRedirect");
        }
        return response;
      }

      // Original redirect logic for non-invite signups
      const response = NextResponse.redirect(`${origin}${next}`);
      if (authRedirectCookie) {
        response.cookies.delete("authRedirect");
      }
      return response;
    }
  }

  // Return to sign in page on error
  return NextResponse.redirect(`${origin}/signin?error=Could not authenticate`);
}
