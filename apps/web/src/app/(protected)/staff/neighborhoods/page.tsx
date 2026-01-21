import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { NeighborhoodsTable } from "./neighborhoods-table";
import styles from "./neighborhoods.module.css";

interface NeighborhoodRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface MembershipCountRow {
  neighborhood_id: string;
}

interface ItemCountRow {
  neighborhood_id: string;
}

async function getNeighborhoods() {
  const adminSupabase = createAdminClient();

  const { data: neighborhoods } = await adminSupabase
    .from("neighborhoods")
    .select("id, name, slug, created_at")
    .order("name");

  if (!neighborhoods) return [];

  // Get counts for each neighborhood
  const typedNeighborhoods = neighborhoods as NeighborhoodRow[];
  const neighborhoodIds = typedNeighborhoods.map((n) => n.id);

  const [membershipCounts, itemCounts] = await Promise.all([
    adminSupabase
      .from("memberships")
      .select("neighborhood_id")
      .in("neighborhood_id", neighborhoodIds.length > 0 ? neighborhoodIds : [""])
      .eq("status", "active")
      .is("deleted_at", null),
    adminSupabase
      .from("items")
      .select("neighborhood_id")
      .in("neighborhood_id", neighborhoodIds.length > 0 ? neighborhoodIds : [""])
      .is("deleted_at", null),
  ]);

  const memberCountMap: Record<string, number> = {};
  const itemCountMap: Record<string, number> = {};

  ((membershipCounts.data || []) as MembershipCountRow[]).forEach((m) => {
    memberCountMap[m.neighborhood_id] = (memberCountMap[m.neighborhood_id] || 0) + 1;
  });

  ((itemCounts.data || []) as ItemCountRow[]).forEach((i) => {
    itemCountMap[i.neighborhood_id] = (itemCountMap[i.neighborhood_id] || 0) + 1;
  });

  return typedNeighborhoods.map((n) => ({
    ...n,
    memberCount: memberCountMap[n.id] || 0,
    itemCount: itemCountMap[n.id] || 0,
  }));
}

export default async function StaffNeighborhoodsPage() {
  const neighborhoods = await getNeighborhoods();

  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>All Neighborhoods ({neighborhoods.length})</h2>
        <Link
          href="/neighborhoods/new"
          className={styles.newButton}
          data-testid="staff-neighborhoods-new-button"
        >
          + New Neighborhood
        </Link>
      </div>
      <NeighborhoodsTable neighborhoods={neighborhoods} />
    </div>
  );
}
