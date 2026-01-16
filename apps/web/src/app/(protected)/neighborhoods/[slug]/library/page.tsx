import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { ItemCategory } from "@blockclub/shared";
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

  const getAvailabilityClass = (availability: string) => {
    switch (availability) {
      case "available":
        return libraryStyles.availableTag;
      case "borrowed":
        return libraryStyles.borrowedTag;
      default:
        return libraryStyles.unavailableTag;
    }
  };

  return (
    <div className={libraryStyles.container}>
      <div className={libraryStyles.header}>
        <div>
          <Link href="/dashboard" className={libraryStyles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 className={libraryStyles.title}>Lending Library</h1>
          <p className={libraryStyles.subtitle}>
            {availableCount} available, {borrowedCount} borrowed
          </p>
        </div>
      </div>

      <div className={libraryStyles.filters}>
        <form method="GET" className={libraryStyles.searchForm}>
          <input
            type="text"
            name="search"
            placeholder="Search items..."
            defaultValue={search || ""}
            className={libraryStyles.searchInput}
          />
          {category && <input type="hidden" name="category" value={category} />}
          <button type="submit" className={libraryStyles.searchButton}>
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

      <div className={libraryStyles.actions}>
        <Link
          href={`/neighborhoods/${slug}/library/mine`}
          className={libraryStyles.secondaryLink}
        >
          My Items
        </Link>
        <Link
          href={`/neighborhoods/${slug}/library/loans`}
          className={libraryStyles.secondaryLink}
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
              className={libraryStyles.card}
            >
              {item.photo_urls && item.photo_urls.length > 0 ? (
                <div className={libraryStyles.imageContainer}>
                  <Image
                    src={item.photo_urls[0]}
                    alt={item.name}
                    width={200}
                    height={140}
                    className={libraryStyles.image}
                  />
                </div>
              ) : (
                <div className={libraryStyles.imagePlaceholder}>
                  <span className={libraryStyles.placeholderIcon}>📦</span>
                </div>
              )}
              <div className={libraryStyles.cardContent}>
                <h3 className={libraryStyles.itemName}>{item.name}</h3>
                <p className={libraryStyles.itemOwner}>
                  {item.owner_id === user.id
                    ? "Your item"
                    : `by ${item.owner?.name || "Unknown"}`}
                </p>
                <div className={libraryStyles.cardFooter}>
                  <span className={libraryStyles.categoryTag}>{item.category}</span>
                  <span
                    className={`${libraryStyles.availabilityTag} ${getAvailabilityClass(item.availability)}`}
                  >
                    {item.availability}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={libraryStyles.empty}>
          <p className={libraryStyles.emptyText}>
            {search || category
              ? "No items match your search."
              : "No items in the library yet."}
          </p>
          <Link
            href={`/neighborhoods/${slug}/library/new`}
            className={libraryStyles.emptyButton}
          >
            Add the first item
          </Link>
        </div>
      )}
    </div>
  );
}
