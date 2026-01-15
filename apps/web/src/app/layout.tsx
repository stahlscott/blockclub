import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import "./globals.css";

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
    <html lang="en">
      <body style={{ 
        margin: 0, 
        fontFamily: "system-ui, sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
        <AuthProvider>
          <Header />
          <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
