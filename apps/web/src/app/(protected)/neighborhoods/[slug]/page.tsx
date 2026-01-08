import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import responsive from "@/app/responsive.module.css";
import { InviteButton } from "@/components/InviteButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function NeighborhoodPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  // Fetch neighborhood
  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!neighborhood) {
    notFound();
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    // User is not a member - show join page
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>{neighborhood.name}</h1>
          {neighborhood.description && (
            <p style={styles.description}>{neighborhood.description}</p>
          )}
          {neighborhood.location && (
            <p style={styles.location}>{neighborhood.location}</p>
          )}
          <div style={styles.joinSection}>
            <p>You&apos;re not a member of this neighborhood yet.</p>
            <Link href={`/neighborhoods/${slug}/join`} style={styles.primaryButton}>
              Request to Join
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch member count
  const { count: memberCount } = await supabase
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("neighborhood_id", neighborhood.id)
    .eq("status", "active");

  // Fetch recent items
  const { data: recentItems } = await supabase
    .from("items")
    .select("*, owner:users(name)")
    .eq("neighborhood_id", neighborhood.id)
    .eq("availability", "available")
    .order("created_at", { ascending: false })
    .limit(4);

  // Fetch upcoming events
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("*, host:users(name)")
    .eq("neighborhood_id", neighborhood.id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(3);

  // Super admins have admin privileges in all neighborhoods
  const isAdmin = membership.role === "admin" || isSuperAdmin(user.email);

  // Fetch pending member count (admin only)
  let pendingCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "pending");
    pendingCount = count || 0;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <Link href="/dashboard" style={styles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 style={styles.title}>{neighborhood.name}</h1>
          {neighborhood.location && (
            <p style={styles.location}>{neighborhood.location}</p>
          )}
        </div>
        {isAdmin && (
          <Link href={`/neighborhoods/${slug}/settings`} style={styles.settingsLink}>
            Settings
          </Link>
        )}
      </div>

      {neighborhood.description && (
        <p style={styles.description}>{neighborhood.description}</p>
      )}

      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{memberCount || 0}</span>
          <span style={styles.statLabel}>Members</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{recentItems?.length || 0}</span>
          <span style={styles.statLabel}>Items Available</span>
        </div>
      </div>

      {isAdmin && pendingCount > 0 && (
        <Link href={`/neighborhoods/${slug}/members/pending`} style={styles.adminBanner}>
          <span>{pendingCount} pending membership request{pendingCount > 1 ? "s" : ""}</span>
          <span style={styles.adminBannerArrow}>&rarr;</span>
        </Link>
      )}

      <nav style={styles.navGrid}>
        <Link href={`/neighborhoods/${slug}/directory`} style={styles.navCard}>
          <span style={styles.navIcon}>👥</span>
          <span style={styles.navLabel}>Directory</span>
        </Link>
        <Link href={`/neighborhoods/${slug}/library`} style={styles.navCard}>
          <span style={styles.navIcon}>📚</span>
          <span style={styles.navLabel}>Library</span>
        </Link>
        <InviteButton slug={slug} />
        {/* Events and Childcare coming soon
        <Link href={`/neighborhoods/${slug}/events`} style={styles.navCard}>
          <span style={styles.navIcon}>📅</span>
          <span style={styles.navLabel}>Events</span>
        </Link>
        <Link href={`/neighborhoods/${slug}/childcare`} style={styles.navCard}>
          <span style={styles.navIcon}>👶</span>
          <span style={styles.navLabel}>Childcare</span>
        </Link>
        */}
      </nav>

      {/* Events section - coming soon
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Upcoming Events</h2>
            <Link href={`/neighborhoods/${slug}/events`} style={styles.seeAllLink}>
              See all
            </Link>
          </div>
          <div style={styles.eventList}>
            {upcomingEvents.map((event: any) => (
              <div key={event.id} style={styles.eventCard}>
                <div style={styles.eventDate}>
                  {new Date(event.starts_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div style={styles.eventDetails}>
                  <h3 style={styles.eventTitle}>{event.title}</h3>
                  <p style={styles.eventMeta}>
                    Hosted by {event.host?.name || "Unknown"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      */}

      {recentItems && recentItems.length > 0 && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Available to Borrow</h2>
            <Link href={`/neighborhoods/${slug}/library`} style={styles.seeAllLink}>
              See all
            </Link>
          </div>
          <div style={styles.itemGrid}>
            {recentItems.map((item: any) => (
              <div key={item.id} style={styles.itemCard}>
                <h3 style={styles.itemName}>{item.name}</h3>
                <p style={styles.itemOwner}>
                  Owned by {item.owner?.name || "Unknown"}
                </p>
                <span style={styles.itemCategory}>{item.category}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "0.5rem",
  },
  title: {
    margin: "0",
    fontSize: "1.75rem",
    fontWeight: "600",
  },
  location: {
    margin: "0.25rem 0 0 0",
    color: "#666",
    fontSize: "0.875rem",
  },
  description: {
    color: "#444",
    marginBottom: "1.5rem",
  },
  settingsLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    padding: "0.5rem 1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
  },
  statsRow: {
    display: "flex",
    gap: "2rem",
    marginBottom: "2rem",
    padding: "1.5rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  statLabel: {
    fontSize: "0.875rem",
    color: "#666",
  },
  nav: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem",
    marginBottom: "2rem",
  },
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
    marginBottom: "2rem",
  },
  navCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1.5rem 1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "#333",
  },
  navIcon: {
    fontSize: "1.5rem",
  },
  navLabel: {
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  section: {
    marginBottom: "2rem",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: "600",
  },
  seeAllLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "0.875rem",
  },
  eventList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  eventCard: {
    display: "flex",
    gap: "1rem",
    padding: "1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  eventDate: {
    backgroundColor: "#f0f0f0",
    padding: "0.5rem 0.75rem",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    textAlign: "center",
    minWidth: "60px",
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    margin: "0 0 0.25rem 0",
    fontSize: "1rem",
    fontWeight: "500",
  },
  eventMeta: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#666",
  },
  itemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  itemCard: {
    padding: "1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  itemName: {
    margin: "0 0 0.25rem 0",
    fontSize: "1rem",
    fontWeight: "500",
  },
  itemOwner: {
    margin: "0 0 0.5rem 0",
    fontSize: "0.875rem",
    color: "#666",
  },
  itemCategory: {
    display: "inline-block",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  joinSection: {
    marginTop: "2rem",
  },
  primaryButton: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
    marginTop: "1rem",
  },
  adminBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "0.875rem",
  },
  adminBannerArrow: {
    fontSize: "1.25rem",
  },
};
