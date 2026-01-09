import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MyItemsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  // Fetch neighborhood
  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!neighborhood) {
    notFound();
  }

  // Check membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    redirect(`/neighborhoods/${slug}`);
  }

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <Link href={`/neighborhoods/${slug}/library`} style={styles.backLink}>
            &larr; Back to Library
          </Link>
          <h1 style={styles.title}>My Items</h1>
          <p style={styles.subtitle}>
            {items?.length || 0} item{items?.length !== 1 ? "s" : ""}{" "}
            you&apos;re sharing
          </p>
        </div>
        <Link
          href={`/neighborhoods/${slug}/library/new`}
          style={styles.addButton}
        >
          + Add Item
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div style={styles.list}>
          {items.map((item) => {
            const pendingCount = requestCountByItem[item.id] || 0;
            return (
              <Link
                key={item.id}
                href={`/neighborhoods/${slug}/library/${item.id}`}
                style={styles.itemCard}
              >
                <div style={styles.itemImageContainer}>
                  {item.photo_urls && item.photo_urls.length > 0 ? (
                    <Image
                      src={item.photo_urls[0]}
                      alt={item.name}
                      width={80}
                      height={80}
                      style={styles.itemImage}
                    />
                  ) : (
                    <div style={styles.itemImagePlaceholder}>
                      <span>📦</span>
                    </div>
                  )}
                </div>
                <div style={styles.itemContent}>
                  <div style={styles.itemHeader}>
                    <h3 style={styles.itemName}>{item.name}</h3>
                    {pendingCount > 0 && (
                      <span style={styles.requestBadge}>
                        {pendingCount} request{pendingCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p style={styles.itemCategory}>{item.category}</p>
                  <span
                    style={{
                      ...styles.availabilityTag,
                      ...(item.availability === "available"
                        ? styles.availableTag
                        : item.availability === "borrowed"
                          ? styles.borrowedTag
                          : styles.unavailableTag),
                    }}
                  >
                    {item.availability}
                  </span>
                </div>
                <div style={styles.chevron}>&rarr;</div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            You haven&apos;t added any items to the library yet.
          </p>
          <Link
            href={`/neighborhoods/${slug}/library/new`}
            style={styles.emptyButton}
          >
            Add your first item
          </Link>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "1.5rem 1rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1rem",
  },
  title: {
    margin: "0",
    fontSize: "1.75rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0.25rem 0 0 0",
    color: "#666",
    fontSize: "0.875rem",
  },
  addButton: {
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.25rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "0.875rem",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  itemCard: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
  },
  itemImageContainer: {
    width: "64px",
    height: "64px",
    borderRadius: "6px",
    overflow: "hidden",
    flexShrink: 0,
  },
  itemImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  itemName: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "500",
  },
  requestBadge: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "500",
  },
  itemCategory: {
    margin: "0.25rem 0 0.5rem 0",
    fontSize: "0.875rem",
    color: "#666",
    textTransform: "capitalize",
  },
  availabilityTag: {
    display: "inline-block",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    textTransform: "capitalize",
  },
  availableTag: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  borrowedTag: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  unavailableTag: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  chevron: {
    color: "#999",
    fontSize: "1.25rem",
  },
  empty: {
    textAlign: "center",
    padding: "3rem 1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  emptyText: {
    color: "#666",
    marginBottom: "1rem",
  },
  emptyButton: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
  },
};
