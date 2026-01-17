import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { NeighborhoodProvider } from "@/components/NeighborhoodProvider";
import { Header } from "@/components/Header";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { getImpersonationContext } from "@/lib/impersonation";
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
  maximumScale: 1,
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

  return (
    <html lang="en" className={nunito.variable}>
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
        <AuthProvider>
          <NeighborhoodProvider impersonation={impersonation}>
            {impersonationContext?.isImpersonating && impersonationContext.impersonatedUser && (
              <ImpersonationBanner
                impersonatedUser={impersonationContext.impersonatedUser}
              />
            )}
            <Header />
            <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
          </NeighborhoodProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
