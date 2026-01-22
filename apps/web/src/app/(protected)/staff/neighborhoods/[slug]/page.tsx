import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberList } from "./member-list";
import { ActAsAdminButton } from "./act-as-admin-button";
import { AddMemberModal } from "./add-member-modal";
import { InviteButton } from "@/components/InviteButton";
import styles from "./detail.module.css";

interface MemberRow {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  membership_id: string;
  role: string;
  status: string;
  joined_at: string;
}

interface NeighborhoodRow {
  id: string;
  name: string;
  slug: string;
}

interface MembershipQueryRow {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
}

interface UserQueryRow {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

async function getNeighborhoodWithMembers(slug: string) {
  const adminSupabase = createAdminClient();

  // Get neighborhood
  const { data: neighborhoodData } = await adminSupabase
    .from("neighborhoods")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!neighborhoodData) return null;

  const neighborhood = neighborhoodData as NeighborhoodRow;

  // Get memberships (without user join - use separate queries like staff/users search)
  const { data: membershipsRaw, error: membershipsError } = await adminSupabase
    .from("memberships")
    .select("id, user_id, role, status, joined_at")
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null)
    .order("joined_at", { ascending: false });

  console.log("Memberships query result:", {
    count: membershipsRaw?.length,
    error: membershipsError,
    neighborhoodId: neighborhood.id
  });

  const membershipsData = (membershipsRaw || []) as MembershipQueryRow[];

  if (membershipsData.length === 0) {
    return {
      neighborhood,
      members: [],
      itemCount: 0,
      adminUserId: null,
    };
  }

  // Get users separately (same pattern as staff/users search)
  const userIds = membershipsData.map((m) => m.user_id);
  const { data: usersRaw } = await adminSupabase
    .from("users")
    .select("id, name, email, avatar_url")
    .in("id", userIds);

  const usersData = (usersRaw || []) as UserQueryRow[];
  const usersMap = new Map(usersData.map((u) => [u.id, u]));

  const members: MemberRow[] = membershipsData.map((m) => {
    const user = usersMap.get(m.user_id);
    return {
      id: user?.id || m.user_id,
      name: user?.name || null,
      email: user?.email || "unknown",
      avatar_url: user?.avatar_url || null,
      membership_id: m.id,
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
    };
  });

  // Get counts
  const { count: itemCount } = await adminSupabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null);

  // Find admin user
  const adminMember = members.find(
    (m) => m.role === "admin" && m.status === "active"
  );

  return {
    neighborhood,
    members,
    itemCount: itemCount || 0,
    adminUserId: adminMember?.id || null,
  };
}

export default async function NeighborhoodDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getNeighborhoodWithMembers(slug);

  if (!data) {
    notFound();
  }

  const { neighborhood, members, itemCount, adminUserId } = data;
  const activeCount = members.filter((m) => m.status === "active").length;
  const adminCount = members.filter(
    (m) => m.role === "admin" && m.status === "active"
  ).length;
  const existingMemberIds = members.map((m) => m.id);

  return (
    <div>
      <Link
        href="/staff/neighborhoods"
        className={styles.backLink}
        data-testid="back-to-neighborhoods-link"
      >
        &larr; Back to Neighborhoods
      </Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>{neighborhood.name}</h2>
          <div className={styles.meta}>
            <span>slug: {neighborhood.slug}</span>
            <span>{activeCount} members</span>
            <span>{itemCount} items</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <AddMemberModal
            neighborhoodId={neighborhood.id}
            existingMemberIds={existingMemberIds}
          />
          <ActAsAdminButton adminUserId={adminUserId} />
          <Link
            href={`/neighborhoods/${slug}/settings`}
            className={styles.settingsLink}
            data-testid="neighborhood-settings-link"
          >
            Settings
          </Link>
        </div>
      </div>

      <MemberList
        members={members}
        neighborhoodSlug={slug}
        adminCount={adminCount}
      />

      <div className={styles.quickLinks}>
        <InviteButton slug={slug} variant="text" />
        <Link
          href={`/join/${slug}`}
          className={styles.quickLink}
          target="_blank"
          data-testid="view-join-page-link"
        >
          View Join Page
        </Link>
      </div>
    </div>
  );
}
