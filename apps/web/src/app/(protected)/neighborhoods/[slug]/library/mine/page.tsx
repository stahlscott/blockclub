import Link from "next/link";
import Image from "next/image";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import styles from "../library-pages.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MyItemsPage({ params }: Props) {
  const { slug } = await params;
  const { user, neighborhood, supabase } = await getNeighborhoodAccess(slug);

  // Fetch user's items
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch pending requests for user's items
  const itemIds = items?.map((i) => i.id) || [];
  const { data: pendingRequests } =
    itemIds.length > 0
      ? await supabase
          .from("loans")
          .select("item_id")
          .in("item_id", itemIds)
          .eq("status", "requested")
      : { data: [] };

  const requestCountByItem =
    pendingRequests?.reduce((acc: Record<string, number>, loan) => {
      acc[loan.item_id] = (acc[loan.item_id] || 0) + 1;
      return acc;
    }, {}) || {};

  const getAvailabilityClass = (availability: string) => {
    switch (availability) {
      case "available":
        return styles.availableTag;
      case "borrowed":
        return styles.borrowedTag;
      default:
        return styles.unavailableTag;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerWithAction}>
        <div>
          <Link href={`/neighborhoods/${slug}/library`} className={styles.backLink}>
            &larr; Back to Library
          </Link>
          <h1 className={styles.title}>My Items</h1>
          <p className={styles.subtitle}>
            {items?.length || 0} item{items?.length !== 1 ? "s" : ""}{" "}
            you&apos;re sharing
          </p>
        </div>
        <Link
          href={`/neighborhoods/${slug}/library/new`}
          className={styles.addButton}
        >
          + Add Item
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div className={styles.list}>
          {items.map((item) => {
            const pendingCount = requestCountByItem[item.id] || 0;
            return (
              <Link
                key={item.id}
                href={`/neighborhoods/${slug}/library/${item.id}`}
                className={styles.itemCard}
              >
                <div className={styles.itemImageContainer}>
                  {item.photo_urls && item.photo_urls.length > 0 ? (
                    <Image
                      src={item.photo_urls[0]}
                      alt={item.name}
                      width={80}
                      height={80}
                      className={styles.itemImage}
                    />
                  ) : (
                    <div className={styles.itemImagePlaceholder}>
                      <span>📦</span>
                    </div>
                  )}
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                    {pendingCount > 0 && (
                      <span className={styles.requestBadge}>
                        {pendingCount} request{pendingCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className={styles.itemCategory}>{item.category}</p>
                  <span
                    className={`${styles.availabilityTag} ${getAvailabilityClass(item.availability)}`}
                  >
                    {item.availability}
                  </span>
                </div>
                <div className={styles.chevron}>&rarr;</div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            You haven&apos;t added any items to the library yet.
          </p>
          <Link
            href={`/neighborhoods/${slug}/library/new`}
            className={styles.emptyButton}
          >
            Add your first item
          </Link>
        </div>
      )}
    </div>
  );
}
