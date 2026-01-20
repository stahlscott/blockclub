import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberList } from "./member-list";
import { ActAsAdminButton } from "./act-as-admin-button";
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

interface MembershipRow {
  id: string;
  role: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
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

  // Get members
  const { data: membershipsData } = await adminSupabase
    .from("memberships")
    .select(
      `
      id,
      role,
      status,
      created_at,
      user:users(id, name, email, avatar_url)
    `
    )
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const memberships = (membershipsData || []) as MembershipRow[];

  const members: MemberRow[] = memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatar_url: m.user.avatar_url,
    membership_id: m.id,
    role: m.role,
    status: m.status,
    joined_at: m.created_at,
  }));

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
          <ActAsAdminButton
            adminUserId={adminUserId}
            neighborhoodSlug={slug}
          />
          <Link
            href={`/neighborhoods/${slug}/settings`}
            className={styles.settingsLink}
            data-testid="neighborhood-settings-link"
          >
            Settings
          </Link>
        </div>
      </div>

      <MemberList members={members} neighborhoodSlug={slug} />

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
