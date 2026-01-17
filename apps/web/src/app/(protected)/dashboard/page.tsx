import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import dashboardStyles from "./dashboard.module.css";

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

  const isUserStaffAdmin = isStaffAdmin(authUser.email);

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
  let recentItems: any[] = [];
  let recentMembers: any[] = [];
  let recentPosts: any[] = [];
  let pendingMemberRequests = 0;
  // Staff admins have admin privileges in all neighborhoods
  const isAdmin =
    primaryMembership?.role === "admin" || isStaffAdmin(authUser.email);

  if (primaryNeighborhood) {
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
    // Filter out staff admin users and current user from the recent members list
    recentMembers = (members || []).filter(
      (m: any) => !isStaffAdmin(m.user?.email) && m.user_id !== authUser.id,
    );

    // Fetch recent posts
    const { data: postsData } = await supabase
      .from("posts")
      .select("*, author:users!author_id(id, name, avatar_url)")
      .eq("neighborhood_id", primaryNeighborhood.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    recentPosts = postsData || [];

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

  return (
    <div className={dashboardStyles.container}>
      {primaryNeighborhood && (
        <div>
          <h1 className={dashboardStyles.welcome}>Welcome back!</h1>
          <p className={dashboardStyles.neighborhoodName}>{primaryNeighborhood.name}</p>
        </div>
      )}

      {/* Borrow Requests Banner */}
      {pendingLoanRequests.length > 0 && (
        <section className={dashboardStyles.section}>
          <div className={dashboardStyles.loanRequestsBanner}>
            <div className={dashboardStyles.loanRequestsHeader}>
              <span className={dashboardStyles.pendingIcon}>📬</span>
              <strong>
                {pendingLoanRequests.length} Borrow Request
                {pendingLoanRequests.length > 1 ? "s" : ""}
              </strong>
            </div>
            <div className={dashboardStyles.loanRequestsList}>
              {pendingLoanRequests.slice(0, 3).map((loan: any) => (
                <Link
                  key={loan.id}
                  href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                  className={dashboardStyles.loanRequestItem}
                >
                  <span>
                    <strong>{loan.borrower?.name}</strong> wants to borrow{" "}
                    <strong>{loan.item?.name}</strong>
                  </span>
                  <span className={dashboardStyles.loanRequestArrow}>&rarr;</span>
                </Link>
              ))}
              {pendingLoanRequests.length > 3 && (
                <p className={dashboardStyles.moreRequests}>
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
                <section className={dashboardStyles.section}>
                  <div className={dashboardStyles.overdueBanner}>
                    <div className={dashboardStyles.overdueHeader}>
                      <span className={dashboardStyles.pendingIcon}>⚠️</span>
                      <strong>
                        {overdueItems.length} Overdue Item
                        {overdueItems.length > 1 ? "s" : ""}
                      </strong>
                    </div>
                    <div className={dashboardStyles.overdueList}>
                      {overdueItems.map((loan: any) => (
                        <Link
                          key={loan.id}
                          href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                          className={dashboardStyles.overdueItem}
                        >
                          <div className={dashboardStyles.borrowedItemInfo}>
                            <span className={dashboardStyles.overdueItemName}>
                              {loan.item?.name}
                            </span>
                            <span className={dashboardStyles.overdueItemDue}>
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
                          <span className={dashboardStyles.overdueArrow}>&rarr;</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {currentItems.length > 0 && (
                <section className={dashboardStyles.section}>
                  <div className={dashboardStyles.borrowedBanner}>
                    <div className={dashboardStyles.borrowedHeader}>
                      <span className={dashboardStyles.pendingIcon}>📦</span>
                      <strong>
                        You&apos;re Borrowing {currentItems.length} Item
                        {currentItems.length > 1 ? "s" : ""}
                      </strong>
                    </div>
                    <div className={dashboardStyles.borrowedList}>
                      {currentItems.map((loan: any) => (
                        <Link
                          key={loan.id}
                          href={`/neighborhoods/${loan.item?.neighborhood?.slug}/library/${loan.item_id}`}
                          className={dashboardStyles.borrowedItem}
                        >
                          <div className={dashboardStyles.borrowedItemInfo}>
                            <span className={dashboardStyles.borrowedItemName}>
                              {loan.item?.name}
                            </span>
                            <span className={dashboardStyles.borrowedItemOwner}>
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
                          <span className={dashboardStyles.loanRequestArrow}>&rarr;</span>
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
        <section className={dashboardStyles.section}>
          <div className={dashboardStyles.pendingBanner}>
            <span className={dashboardStyles.pendingIcon}>⏳</span>
            <div>
              <strong>Pending Requests</strong>
              <p className={dashboardStyles.pendingText}>
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
              className={dashboardStyles.adminBanner}
            >
              <span>
                {pendingMemberRequests} pending membership request
                {pendingMemberRequests > 1 ? "s" : ""}
              </span>
              <span className={dashboardStyles.adminBannerArrow}>&rarr;</span>
            </Link>
          )}

          {/* Unified Sections Grid */}
          <div className={dashboardStyles.unifiedGrid}>
            {/* Posts Section */}
            <div className={dashboardStyles.unifiedSection}>
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/posts`}
                className={dashboardStyles.unifiedSectionHeader}
              >
                <div className={dashboardStyles.unifiedSectionHeaderLeft}>
                  <span className={dashboardStyles.unifiedSectionIcon}>📝</span>
                  <h2 className={dashboardStyles.unifiedSectionTitle}>Posts</h2>
                </div>
                <span className={dashboardStyles.unifiedSectionArrow}>&rarr;</span>
              </Link>
              <div className={dashboardStyles.unifiedSectionContent}>
                {recentPosts.length > 0 ? (
                  recentPosts.slice(0, 3).map((post: any) => {
                    const isNew = post.created_at && isWithinDays(post.created_at, 3);
                    return (
                      <Link
                        key={post.id}
                        href={`/neighborhoods/${primaryNeighborhood.slug}/posts`}
                        className={dashboardStyles.unifiedItemRow}
                      >
                        <div className={dashboardStyles.unifiedItemInfo}>
                          {post.author?.avatar_url ? (
                            <Image
                              src={post.author.avatar_url}
                              alt={post.author.name || "Author"}
                              width={32}
                              height={32}
                              className={dashboardStyles.unifiedItemAvatar}
                            />
                          ) : (
                            <div className={dashboardStyles.unifiedItemAvatarPlaceholder}>
                              {getInitial(post.author?.name)}
                            </div>
                          )}
                          <div className={dashboardStyles.unifiedItemDetails}>
                            <span className={dashboardStyles.unifiedItemName}>
                              {post.author?.name || "Unknown"}
                              {isNew && (
                                <span className={dashboardStyles.newBadgeInline}>New</span>
                              )}
                            </span>
                            <span className={dashboardStyles.unifiedItemMeta}>
                              {post.content.length > 50
                                ? post.content.slice(0, 50) + "..."
                                : post.content}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className={dashboardStyles.unifiedSectionEmpty}>
                    No recent posts
                  </div>
                )}
              </div>
            </div>

            {/* Library Section */}
            <div className={dashboardStyles.unifiedSection}>
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/library`}
                className={dashboardStyles.unifiedSectionHeader}
              >
                <div className={dashboardStyles.unifiedSectionHeaderLeft}>
                  <span className={dashboardStyles.unifiedSectionIcon}>📚</span>
                  <h2 className={dashboardStyles.unifiedSectionTitle}>Library</h2>
                </div>
                <span className={dashboardStyles.unifiedSectionArrow}>&rarr;</span>
              </Link>
              <div className={dashboardStyles.unifiedSectionContent}>
                {recentItems.length > 0 ? (
                  recentItems.slice(0, 3).map((item: any) => {
                    const isNew = item.created_at && isWithinDays(item.created_at, 14);
                    return (
                      <Link
                        key={item.id}
                        href={`/neighborhoods/${primaryNeighborhood.slug}/library/${item.id}`}
                        className={dashboardStyles.unifiedItemRow}
                      >
                        <div className={dashboardStyles.unifiedItemInfo}>
                          {item.photo_urls && item.photo_urls.length > 0 ? (
                            <Image
                              src={item.photo_urls[0]}
                              alt={item.name}
                              width={40}
                              height={40}
                              className={dashboardStyles.unifiedItemImage}
                            />
                          ) : (
                            <div className={dashboardStyles.unifiedItemImagePlaceholder}>
                              📦
                            </div>
                          )}
                          <div className={dashboardStyles.unifiedItemDetails}>
                            <span className={dashboardStyles.unifiedItemName}>
                              {item.name}
                              {isNew && (
                                <span className={dashboardStyles.newBadgeInline}>New</span>
                              )}
                            </span>
                            <span className={dashboardStyles.unifiedItemMeta}>
                              {item.owner?.name || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className={dashboardStyles.unifiedSectionEmpty}>
                    No recent items
                  </div>
                )}
              </div>
            </div>

            {/* Directory Section */}
            <div className={dashboardStyles.unifiedSection}>
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/directory`}
                className={dashboardStyles.unifiedSectionHeader}
              >
                <div className={dashboardStyles.unifiedSectionHeaderLeft}>
                  <span className={dashboardStyles.unifiedSectionIcon}>👥</span>
                  <h2 className={dashboardStyles.unifiedSectionTitle}>Directory</h2>
                </div>
                <span className={dashboardStyles.unifiedSectionArrow}>&rarr;</span>
              </Link>
              <div className={dashboardStyles.unifiedSectionContent}>
                {recentMembers.length > 0 ? (
                  recentMembers.slice(0, 3).map((membership: any) => {
                    const isNew = membership.joined_at && isWithinDays(membership.joined_at, 14);
                    return (
                      <Link
                        key={membership.id}
                        href={`/neighborhoods/${primaryNeighborhood.slug}/members/${membership.user?.id}`}
                        className={dashboardStyles.unifiedItemRow}
                      >
                        <div className={dashboardStyles.unifiedItemInfo}>
                          {membership.user?.avatar_url ? (
                            <Image
                              src={membership.user.avatar_url}
                              alt={membership.user.name || "Member"}
                              width={32}
                              height={32}
                              className={dashboardStyles.unifiedItemAvatar}
                            />
                          ) : (
                            <div className={dashboardStyles.unifiedItemAvatarPlaceholder}>
                              {getInitial(membership.user?.name)}
                            </div>
                          )}
                          <div className={dashboardStyles.unifiedItemDetails}>
                            <span className={dashboardStyles.unifiedItemName}>
                              {membership.user?.name || "Unknown"}
                              {isNew && (
                                <span className={dashboardStyles.newBadgeInline}>New</span>
                              )}
                            </span>
                            {membership.joined_at && (
                              <span className={dashboardStyles.unifiedItemMeta}>
                                Joined{" "}
                                {new Date(membership.joined_at).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className={dashboardStyles.unifiedSectionEmpty}>
                    No recent households
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <section className={dashboardStyles.section}>
          <div className={dashboardStyles.emptyState}>
            <div className={dashboardStyles.emptyIllustration}>🏘️</div>
            <h2 className={dashboardStyles.emptyTitle}>No neighborhoods yet</h2>
            <p className={dashboardStyles.emptyText}>
              You haven&apos;t joined any neighborhoods yet. Ask a neighbor to
              share their invite link with you!
            </p>
            {isUserStaffAdmin && (
              <Link href="/neighborhoods/new" className={dashboardStyles.primaryButton}>
                Create a Neighborhood
              </Link>
            )}
          </div>
        </section>
      )}

    </div>
  );
}
