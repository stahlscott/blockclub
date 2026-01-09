import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { ItemCategory } from "@frontporch/shared";
import responsive from "@/app/responsive.module.css";
import libraryStyles from "./library.module.css";
import { CategoryFilter } from "./category-filter";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}

const CATEGORIES: { value: ItemCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "baby", label: "Baby" },
  { value: "books", label: "Books" },
  { value: "electronics", label: "Electronics" },
  { value: "games", label: "Games" },
  { value: "kitchen", label: "Kitchen" },
  { value: "outdoor", label: "Outdoor" },
  { value: "sports", label: "Sports" },
  { value: "tools", label: "Tools" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

export default async function LibraryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { category, search } = await searchParams;
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

  // Check if user is a member
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

  // Fetch items with filters
  let query = supabase
    .from("items")
    .select("*, owner:users(id, name, avatar_url)")
    .eq("neighborhood_id", neighborhood.id)
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  let { data: items } = await query;

  // Filter by search term (name, category, description, or owner name)
  if (search && items) {
    const searchLower = search.toLowerCase();
    items = items.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.owner?.name?.toLowerCase().includes(searchLower),
    );
  }

  // Count items by availability
  const availableCount =
    items?.filter((i) => i.availability === "available").length || 0;
  const borrowedCount =
    items?.filter((i) => i.availability === "borrowed").length || 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <Link href="/dashboard" style={styles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 style={styles.title}>Lending Library</h1>
          <p style={styles.subtitle}>
            {availableCount} available, {borrowedCount} borrowed
          </p>
        </div>
      </div>

      <div style={styles.filters}>
        <form method="GET" style={styles.searchForm}>
          <input
            type="text"
            name="search"
            placeholder="Search items..."
            defaultValue={search || ""}
            style={styles.searchInput}
          />
          {category && <input type="hidden" name="category" value={category} />}
          <button type="submit" style={styles.searchButton}>
            Search
          </button>
        </form>

        <CategoryFilter
          categories={CATEGORIES}
          currentCategory={category}
          search={search}
          slug={slug}
        />
      </div>

      <div style={styles.actions}>
        <Link
          href={`/neighborhoods/${slug}/library/mine`}
          style={styles.secondaryLink}
        >
          My Items
        </Link>
        <Link
          href={`/neighborhoods/${slug}/library/loans`}
          style={styles.secondaryLink}
        >
          My Loans
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div className={responsive.gridAuto}>
          {items.map((item: any) => (
            <Link
              key={item.id}
              href={`/neighborhoods/${slug}/library/${item.id}`}
              style={styles.card}
            >
              {item.photo_urls && item.photo_urls.length > 0 ? (
                <div style={styles.imageContainer}>
                  <Image
                    src={item.photo_urls[0]}
                    alt={item.name}
                    width={200}
                    height={140}
                    style={styles.image}
                  />
                </div>
              ) : (
                <div style={styles.imagePlaceholder}>
                  <span style={styles.placeholderIcon}>📦</span>
                </div>
              )}
              <div style={styles.cardContent}>
                <h3 style={styles.itemName}>{item.name}</h3>
                <p style={styles.itemOwner}>
                  {item.owner_id === user.id
                    ? "Your item"
                    : `by ${item.owner?.name || "Unknown"}`}
                </p>
                <div style={styles.cardFooter}>
                  <span style={styles.categoryTag}>{item.category}</span>
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
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            {search || category
              ? "No items match your search."
              : "No items in the library yet."}
          </p>
          <Link
            href={`/neighborhoods/${slug}/library/new`}
            style={styles.emptyButton}
          >
            Add the first item
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
  filters: {
    marginBottom: "1.5rem",
  },
  searchForm: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  searchInput: {
    flex: 1,
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "0.875rem",
  },
  searchButton: {
    padding: "0.75rem 1.25rem",
    backgroundColor: "#f0f0f0",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  categoryFilter: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  categoryChip: {
    padding: "0.5rem 0.75rem",
    backgroundColor: "#f5f5f5",
    borderRadius: "20px",
    textDecoration: "none",
    color: "#666",
    fontSize: "0.75rem",
    textTransform: "capitalize",
  },
  categoryChipActive: {
    backgroundColor: "#2563eb",
    color: "white",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  secondaryLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "0.875rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
    overflow: "hidden",
    transition: "box-shadow 0.2s",
  },
  imageContainer: {
    width: "100%",
    height: "140px",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "140px",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: "2rem",
  },
  cardContent: {
    padding: "1rem",
  },
  itemName: {
    margin: "0 0 0.25rem 0",
    fontSize: "1rem",
    fontWeight: "500",
  },
  itemOwner: {
    margin: "0 0 0.75rem 0",
    fontSize: "0.875rem",
    color: "#666",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryTag: {
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    textTransform: "capitalize",
  },
  availabilityTag: {
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
