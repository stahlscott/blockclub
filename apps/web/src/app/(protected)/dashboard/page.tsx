import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import responsive from "@/app/responsive.module.css";
import dashboardStyles from "./dashboard.module.css";
import { NeighborhoodSwitcher } from "@/components/NeighborhoodSwitcher";

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  const stripped = name.replace(/^the\s+/i, "");
  return stripped.charAt(0)?.toUpperCase() || "?";
}

// Helper to parse YYYY-MM-DD string as local date (not UTC)
function parseDateLocal(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Check if a date is within the last N days
function isWithinDays(dateStr: string, days: number) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const canCreateNeighborhood = isSuperAdmin(authUser.email);

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  // Fetch user's memberships with neighborhood details
  const { data: memberships } = await supabase
    .from("memberships")
    .select(
      `
      *,
      neighborhood:neighborhoods(*)
    `,
    )
    .eq("user_id", authUser.id)
    .eq("status", "active");

  // Fetch pending membership requests (user's own pending requests to join)
  const { data: pendingMemberships } = await supabase
    .from("memberships")
    .select(
      `
      *,
      neighborhood:neighborhoods(*)
    `,
    )
    .eq("user_id", authUser.id)
    .eq("status", "pending");

  // Fetch user's items (for loan request notifications)
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
      .select(
        `
        *,
        item:items(id, name, neighborhood_id, neighborhood:neighborhoods(slug)),
        borrower:users(id, name)
      `,
      )
      .in("item_id", itemIds)
      .eq("status", "requested")
      .order("requested_at", { ascending: true });
    pendingLoanRequests = loans || [];
  }

  // Fetch user's active borrowed items
  const { data: borrowedItems, error: borrowedError } = await supabase
    .from("loans")
    .select(
      `
      *,
      item:items(id, name, neighborhood_id, neighborhood:neighborhoods(slug), owner:users(id, name))
    `,
    )
    .eq("borrower_id", authUser.id)
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (borrowedError) {
    logger.error("Error fetching borrowed items", borrowedError);
  }

  // Determine the primary neighborhood
  const activeMemberships = memberships || [];
  let primaryNeighborhood: any = null;
  let primaryMembership: any = null;

  if (activeMemberships.length > 0) {
    // First try to use the user's saved primary neighborhood
    if (profile?.primary_neighborhood_id) {
      primaryMembership = activeMemberships.find(
        (m: any) => m.neighborhood.id === profile.primary_neighborhood_id,
      );
    }
    // Fall back to first membership if primary not found
    if (!primaryMembership) {
      primaryMembership = activeMemberships[0];
    }
    primaryNeighborhood = primaryMembership?.neighborhood;
  }

  // Fetch neighborhood-specific data if user has a primary neighborhood
  let memberCount = 0;
  let itemsAvailable = 0;
  let recentItems: any[] = [];
  let recentMembers: any[] = [];
  let pendingMemberRequests = 0;
  // Super admins have admin privileges in all neighborhoods
  const isAdmin =
    primaryMembership?.role === "admin" || isSuperAdmin(authUser.email);

  if (primaryNeighborhood) {
    // Fetch member count (excluding superadmins)
    const { data: allMembers } = await supabase
      .from("memberships")
      .select("user:users(email)")
      .eq("neighborhood_id", primaryNeighborhood.id)
      .eq("status", "active");
    memberCount = (allMembers || []).filter(
      (m: any) => !isSuperAdmin(m.user?.email),
    ).length;

    // Fetch items available count
    const { count: iCount } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", primaryNeighborhood.id)
      .eq("availability", "available");
    itemsAvailable = iCount || 0;

    // Fetch recently added items (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: items } = await supabase
      .from("items")
      .select("*, owner:users(name)")
      .eq("neighborhood_id", primaryNeighborhood.id)
      .eq("availability", "available")
      .order("created_at", { ascending: false })
      .limit(8);
    recentItems = items || [];

    // Fetch recently joined members (last 14 days)
    const { data: members } = await supabase
      .from("memberships")
      .select(
        `
        *,
        user:users(id, name, email, avatar_url)
      `,
      )
      .eq("neighborhood_id", primaryNeighborhood.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(6);
    // Filter out superadmin users from the recent members list
    recentMembers = (members || []).filter(
      (m: any) => !isSuperAdmin(m.user?.email),
    );

    // Fetch pending membership requests count (admin only)
    if (isAdmin) {
      const { count } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("neighborhood_id", primaryNeighborhood.id)
        .eq("status", "pending");
      pendingMemberRequests = count || 0;
    }
  }

  // Build neighborhoods list for switcher
  const neighborhoodsForSwitcher = activeMemberships.map((m: any) => ({
    id: m.neighborhood.id,
    name: m.neighborhood.name,
    slug: m.neighborhood.slug,
  }));

  return (
    <div className={dashboardStyles.container}>
      {primaryNeighborhood && (
        <div style={styles.headerRow}>
          <div>
            {activeMemberships.length > 1 ? (
              <NeighborhoodSwitcher
                neighborhoods={neighborhoodsForSwitcher}
                currentNeighborhoodId={primaryNeighborhood.id}
                userId={authUser.id}
              />
            ) : (
              <h1 style={styles.title}>{primaryNeighborhood.name}</h1>
            )}
          </div>
          <Link href="/settings" style={styles.settingsLink}>
            Settings
          </Link>
        </div>
      )}

      {/* Borrow Requests Banner */}
      {pendingLoanRequests.length > 0 && (
        <section style={styles.section}>
          <div style={styles.loanRequestsBanner}>
            <div style={styles.loanRequestsHeader}>
              <span style={styles.pendingIcon}>📬</span>
              <strong>
                {pendingLoanRequests.length} Borrow Request
                {pendingLoanRequests.length > 1 ? "s" : ""}
              </strong>
            </div>
            <div style={styles.loanRequestsList}>
              {pendingLoanRequests.slice(0, 3).map((loan: any) => (
                <Link
                  key={loan.id}
                  href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                  style={styles.loanRequestItem}
                >
                  <span>
                    <strong>{loan.borrower?.name}</strong> wants to borrow{" "}
                    <strong>{loan.item?.name}</strong>
                  </span>
                  <span style={styles.loanRequestArrow}>&rarr;</span>
                </Link>
              ))}
              {pendingLoanRequests.length > 3 && (
                <p style={styles.moreRequests}>
                  +{pendingLoanRequests.length - 3} more request
                  {pendingLoanRequests.length - 3 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Borrowed Items / Overdue Items Banners */}
      {borrowedItems &&
        borrowedItems.length > 0 &&
        (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const overdueItems = borrowedItems.filter(
            (loan: any) =>
              loan.due_date && parseDateLocal(loan.due_date) < today,
          );
          const currentItems = borrowedItems.filter(
            (loan: any) =>
              !loan.due_date || parseDateLocal(loan.due_date) >= today,
          );

          return (
            <>
              {overdueItems.length > 0 && (
                <section style={styles.section}>
                  <div style={styles.overdueBanner}>
                    <div style={styles.overdueHeader}>
                      <span style={styles.pendingIcon}>⚠️</span>
                      <strong>
                        {overdueItems.length} Overdue Item
                        {overdueItems.length > 1 ? "s" : ""}
                      </strong>
                    </div>
                    <div style={styles.overdueList}>
                      {overdueItems.map((loan: any) => (
                        <Link
                          key={loan.id}
                          href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                          style={styles.overdueItem}
                        >
                          <div style={styles.borrowedItemInfo}>
                            <span style={styles.overdueItemName}>
                              {loan.item?.name}
                            </span>
                            <span style={styles.overdueItemDue}>
                              Was due{" "}
                              {parseDateLocal(loan.due_date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}{" "}
                              - please return to{" "}
                              {loan.item?.owner?.name || "owner"}
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
                      <strong>
                        You&apos;re Borrowing {currentItems.length} Item
                        {currentItems.length > 1 ? "s" : ""}
                      </strong>
                    </div>
                    <div style={styles.borrowedList}>
                      {currentItems.map((loan: any) => (
                        <Link
                          key={loan.id}
                          href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                          style={styles.borrowedItem}
                        >
                          <div style={styles.borrowedItemInfo}>
                            <span style={styles.borrowedItemName}>
                              {loan.item?.name}
                            </span>
                            <span style={styles.borrowedItemOwner}>
                              from {loan.item?.owner?.name || "Unknown"}
                              {loan.due_date &&
                                ` · Due ${parseDateLocal(
                                  loan.due_date,
                                ).toLocaleDateString("en-US", {
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

      {/* Pending Memberships Banner (user's own pending requests to join neighborhoods) */}
      {pendingMemberships && pendingMemberships.length > 0 && (
        <section style={styles.section}>
          <div style={styles.pendingBanner}>
            <span style={styles.pendingIcon}>⏳</span>
            <div>
              <strong>Pending Requests</strong>
              <p style={styles.pendingText}>
                {pendingMemberships
                  .map((m: any) => m.neighborhood.name)
                  .join(", ")}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Main Content: Unified Neighborhood View OR Empty State */}
      {primaryNeighborhood ? (
        <>
          {/* Admin Banner for Pending Membership Requests */}
          {isAdmin && pendingMemberRequests > 0 && (
            <Link
              href={`/neighborhoods/${primaryNeighborhood.slug}/members/pending`}
              style={styles.adminBanner}
            >
              <span>
                {pendingMemberRequests} pending membership request
                {pendingMemberRequests > 1 ? "s" : ""}
              </span>
              <span style={styles.adminBannerArrow}>&rarr;</span>
            </Link>
          )}

          {/* Quick Actions */}
          <section style={styles.section}>
            <div className={responsive.grid2}>
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/directory`}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>👥</span>
                <span>Directory</span>
              </Link>
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/library`}
                style={styles.actionCard}
              >
                <span style={styles.actionIcon}>📚</span>
                <span>Library</span>
              </Link>
            </div>
          </section>

          {/* Recently Added Items */}
          {recentItems.length > 0 && (
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 className={dashboardStyles.sectionTitle}>
                  Recently Added Items
                </h2>
                <Link
                  href={`/neighborhoods/${primaryNeighborhood.slug}/library`}
                  style={styles.seeAllLink}
                >
                  See all &rarr;
                </Link>
              </div>
              <div style={styles.itemGrid}>
                {recentItems.slice(0, 4).map((item: any) => {
                  const isNew = isWithinDays(item.created_at, 14);
                  return (
                    <Link
                      key={item.id}
                      href={`/neighborhoods/${primaryNeighborhood.slug}/library/${item.id}`}
                      style={styles.itemCard}
                    >
                      {item.photo_urls && item.photo_urls.length > 0 ? (
                        <div style={styles.itemImageContainer}>
                          <Image
                            src={item.photo_urls[0]}
                            alt={item.name}
                            width={160}
                            height={120}
                            style={styles.itemImage}
                          />
                          {isNew && <span style={styles.newBadge}>New</span>}
                        </div>
                      ) : (
                        <div style={styles.itemPlaceholder}>
                          <span style={styles.itemPlaceholderIcon}>📦</span>
                          {isNew && <span style={styles.newBadge}>New</span>}
                        </div>
                      )}
                      <div style={styles.itemInfo}>
                        <span style={styles.itemName}>{item.name}</span>
                        <span style={styles.itemOwner}>
                          {item.owner?.name || "Unknown"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recently Joined Households */}
          {recentMembers.length > 0 && (
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 className={dashboardStyles.sectionTitle}>
                  Recently Joined Households
                </h2>
                <Link
                  href={`/neighborhoods/${primaryNeighborhood.slug}/directory`}
                  style={styles.seeAllLink}
                >
                  See all &rarr;
                </Link>
              </div>
              <div style={styles.memberList}>
                {recentMembers.slice(0, 5).map((membership: any) => {
                  const isNew =
                    membership.joined_at &&
                    isWithinDays(membership.joined_at, 14);
                  return (
                    <Link
                      key={membership.id}
                      href={`/neighborhoods/${primaryNeighborhood.slug}/members/${membership.user?.id}`}
                      style={styles.memberRow}
                    >
                      <div style={styles.memberInfo}>
                        {membership.user?.avatar_url ? (
                          <Image
                            src={membership.user.avatar_url}
                            alt={membership.user.name || "Member"}
                            width={40}
                            height={40}
                            style={styles.memberAvatar}
                          />
                        ) : (
                          <div style={styles.memberAvatarPlaceholder}>
                            {getInitial(membership.user?.name)}
                          </div>
                        )}
                        <div style={styles.memberDetails}>
                          <span style={styles.memberName}>
                            {membership.user?.name || "Unknown"}
                            {isNew && (
                              <span style={styles.newBadgeInline}>New</span>
                            )}
                          </span>
                          {membership.joined_at && (
                            <span style={styles.memberJoinDate}>
                              Joined{" "}
                              {new Date(
                                membership.joined_at,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={styles.memberArrow}>&rarr;</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <section style={styles.section}>
          <div style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No neighborhoods yet</h2>
            <p style={styles.emptyText}>
              You haven&apos;t joined any neighborhoods yet. Ask a neighbor to
              share their invite link with you!
            </p>
            {canCreateNeighborhood && (
              <Link href="/neighborhoods/new" style={styles.primaryButton}>
                Create a Neighborhood
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Admin Section */}
      {isAdmin && primaryNeighborhood && (
        <section style={styles.section}>
          <h2
            className={dashboardStyles.sectionTitle}
            style={{ marginBottom: "1rem" }}
          >
            Admin
          </h2>
          <div className={responsive.statsRow} style={{ marginBottom: "1rem" }}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{memberCount}</span>
              <span style={styles.statLabel}>Households</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{itemsAvailable}</span>
              <span style={styles.statLabel}>Items Available</span>
            </div>
          </div>
          <div className={responsive.grid2}>
            <Link
              href={`/neighborhoods/${primaryNeighborhood.slug}/settings`}
              style={styles.actionCard}
            >
              <span style={styles.actionIcon}>⚙️</span>
              <span>Neighborhood Settings</span>
            </Link>
            {canCreateNeighborhood && (
              <Link href="/neighborhoods/new" style={styles.actionCard}>
                <span style={styles.actionIcon}>🏘️</span>
                <span>New Neighborhood</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* New Neighborhood (for super admins without neighborhood admin role) */}
      {canCreateNeighborhood && !isAdmin && (
        <section style={styles.section}>
          <h2
            className={dashboardStyles.sectionTitle}
            style={{ marginBottom: "1rem" }}
          >
            Admin
          </h2>
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    gap: "1rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: "600",
    margin: 0,
  },
  settingsLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    padding: "0.5rem 1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
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
  seeAllLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  // Stats
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#111",
  },
  statLabel: {
    fontSize: "0.875rem",
    color: "#666",
  },
  // Admin banner
  adminBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    border: "1px solid #93c5fd",
    padding: "0.875rem 1.25rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    color: "#1e40af",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  adminBannerArrow: {
    fontSize: "1.25rem",
  },
  // Items grid
  itemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "1rem",
  },
  itemCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
    transition: "box-shadow 0.15s ease",
  },
  itemImageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: "1",
    backgroundColor: "#f3f4f6",
  },
  itemImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  itemPlaceholder: {
    position: "relative",
    width: "100%",
    aspectRatio: "1",
    backgroundColor: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  itemPlaceholderIcon: {
    fontSize: "2rem",
    opacity: 0.5,
  },
  newBadge: {
    position: "absolute",
    top: "8px",
    right: "8px",
    backgroundColor: "#22c55e",
    color: "white",
    fontSize: "0.625rem",
    fontWeight: "600",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  },
  itemInfo: {
    padding: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  itemName: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#111",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemOwner: {
    fontSize: "0.75rem",
    color: "#666",
  },
  // Members list
  memberList: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  memberRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.875rem 1rem",
    borderBottom: "1px solid #f0f0f0",
    textDecoration: "none",
    color: "inherit",
  },
  memberInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  memberAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  memberAvatarPlaceholder: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    fontWeight: "600",
  },
  memberDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
  },
  memberName: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#111",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  memberJoinDate: {
    fontSize: "0.75rem",
    color: "#666",
  },
  newBadgeInline: {
    backgroundColor: "#22c55e",
    color: "white",
    fontSize: "0.625rem",
    fontWeight: "600",
    padding: "0.125rem 0.375rem",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  },
  memberArrow: {
    color: "#999",
    fontSize: "1rem",
  },
  // Empty state
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
  // Banners
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
