import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { NeighborhoodProvider } from "@/components/NeighborhoodProvider";
import { Header } from "@/components/Header";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.variable}>
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
        <AuthProvider>
          <NeighborhoodProvider>
            <Header />
            <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
          </NeighborhoodProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
