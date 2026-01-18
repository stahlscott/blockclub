import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { parseDateLocal } from "@/lib/date-utils";
import {
  getCategoryEmoji,
  getCategoryColorLight,
} from "@/lib/category-utils";
import type { ItemCategory } from "@blockclub/shared";
import { InviteButton } from "@/components/InviteButton";
import {
  getRecentItems,
  getRecentMembers,
  getRecentPosts,
  getPendingMemberRequestsCount,
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

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

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

  if (primaryNeighborhood) {
    // Fetch data in parallel using cached functions
    const [items, members, posts, pendingCount] = await Promise.all([
      getRecentItems(primaryNeighborhood.id),
      getRecentMembers(primaryNeighborhood.id, effectiveUserId),
      getRecentPosts(primaryNeighborhood.id),
      isAdmin ? getPendingMemberRequestsCount(primaryNeighborhood.id) : Promise.resolve(0),
    ]);

    recentItems = items;
    recentMembers = members;
    recentPosts = posts;
    pendingMemberRequests = pendingCount;
  }

  return (
    <div className={dashboardStyles.container}>
      {primaryNeighborhood && (
        <div className={dashboardStyles.welcomeSection} data-testid="dashboard-welcome-section">
          <div>
            <h1 className={dashboardStyles.welcome}>Welcome back!</h1>
            <p className={dashboardStyles.neighborhoodName}>{primaryNeighborhood.name}</p>
          </div>
          <InviteButton slug={primaryNeighborhood.slug} variant="link" />
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

          {/* Unified Sections Grid */}
          <div className={dashboardStyles.unifiedGrid}>
            {/* Posts Section */}
            <div className={dashboardStyles.unifiedSection} data-testid="dashboard-posts-section">
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/posts`}
                className={dashboardStyles.unifiedSectionHeader}
                data-testid="dashboard-posts-link"
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
            <div className={dashboardStyles.unifiedSection} data-testid="dashboard-library-section">
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/library`}
                className={dashboardStyles.unifiedSectionHeader}
                data-testid="dashboard-library-link"
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
                            <div
                              className={dashboardStyles.unifiedItemImagePlaceholder}
                              style={{
                                background: `linear-gradient(180deg, ${getCategoryColorLight(item.category as ItemCategory)} 0%, var(--color-surface) 100%)`,
                              }}
                            >
                              {getCategoryEmoji(item.category as ItemCategory)}
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
            <div className={dashboardStyles.unifiedSection} data-testid="dashboard-directory-section">
              <Link
                href={`/neighborhoods/${primaryNeighborhood.slug}/directory`}
                className={dashboardStyles.unifiedSectionHeader}
                data-testid="dashboard-directory-link"
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
          </div>
        </section>
      )}

    </div>
  );
}
