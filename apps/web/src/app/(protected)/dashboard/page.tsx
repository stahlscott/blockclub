import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { User } from "@frontporch/shared";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  // Fetch user's memberships with neighborhood details
  const { data: memberships } = await supabase
    .from("memberships")
    .select(`
      *,
      neighborhood:neighborhoods(*)
    `)
    .eq("user_id", authUser.id)
    .eq("status", "active");

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        Welcome, {profile?.name || authUser.email}!
      </h1>

      {memberships && memberships.length > 0 ? (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Neighborhoods</h2>
          <div style={styles.cardGrid}>
            {memberships.map((membership: any) => (
              <div key={membership.id} style={styles.card}>
                <h3 style={styles.cardTitle}>
                  {membership.neighborhood.name}
                </h3>
                <p style={styles.cardDescription}>
                  {membership.neighborhood.description || "No description"}
                </p>
                <span style={styles.roleBadge}>
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section style={styles.section}>
          <div style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No neighborhoods yet</h2>
            <p style={styles.emptyText}>
              You haven&apos;t joined any neighborhoods. Create one or ask a neighbor for an invite!
            </p>
            <button style={styles.primaryButton}>
              Create a Neighborhood
            </button>
          </div>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionGrid}>
          <div style={styles.actionCard}>
            <span style={styles.actionIcon}>📚</span>
            <span>Browse Library</span>
          </div>
          <div style={styles.actionCard}>
            <span style={styles.actionIcon}>📅</span>
            <span>View Events</span>
          </div>
          <div style={styles.actionCard}>
            <span style={styles.actionIcon}>👶</span>
            <span>Childcare</span>
          </div>
          <div style={styles.actionCard}>
            <span style={styles.actionIcon}>👥</span>
            <span>Directory</span>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "600",
    marginBottom: "2rem",
  },
  section: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "1rem",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1rem",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  cardTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    margin: "0 0 0.5rem 0",
  },
  cardDescription: {
    color: "#666",
    fontSize: "0.875rem",
    margin: "0 0 1rem 0",
  },
  roleBadge: {
    display: "inline-block",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  emptyState: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "3rem",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    margin: "0 0 0.5rem 0",
  },
  emptyText: {
    color: "#666",
    marginBottom: "1.5rem",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "1rem",
  },
  actionCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "1.5rem 1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  actionIcon: {
    fontSize: "1.5rem",
  },
};
