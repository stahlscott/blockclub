import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Package, Users, ArrowRight } from "lucide-react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { parseDateLocal, getSeasonalClosing, formatRelativeTime } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { InviteButton } from "@/components/InviteButton";
import { Greeting } from "@/components/Greeting";
import {
  getRecentItems,
  getRecentMembers,
  getRecentPosts,
  getPendingMemberRequestsCount,
  getDashboardStats,
} from "./data";
import dashboardStyles from "./dashboard.module.css";

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  const stripped = name.replace(/^the\s+/i, "");
  return stripped.charAt(0)?.toUpperCase() || "?";
}

// Check if a date is within the last N days
function isWithinDays(dateStr: string, days: number) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

// Warm avatar background colors based on name hash
const AVATAR_COLORS = [
  "#E8D5CE", // warm stone
  "#D5C4B9", // taupe
  "#C9B8A8", // sand
  "#DED1C3", // cream
  "#E5DAD0", // light tan
  "#D4C5B5", // wheat
  "#CFC4B8", // mushroom
  "#E2D4C8", // blush stone
];

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default async function DashboardPage() {
  // Use cached getAuthUser - shared with layout/impersonation context
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/signin");
  }

  const supabase = await createClient();

  const { isStaffAdmin: isUserStaffAdmin, isImpersonating, effectiveUserId } =
    await getAuthContext(supabase, authUser);

  // Staff admins without impersonation should go to the staff panel
  if (isUserStaffAdmin && !isImpersonating) {
    redirect("/staff");
  }

  // Use admin client when impersonating to bypass RLS
  const queryClient = isImpersonating ? createAdminClient() : supabase;

  // Fetch user profile
  const { data: profile } = await queryClient
    .from("users")
    .select("*")
    .eq("id", effectiveUserId)
    .single();

  // Fetch user's memberships with neighborhood details
  const { data: memberships } = await queryClient
    .from("memberships")
    .select(
      `
      *,
      neighborhood:neighborhoods(*)
    `,
    )
    .eq("user_id", effectiveUserId)
    .eq("status", "active");

  // Fetch pending membership requests (user's own pending requests to join)
  const { data: pendingMemberships } = await queryClient
    .from("memberships")
    .select(
      `
      *,
      neighborhood:neighborhoods(*)
    `,
    )
    .eq("user_id", effectiveUserId)
    .eq("status", "pending");

  // Fetch user's items (for loan request notifications)
  const { data: userItems } = await queryClient
    .from("items")
    .select("id")
    .eq("owner_id", effectiveUserId);

  // Fetch pending loan requests for user's items
  const itemIds = userItems?.map((i) => i.id) || [];
  let pendingLoanRequests: any[] = [];
  if (itemIds.length > 0) {
    const { data: loans } = await queryClient
      .from("loans")
      .select(
        `
        *,
        item:items!loans_item_id_fkey(id, name, neighborhood_id, neighborhood:neighborhoods(slug)),
        borrower:users!loans_borrower_id_fkey(id, name)
      `,
      )
      .in("item_id", itemIds)
      .eq("status", "requested")
      .order("requested_at", { ascending: true });
    pendingLoanRequests = loans || [];
  }

  // Fetch user's active borrowed items
  // Note: Use FK hints for ambiguous relationships
  const { data: borrowedItems, error: borrowedError } = await queryClient
    .from("loans")
    .select(
      `
      *,
      item:items!loans_item_id_fkey(id, name, neighborhood_id, neighborhood:neighborhoods(slug), owner:users!items_owner_id_fkey(id, name))
    `,
    )
    .eq("borrower_id", effectiveUserId)
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

  // Check admin status based on membership role (not staff admin)
  // When impersonating, we inherit the impersonated user's permissions
  const isAdmin = primaryMembership?.role === "admin";

  // Fetch neighborhood-specific data if user has a primary neighborhood
  // Use cached functions for better performance
  let recentItems: any[] = [];
  let recentMembers: any[] = [];
  let recentPosts: any[] = [];
  let pendingMemberRequests = 0;
  let stats = { postsCount: 0, itemsCount: 0, neighborsCount: 0 };

  if (primaryNeighborhood) {
    // Fetch data in parallel
    // Pass queryClient to support impersonation (admin client bypasses RLS)
    const [items, members, posts, pendingCount, dashboardStats] = await Promise.all([
      getRecentItems(primaryNeighborhood.id, queryClient),
      getRecentMembers(primaryNeighborhood.id, effectiveUserId, queryClient),
      getRecentPosts(primaryNeighborhood.id, queryClient),
      isAdmin ? getPendingMemberRequestsCount(primaryNeighborhood.id, queryClient) : Promise.resolve(0),
      getDashboardStats(primaryNeighborhood.id, queryClient),
    ]);

    recentItems = items;
    recentMembers = members;
    recentPosts = posts;
    pendingMemberRequests = pendingCount;
    stats = dashboardStats;
  }

  return (
    <div className={dashboardStyles.container}>
      {primaryNeighborhood && (
        <div className={dashboardStyles.welcomeSection} data-testid="dashboard-welcome-section">
          <div>
            <h1 className={dashboardStyles.welcome}>
              <Greeting />
            </h1>
            <p className={dashboardStyles.neighborhoodName}>{primaryNeighborhood.name}</p>
          </div>
          <InviteButton slug={primaryNeighborhood.slug} variant="link" />
        </div>
      )}

      {/* Stat Cards - Figma layout: label on top, number below, icon on right */}
      {primaryNeighborhood && (
        <div className={dashboardStyles.statsGrid}>
          <Link
            href={`/neighborhoods/${primaryNeighborhood.slug}/posts`}
            className={dashboardStyles.statCardLink}
            data-testid="dashboard-stat-posts"
          >
            <Card className={dashboardStyles.statCard}>
              <CardContent className={dashboardStyles.statCardContent}>
                <div className={dashboardStyles.statInfo}>
                  <span className={dashboardStyles.statLabel}>Active Posts</span>
                  <span className={dashboardStyles.statValue}>{stats.postsCount}</span>
                </div>
                <div className={dashboardStyles.statIconWrapper} style={{ backgroundColor: "#FDEBD0" }}>
                  <MessageSquare className={dashboardStyles.statIcon} style={{ color: "#A65D4C" }} />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            href={`/neighborhoods/${primaryNeighborhood.slug}/library`}
            className={dashboardStyles.statCardLink}
            data-testid="dashboard-stat-library"
          >
            <Card className={dashboardStyles.statCard}>
              <CardContent className={dashboardStyles.statCardContent}>
                <div className={dashboardStyles.statInfo}>
                  <span className={dashboardStyles.statLabel}>Items Available</span>
                  <span className={dashboardStyles.statValue}>{stats.itemsCount}</span>
                </div>
                <div className={dashboardStyles.statIconWrapper} style={{ backgroundColor: "#D5F0E3" }}>
                  <Package className={dashboardStyles.statIcon} style={{ color: "#059669" }} />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            href={`/neighborhoods/${primaryNeighborhood.slug}/directory`}
            className={dashboardStyles.statCardLink}
            data-testid="dashboard-stat-directory"
          >
            <Card className={dashboardStyles.statCard}>
              <CardContent className={dashboardStyles.statCardContent}>
                <div className={dashboardStyles.statInfo}>
                  <span className={dashboardStyles.statLabel}>Neighbors</span>
                  <span className={dashboardStyles.statValue}>{stats.neighborsCount}</span>
                </div>
                <div className={dashboardStyles.statIconWrapper} style={{ backgroundColor: "#E0EEF2" }}>
                  <Users className={dashboardStyles.statIcon} style={{ color: "#5B8A9A" }} />
                </div>
              </CardContent>
            </Card>
          </Link>
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
              data-testid="dashboard-pending-requests-link"
            >
              <span>
                {pendingMemberRequests} pending membership request
                {pendingMemberRequests > 1 ? "s" : ""}
              </span>
              <span className={dashboardStyles.adminBannerArrow}>&rarr;</span>
            </Link>
          )}

          {/* Figma Layout: Posts + Directory row, then Library full-width */}
          <div className={dashboardStyles.sectionsContainer}>
            {/* Top Row: Recent Posts + Directory */}
            <div className={dashboardStyles.topRow}>
              {/* Recent Posts Section */}
              <div className={`${dashboardStyles.sectionCard} ${dashboardStyles.postsSection}`} data-testid="dashboard-posts-section">
                <div className={dashboardStyles.sectionHeader}>
                  <div className={dashboardStyles.sectionHeaderLeft}>
                    <div className={dashboardStyles.sectionTitleRow}>
                      <MessageSquare className={dashboardStyles.sectionIcon} />
                      <h2 className={dashboardStyles.sectionTitleText}>Recent Posts</h2>
                    </div>
                    <p className={dashboardStyles.sectionSubtitle}>
                      {stats.postsCount} post{stats.postsCount !== 1 ? "s" : ""} in your neighborhood
                    </p>
                  </div>
                  <Link
                    href={`/neighborhoods/${primaryNeighborhood.slug}/posts`}
                    className={dashboardStyles.viewAllLink}
                    data-testid="dashboard-posts-link"
                  >
                    View all <ArrowRight className={dashboardStyles.viewAllArrow} />
                  </Link>
                </div>
                <div className={dashboardStyles.sectionContent}>
                  {recentPosts.length > 0 ? (
                    recentPosts.slice(0, 3).map((post: any) => {
                      const timeAgo = post.created_at ? formatRelativeTime(post.created_at) : "";
                      return (
                        <Link
                          key={post.id}
                          href={`/neighborhoods/${primaryNeighborhood.slug}/posts`}
                          className={dashboardStyles.itemCard}
                        >
                          <div
                            className={dashboardStyles.itemCardAvatar}
                            style={{ backgroundColor: getAvatarColor(post.author?.name) }}
                          >
                            {post.author?.avatar_url ? (
                              <Image
                                src={post.author.avatar_url}
                                alt={post.author.name || "Author"}
                                width={40}
                                height={40}
                                className={dashboardStyles.itemCardAvatarImage}
                              />
                            ) : (
                              getInitial(post.author?.name)
                            )}
                          </div>
                          <div className={dashboardStyles.itemCardContent}>
                            <div className={dashboardStyles.itemCardHeader}>
                              <span className={dashboardStyles.itemCardName}>
                                {post.author?.name || "Unknown"}
                              </span>
                              <span className={dashboardStyles.itemCardMeta}>{timeAgo}</span>
                            </div>
                            <p className={dashboardStyles.itemCardPreview}>
                              {post.content.length > 60
                                ? post.content.slice(0, 60) + "..."
                                : post.content}
                            </p>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className={dashboardStyles.sectionEmpty}>
                      Nothing posted lately
                    </div>
                  )}
                </div>
              </div>

              {/* Directory Section */}
              <div className={dashboardStyles.sectionCard} data-testid="dashboard-directory-section">
                <div className={dashboardStyles.sectionHeader}>
                  <div className={dashboardStyles.sectionHeaderLeft}>
                    <div className={dashboardStyles.sectionTitleRow}>
                      <Users className={dashboardStyles.sectionIcon} />
                      <h2 className={dashboardStyles.sectionTitleText}>Directory</h2>
                    </div>
                    <p className={dashboardStyles.sectionSubtitle}>
                      {stats.neighborsCount} household{stats.neighborsCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={`/neighborhoods/${primaryNeighborhood.slug}/directory`}
                    className={dashboardStyles.viewAllLink}
                    data-testid="dashboard-directory-link"
                  >
                    View all <ArrowRight className={dashboardStyles.viewAllArrow} />
                  </Link>
                </div>
                <div className={dashboardStyles.sectionContent}>
                  {recentMembers.length > 0 ? (
                    recentMembers.slice(0, 3).map((membership: any) => {
                      const isNew = membership.joined_at && isWithinDays(membership.joined_at, 14);
                      return (
                        <Link
                          key={membership.id}
                          href={`/neighborhoods/${primaryNeighborhood.slug}/members/${membership.user?.id}`}
                          className={dashboardStyles.memberCard}
                        >
                          <div
                            className={dashboardStyles.memberCardAvatar}
                            style={{ backgroundColor: getAvatarColor(membership.user?.name) }}
                          >
                            {membership.user?.avatar_url ? (
                              <Image
                                src={membership.user.avatar_url}
                                alt={membership.user.name || "Member"}
                                width={48}
                                height={48}
                                className={dashboardStyles.memberCardAvatarImage}
                              />
                            ) : (
                              getInitial(membership.user?.name)
                            )}
                          </div>
                          <div className={dashboardStyles.memberCardContent}>
                            <span className={dashboardStyles.memberCardName}>
                              {membership.user?.name || "Unknown"}
                              {isNew && (
                                <span className={dashboardStyles.newBadgeInline} style={{ marginLeft: '8px' }}>New</span>
                              )}
                            </span>
                            {membership.user?.address && (
                              <span className={dashboardStyles.memberCardAddress}>
                                {membership.user.address}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className={dashboardStyles.sectionEmpty}>
                      No one new lately
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lending Library Section - Full Width */}
            <div className={dashboardStyles.sectionCard} data-testid="dashboard-library-section">
              <div className={dashboardStyles.sectionHeader}>
                <div className={dashboardStyles.sectionHeaderLeft}>
                  <div className={dashboardStyles.sectionTitleRow}>
                    <Package className={dashboardStyles.sectionIcon} />
                    <h2 className={dashboardStyles.sectionTitleText}>Lending Library</h2>
                  </div>
                  <p className={dashboardStyles.sectionSubtitle}>
                    {stats.itemsCount} item{stats.itemsCount !== 1 ? "s" : ""} available
                  </p>
                </div>
                <Link
                  href={`/neighborhoods/${primaryNeighborhood.slug}/library`}
                  className={dashboardStyles.viewAllLink}
                  data-testid="dashboard-library-link"
                >
                  View all <ArrowRight className={dashboardStyles.viewAllArrow} />
                </Link>
              </div>
              <div className={dashboardStyles.libraryGrid}>
                {recentItems.length > 0 ? (
                  recentItems.slice(0, 3).map((item: any) => {
                    const isNew = item.created_at && isWithinDays(item.created_at, 14);
                    return (
                      <Link
                        key={item.id}
                        href={`/neighborhoods/${primaryNeighborhood.slug}/library/${item.id}`}
                        className={dashboardStyles.libraryItemCard}
                      >
                        <div className={dashboardStyles.libraryItemHeader}>
                          <span className={dashboardStyles.libraryItemName}>{item.name}</span>
                          {isNew && (
                            <span className={dashboardStyles.newBadgeInline}>New</span>
                          )}
                        </div>
                        <span className={dashboardStyles.libraryItemOwner}>
                          by {item.owner?.name || "Unknown"}
                        </span>
                        <span className={dashboardStyles.libraryItemStatus}>Available</span>
                      </Link>
                    );
                  })
                ) : (
                  <div className={dashboardStyles.sectionEmpty}>
                    Nothing shared lately
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
            <h2 className={dashboardStyles.emptyTitle}>No neighborhood yet</h2>
            <p className={dashboardStyles.emptyText}>
              Ask a neighbor to share their invite link, or start your own
              block club! {getSeasonalClosing()}
            </p>
          </div>
        </section>
      )}

    </div>
  );
}
