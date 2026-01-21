import Link from "next/link";
import styles from "./neighborhoods.module.css";

interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  memberCount: number;
  itemCount: number;
}

interface NeighborhoodsTableProps {
  neighborhoods: Neighborhood[];
}

export function NeighborhoodsTable({ neighborhoods }: NeighborhoodsTableProps) {
  return (
    <div className={styles.table} data-testid="staff-neighborhoods-table">
      <div className={styles.tableHeader}>
        <span>Name</span>
        <span className={styles.hideOnMobile}>Slug</span>
        <span className={`${styles.centeredHeader} ${styles.hideOnMobile}`}>Members</span>
        <span className={`${styles.centeredHeader} ${styles.hideOnMobile}`}>Items</span>
        <span className={styles.hideOnMobile}>Created</span>
        <span></span>
      </div>
      {neighborhoods.map((n) => (
        <div key={n.id} className={styles.tableRow} data-testid={`staff-neighborhoods-row-${n.slug}`}>
          <span className={styles.name}>{n.name}</span>
          <span className={`${styles.slug} ${styles.hideOnMobile}`}>{n.slug}</span>
          <span className={`${styles.count} ${styles.hideOnMobile}`}>{n.memberCount}</span>
          <span className={`${styles.count} ${styles.hideOnMobile}`}>{n.itemCount}</span>
          <span className={`${styles.date} ${styles.hideOnMobile}`}>
            {new Date(n.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Link
            href={`/staff/neighborhoods/${n.slug}`}
            className={styles.viewLink}
            data-testid={`staff-neighborhoods-view-link-${n.slug}`}
            aria-label={`View details for ${n.name}`}
          >
            View
          </Link>
        </div>
      ))}
      {neighborhoods.length === 0 && (
        <div className={styles.emptyRow}>No neighborhoods yet</div>
      )}
    </div>
  );
}
