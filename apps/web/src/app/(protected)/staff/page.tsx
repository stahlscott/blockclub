import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import responsive from "@/app/responsive.module.css";

async function getStats() {
  const adminSupabase = createAdminClient();

  const [neighborhoods, users, items] = await Promise.all([
    adminSupabase.from("neighborhoods").select("*", { count: "exact", head: true }),
    adminSupabase.from("users").select("*", { count: "exact", head: true }),
    adminSupabase.from("items").select("*", { count: "exact", head: true }),
  ]);

  return {
    neighborhoodCount: neighborhoods.count || 0,
    userCount: users.count || 0,
    itemCount: items.count || 0,
  };
}

const styles: { [key: string]: React.CSSProperties } = {
  statsRow: {
    marginBottom: "var(--space-8)",
  },
  stat: {
    background: "var(--color-surface)",
    padding: "var(--space-5)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    textAlign: "center",
  },
  statValue: {
    display: "block",
    fontSize: "var(--font-size-2xl)",
    fontWeight: 600,
    color: "var(--color-text)",
  },
  statLabel: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-secondary)",
  },
  sectionTitle: {
    fontSize: "var(--font-size-lg)",
    fontWeight: 600,
    marginBottom: "var(--space-4)",
  },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "var(--space-4)",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    textDecoration: "none",
    color: "var(--color-text)",
    transition: "border-color var(--transition-fast)",
  },
};

export default async function StaffOverviewPage() {
  const stats = await getStats();

  return (
    <div>
      <div className={responsive.grid3} style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.neighborhoodCount}</span>
          <span style={styles.statLabel}>Neighborhoods</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.userCount}</span>
          <span style={styles.statLabel}>Users</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.itemCount}</span>
          <span style={styles.statLabel}>Items</span>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Quick Actions</h2>
      <div className={responsive.grid3}>
        <Link
          href="/staff/neighborhoods"
          style={styles.actionCard}
          data-testid="staff-overview-neighborhoods-link"
        >
          <span>View Neighborhoods</span>
        </Link>
        <Link
          href="/staff/users"
          style={styles.actionCard}
          data-testid="staff-overview-users-link"
        >
          <span>Find User</span>
        </Link>
        <Link
          href="/neighborhoods/new"
          style={styles.actionCard}
          data-testid="staff-overview-new-neighborhood-link"
        >
          <span>New Neighborhood</span>
        </Link>
      </div>
    </div>
  );
}
