import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import responsive from "@/app/responsive.module.css";
import dashboardStyles from "./dashboard.module.css";

// Only these emails can create new neighborhoods
const ADMIN_EMAILS = ["stahl@hey.com"];

// Helper to parse YYYY-MM-DD string as local date (not UTC)
function parseDateLocal(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const canCreateNeighborhood = ADMIN_EMAILS.includes(authUser.email || "");

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

  // Fetch pending membership requests
  const { data: pendingMemberships } = await supabase
    .from("memberships")
    .select(`
      *,
      neighborhood:neighborhoods(*)
    `)
    .eq("user_id", authUser.id)
    .eq("status", "pending");

  // Fetch user's items
  const { data: userItems } = await supabase
    .from("items")
    .select("id")
    .eq("owner_id", authUser.id);

  // Fetch pending loan requests for user's items
  const itemIds = userItems?.map((i) => i.id) || [];
  let pendingLoanRequests: any[] = [];
  if (itemIds.length > 0) {
    const { data: loans } = await supabase
      .from("loans")
      .select(`
        *,
        item:items(id, name, neighborhood_id, neighborhood:neighborhoods(slug)),
        borrower:users(id, name)
      `)
      .in("item_id", itemIds)
      .eq("status", "requested")
      .order("requested_at", { ascending: true });
    pendingLoanRequests = loans || [];
  }

  // Fetch user's active borrowed items
  const { data: borrowedItems, error: borrowedError } = await supabase
    .from("loans")
    .select(`
      *,
      item:items(id, name, neighborhood_id, neighborhood:neighborhoods(slug), owner:users(id, name))
    `)
    .eq("borrower_id", authUser.id)
    .eq("status", "active")
    .order("start_date", { ascending: false });
  
  if (borrowedError) {
    console.error("Error fetching borrowed items:", borrowedError);
  }

  return (
    <div className={dashboardStyles.container}>
      <h1 style={styles.title}>
        Welcome, {profile?.name || authUser.email}!
      </h1>

      {pendingLoanRequests.length > 0 && (
        <section style={styles.section}>
          <div style={styles.loanRequestsBanner}>
            <div style={styles.loanRequestsHeader}>
              <span style={styles.pendingIcon}>📬</span>
              <strong>{pendingLoanRequests.length} Borrow Request{pendingLoanRequests.length > 1 ? "s" : ""}</strong>
            </div>
            <div style={styles.loanRequestsList}>
              {pendingLoanRequests.slice(0, 3).map((loan: any) => (
                <Link
                  key={loan.id}
                  href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                  style={styles.loanRequestItem}
                >
                  <span><strong>{loan.borrower?.name}</strong> wants to borrow <strong>{loan.item?.name}</strong></span>
                  <span style={styles.loanRequestArrow}>&rarr;</span>
                </Link>
              ))}
              {pendingLoanRequests.length > 3 && (
                <p style={styles.moreRequests}>
                  +{pendingLoanRequests.length - 3} more request{pendingLoanRequests.length - 3 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {borrowedItems && borrowedItems.length > 0 && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueItems = borrowedItems.filter((loan: any) => 
          loan.due_date && parseDateLocal(loan.due_date) < today
        );
        const currentItems = borrowedItems.filter((loan: any) => 
          !loan.due_date || parseDateLocal(loan.due_date) >= today
        );
        
        return (
          <>
            {overdueItems.length > 0 && (
              <section style={styles.section}>
                <div style={styles.overdueBanner}>
                  <div style={styles.overdueHeader}>
                    <span style={styles.pendingIcon}>⚠️</span>
                    <strong>{overdueItems.length} Overdue Item{overdueItems.length > 1 ? "s" : ""}</strong>
                  </div>
                  <div style={styles.overdueList}>
                    {overdueItems.map((loan: any) => (
                      <Link
                        key={loan.id}
                        href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                        style={styles.overdueItem}
                      >
                        <div style={styles.borrowedItemInfo}>
                          <span style={styles.overdueItemName}>{loan.item?.name}</span>
                          <span style={styles.overdueItemDue}>
                            Was due {parseDateLocal(loan.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })} - please return to {loan.item?.owner?.name || "owner"}
                          </span>
                        </div>
                        <span style={styles.overdueArrow}>&rarr;</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
            
            {currentItems.length > 0 && (
              <section style={styles.section}>
                <div style={styles.borrowedBanner}>
                  <div style={styles.borrowedHeader}>
                    <span style={styles.pendingIcon}>📦</span>
                    <strong>You&apos;re Borrowing {currentItems.length} Item{currentItems.length > 1 ? "s" : ""}</strong>
                  </div>
                  <div style={styles.borrowedList}>
                    {currentItems.map((loan: any) => (
                      <Link
                        key={loan.id}
                        href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                        style={styles.borrowedItem}
                      >
                        <div style={styles.borrowedItemInfo}>
                          <span style={styles.borrowedItemName}>{loan.item?.name}</span>
                          <span style={styles.borrowedItemOwner}>
                            from {loan.item?.owner?.name || "Unknown"}
                            {loan.due_date && ` · Due ${parseDateLocal(loan.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}`}
                          </span>
                        </div>
                        <span style={styles.loanRequestArrow}>&rarr;</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        );
      })()}

      {pendingMemberships && pendingMemberships.length > 0 && (
        <section style={styles.section}>
          <div style={styles.pendingBanner}>
            <span style={styles.pendingIcon}>⏳</span>
            <div>
              <strong>Pending Requests</strong>
              <p style={styles.pendingText}>
                {pendingMemberships.map((m: any) => m.neighborhood.name).join(", ")}
              </p>
            </div>
          </div>
        </section>
      )}

      {memberships && memberships.length > 0 ? (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Your Neighborhoods</h2>
            {canCreateNeighborhood && (
              <Link href="/neighborhoods/new" style={styles.addButton}>
                + New
              </Link>
            )}
          </div>
          <div style={styles.cardGrid}>
            {memberships.map((membership: any) => (
              <Link
                key={membership.id}
                href={`/neighborhoods/${membership.neighborhood.slug}`}
                style={styles.card}
              >
                <h3 style={styles.cardTitle}>
                  {membership.neighborhood.name}
                </h3>
                <p style={styles.cardDescription}>
                  {membership.neighborhood.description || "No description"}
                </p>
                <div style={styles.cardFooter}>
                  <span style={styles.roleBadge}>
                    {membership.role}
                  </span>
                  {membership.neighborhood.location && (
                    <span style={styles.location}>
                      {membership.neighborhood.location}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section style={styles.section}>
          <div style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No neighborhoods yet</h2>
            <p style={styles.emptyText}>
              You haven&apos;t joined any neighborhoods yet. Ask a neighbor to share their invite link with you!
            </p>
            {canCreateNeighborhood && (
              <Link href="/neighborhoods/new" style={styles.primaryButton}>
                Create a Neighborhood
              </Link>
            )}
          </div>
        </section>
      )}

      <section style={styles.section}>
        <h2 className={dashboardStyles.sectionTitle}>Quick Actions</h2>
        <div className={responsive.grid4}>
          <Link href="/profile" style={styles.actionCard}>
            <span style={styles.actionIcon}>👤</span>
            <span>Edit Profile</span>
          </Link>
          {memberships && memberships.length > 0 && (
            <>
              <Link href={`/neighborhoods/${memberships[0].neighborhood.slug}/directory`} style={styles.actionCard}>
                <span style={styles.actionIcon}>👥</span>
                <span>Directory</span>
              </Link>
              <Link href={`/neighborhoods/${memberships[0].neighborhood.slug}/library`} style={styles.actionCard}>
                <span style={styles.actionIcon}>📚</span>
                <span>Library</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {canCreateNeighborhood && (
        <section style={styles.section}>
          <h2 className={dashboardStyles.sectionTitle}>Admin</h2>
          <div className={responsive.grid4}>
            <Link href="/neighborhoods/new" style={styles.actionCard}>
              <span style={styles.actionIcon}>🏘️</span>
              <span>New Neighborhood</span>
            </Link>
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
  title: {
    fontSize: "1.75rem",
    fontWeight: "600",
    marginBottom: "2rem",
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
    fontSize: "1.25rem",
    fontWeight: "600",
    margin: 0,
  },
  addButton: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: "500",
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
    textDecoration: "none",
    color: "inherit",
    transition: "box-shadow 0.15s ease",
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
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  location: {
    fontSize: "0.75rem",
    color: "#888",
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
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: "500",
    textDecoration: "none",
  },
  pendingBanner: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    backgroundColor: "#fef3c7",
    padding: "1rem 1.25rem",
    borderRadius: "8px",
    border: "1px solid #fcd34d",
  },
  pendingIcon: {
    fontSize: "1.5rem",
  },
  pendingText: {
    margin: "0.25rem 0 0 0",
    fontSize: "0.875rem",
    color: "#92400e",
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
    textDecoration: "none",
    color: "inherit",
  },
  actionIcon: {
    fontSize: "1.5rem",
  },
  loanRequestsBanner: {
    backgroundColor: "#dbeafe",
    border: "1px solid #93c5fd",
    borderRadius: "8px",
    overflow: "hidden",
  },
  loanRequestsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #93c5fd",
  },
  loanRequestsList: {
    display: "flex",
    flexDirection: "column",
  },
  loanRequestItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
    color: "#1e40af",
    textDecoration: "none",
    borderBottom: "1px solid #bfdbfe",
  },
  loanRequestArrow: {
    fontSize: "1.25rem",
    color: "#3b82f6",
  },
  moreRequests: {
    margin: 0,
    padding: "0.75rem 1.25rem",
    fontSize: "0.875rem",
    color: "#1e40af",
  },
  borrowedBanner: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "8px",
    overflow: "hidden",
  },
  borrowedHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #86efac",
  },
  borrowedList: {
    display: "flex",
    flexDirection: "column",
  },
  borrowedItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
    color: "#166534",
    textDecoration: "none",
    borderBottom: "1px solid #bbf7d0",
  },
  borrowedItemInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
  },
  borrowedItemName: {
    fontWeight: "600",
  },
  borrowedItemOwner: {
    fontSize: "0.75rem",
    color: "#15803d",
  },
  overdueBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    overflow: "hidden",
  },
  overdueHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #fca5a5",
    color: "#991b1b",
  },
  overdueList: {
    display: "flex",
    flexDirection: "column",
  },
  overdueItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.875rem 1.25rem",
    fontSize: "0.875rem",
    color: "#991b1b",
    textDecoration: "none",
    borderBottom: "1px solid #fecaca",
  },
  overdueItemName: {
    fontWeight: "600",
  },
  overdueItemDue: {
    fontSize: "0.75rem",
    color: "#b91c1c",
  },
  overdueArrow: {
    fontSize: "1.25rem",
    color: "#dc2626",
  },
};
