import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProfile } from "@/lib/ensure-profile";
import { ensureNeighborhoodMembership } from "@/lib/ensure-membership";

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
        const profile = await ensureUserProfile(supabase, user);
        if (!profile.success) {
          return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(profile.error || "Could not create profile")}`);
        }

        const membership = await ensureNeighborhoodMembership(supabase, user.id, pendingNeighborhoodId);
        if (!membership.success) {
          return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(membership.error || "Could not join neighborhood")}`);
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
