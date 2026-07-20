import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffNeighborhoods } from "@/lib/queries";
import { NeighborhoodsTable } from "./neighborhoods-table";
import styles from "./neighborhoods.module.css";

async function getNeighborhoods() {
  const adminSupabase = createAdminClient();

  const { data: neighborhoods } = await getStaffNeighborhoods(adminSupabase);
  return neighborhoods;
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
