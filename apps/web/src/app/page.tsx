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
        <h1 style={styles.title}>Welcome to Front Porch</h1>
        <p style={styles.subtitle}>
          Connect with your neighbors. Share resources. Build community.
        </p>
        
        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📚</span>
            <h3>Lending Library</h3>
            <p>Borrow tools, games, and more from neighbors</p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📅</span>
            <h3>Events</h3>
            <p>Organize and join neighborhood gatherings</p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>👶</span>
            <h3>Childcare</h3>
            <p>Coordinate childcare with trusted neighbors</p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>👥</span>
            <h3>Directory</h3>
            <p>Find and connect with people nearby</p>
          </div>
        </div>

        <div style={styles.cta}>
          <Link href="/signup" style={styles.primaryButton}>
            Get Started
          </Link>
          <Link href="/signin" style={styles.secondaryButton}>
            Sign In
          </Link>
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
    maxWidth: "900px",
    margin: "0 auto",
    padding: "4rem 1rem",
    textAlign: "center",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "1rem",
    color: "#111",
  },
  subtitle: {
    fontSize: "1.25rem",
    color: "#666",
    marginBottom: "3rem",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1.5rem",
    marginBottom: "3rem",
  },
  feature: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  featureIcon: {
    fontSize: "2rem",
    marginBottom: "0.5rem",
    display: "block",
  },
  cta: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
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
  secondaryButton: {
    backgroundColor: "white",
    color: "#2563eb",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "1rem",
    border: "1px solid #2563eb",
  },
};
