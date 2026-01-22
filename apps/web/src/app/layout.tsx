import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { NeighborhoodProvider, type InitialNeighborhoodData } from "@/components/NeighborhoodProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { getImpersonationContext } from "@/lib/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";
import { type MembershipWithNeighborhoodRow, hasNeighborhood } from "@/lib/supabase/queries";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Block Club",
  description: "A neighborhood community app for Lakewood, Ohio",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Note: Do not set maximumScale=1 as it prevents pinch-to-zoom
  // This violates WCAG 2.1 Success Criterion 1.4.4 (Resize text)
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const impersonationContext = await getImpersonationContext();
  const impersonation = impersonationContext
    ? {
        isImpersonating: impersonationContext.isImpersonating,
        impersonatedUserId: impersonationContext.impersonatedUserId,
        impersonatedUserName: impersonationContext.impersonatedUser?.name || null,
        impersonatedUserEmail: impersonationContext.impersonatedUser?.email || null,
        impersonatedUserAvatarUrl: impersonationContext.impersonatedUser?.avatar_url || null,
      }
    : undefined;

  // Build initialData for NeighborhoodProvider
  // - If user is a staff admin (impersonationContext !== null), pass isStaffAdmin to avoid client API call
  // - If impersonating, also fetch neighborhood data server-side to bypass RLS
  let initialNeighborhoodData: InitialNeighborhoodData | undefined = undefined;

  if (impersonationContext) {
    // User is a staff admin - always pass isStaffAdmin to avoid client-side fetch
    if (impersonationContext.isImpersonating && impersonationContext.impersonatedUserId) {
      // When impersonating, fetch neighborhood data server-side to bypass RLS
      const adminClient = createAdminClient();
      const impersonatedUserId = impersonationContext.impersonatedUserId;

      type UserProfile = { primary_neighborhood_id: string | null; avatar_url: string | null };

      const [profileResult, membershipsResult] = await Promise.all([
        adminClient
          .from("users")
          .select("primary_neighborhood_id, avatar_url")
          .eq("id", impersonatedUserId)
          .single(),
        adminClient
          .from("memberships")
          .select("id, role, neighborhood:neighborhoods(id, name, slug)")
          .eq("user_id", impersonatedUserId)
          .eq("status", "active")
          .is("deleted_at", null),
      ]);

      const profile = profileResult.data as UserProfile | null;
      // Cast to explicit interface defined in queries.ts
      const allMemberships = (membershipsResult.data || []) as MembershipWithNeighborhoodRow[];
      // Filter out null neighborhoods using type guard
      const memberships = allMemberships.filter(hasNeighborhood);

      const neighborhoods = memberships.map((m) => m.neighborhood);

      initialNeighborhoodData = {
        primaryNeighborhoodId: profile?.primary_neighborhood_id || null,
        neighborhoods,
        memberships: memberships.map((m) => ({
          role: m.role,
          neighborhood: m.neighborhood,
        })),
        isStaffAdmin: true,
        userAvatarUrl: profile?.avatar_url || null,
      };
    } else {
      // Staff admin not impersonating - just pass isStaffAdmin flag
      initialNeighborhoodData = {
        primaryNeighborhoodId: null,
        neighborhoods: [],
        memberships: [],
        isStaffAdmin: true,
        userAvatarUrl: null,
      };
    }
  }

  return (
    <html lang="en" className={nunito.variable}>
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
        <AuthProvider>
          <NeighborhoodProvider impersonation={impersonation} initialData={initialNeighborhoodData}>
            {impersonationContext?.isImpersonating && impersonationContext.impersonatedUser && (
              <ImpersonationBanner
                impersonatedUser={impersonationContext.impersonatedUser}
              />
            )}
            <Header />
            <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
            <Footer />
          </NeighborhoodProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
