import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffNeighborhoodDetail } from "@/lib/queries";
import { MemberList } from "./member-list";
import { ActAsAdminButton } from "./act-as-admin-button";
import { AddMemberModal } from "./add-member-modal";
import { InviteButton } from "@/components/InviteButton";
import styles from "./detail.module.css";

async function getNeighborhoodWithMembers(slug: string) {
  const adminSupabase = createAdminClient();
  return getStaffNeighborhoodDetail(adminSupabase, slug);
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
