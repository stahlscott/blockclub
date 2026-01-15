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
      // Clear the redirect cookie if it was set
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
