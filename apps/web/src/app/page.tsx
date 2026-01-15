import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main style={styles.container}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Block Club</h1>
        <p style={styles.subtitle}>
          Connect with your neighbors. Share resources. Build community.
        </p>
        <p style={styles.location}>Lakewood, Ohio</p>

        <div style={styles.cta}>
          <Link href="/signin" style={styles.primaryButton}>
            Sign In
          </Link>
        </div>

        <div style={styles.inviteSection}>
          <p style={styles.inviteNote}>
            Block Club is invite-only. If your neighborhood is already on Block Club, ask a neighbor for an invite link.
          </p>
          <p style={styles.contactNote}>
            Want to start a Block Club on your Lakewood street?{" "}
            <a href="mailto:hello@lakewoodblock.club" style={styles.contactLink}>
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "calc(100vh - 60px)",
    backgroundColor: "#f5f5f5",
  },
  hero: {
    width: "100%",
    maxWidth: "480px",
    margin: "0 auto",
    padding: "4rem 1.5rem",
    textAlign: "center",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
    color: "#111",
  },
  subtitle: {
    fontSize: "1.125rem",
    color: "#666",
    marginBottom: "0.5rem",
  },
  location: {
    fontSize: "0.875rem",
    color: "#999",
    marginBottom: "2rem",
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  cta: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    marginBottom: "2.5rem",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "1rem",
  },
  inviteSection: {
    borderTop: "1px solid #e5e5e5",
    paddingTop: "1.5rem",
  },
  inviteNote: {
    margin: "0 0 1rem",
    color: "#666",
    fontSize: "0.875rem",
    lineHeight: "1.5",
  },
  contactNote: {
    margin: 0,
    color: "#666",
    fontSize: "0.875rem",
    lineHeight: "1.5",
  },
  contactLink: {
    color: "#2563eb",
    textDecoration: "none",
  },
};
