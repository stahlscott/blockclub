import Link from "next/link";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  getCategoryEmoji,
  getCategoryColorLight,
  FILTER_CATEGORIES,
  type FilterCategoryOption,
} from "@/lib/category-utils";
import responsive from "@/app/responsive.module.css";
import libraryStyles from "./library.module.css";
import { CategoryFilter } from "./category-filter";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}

function getCategoriesWithItems(
  items: Array<{ category: string }>,
  allCategories: FilterCategoryOption[]
) {
  const categoriesWithItems = new Set(items.map((item) => item.category));
  return allCategories.filter(
    (cat) => cat.value === "all" || categoriesWithItems.has(cat.value)
  );
}

export default async function LibraryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { category, search } = await searchParams;
  const { user, neighborhood, supabase } = await getNeighborhoodAccess(slug);

  // Fetch all items (no category filter) to determine available categories
  // Note: Use !items_owner_id_fkey to specify which FK to use (there are multiple user references)
  const { data: allItems } = await supabase
    .from("items")
    .select("*, owner:users!items_owner_id_fkey(id, name, avatar_url)")
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Compute which categories have items
  const availableCategories = getCategoriesWithItems(allItems || [], FILTER_CATEGORIES);

  // Apply category filter in memory
  let items = allItems;
  if (category && category !== "all" && items) {
    items = items.filter((item: any) => item.category === category);
  }

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

  const getCategoryClass = (category: string) => {
    const categoryMap: Record<string, string> = {
      tools: libraryStyles.cardTools,
      kitchen: libraryStyles.cardKitchen,
      outdoor: libraryStyles.cardOutdoor,
      baby: libraryStyles.cardBaby,
      books: libraryStyles.cardBooks,
      electronics: libraryStyles.cardElectronics,
      games: libraryStyles.cardGames,
      sports: libraryStyles.cardSports,
      travel: libraryStyles.cardTravel,
      other: libraryStyles.cardOther,
    };
    return categoryMap[category] || "";
  };

  return (
    <div className={libraryStyles.container}>
      <Link href="/dashboard" className={libraryStyles.backLink}>
        &larr; Dashboard
      </Link>
      <div className={libraryStyles.headerRow}>
        <div>
          <h1 className={libraryStyles.title}>Lending Library</h1>
          <p className={libraryStyles.subtitle}>
            {availableCount} available, {borrowedCount} borrowed
          </p>
        </div>
        <Link
          href={`/neighborhoods/${slug}/library/new`}
          className={libraryStyles.addButton}
          data-testid="library-add-item-button"
        >
          + Add Item
        </Link>
      </div>

      <div className={libraryStyles.filters}>
        <form method="GET" className={libraryStyles.searchForm} data-testid="library-search-form">
          <input
            type="text"
            name="search"
            placeholder="Search items..."
            defaultValue={search || ""}
            className={libraryStyles.searchInput}
            data-testid="library-search-input"
          />
          {category && <input type="hidden" name="category" value={category} />}
          <button type="submit" className={libraryStyles.searchButton} data-testid="library-search-button">
            Search
          </button>
        </form>

        {availableCategories.length > 2 && (
          <CategoryFilter
            categories={availableCategories}
            currentCategory={category}
            search={search}
            slug={slug}
          />
        )}
      </div>

      <div className={libraryStyles.actions}>
        <Link
          href={`/neighborhoods/${slug}/library/mine`}
          className={libraryStyles.secondaryLink}
          data-testid="library-my-items-link"
        >
          My Items
        </Link>
        <Link
          href={`/neighborhoods/${slug}/library/loans`}
          className={libraryStyles.secondaryLink}
          data-testid="library-my-loans-link"
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
              className={`${libraryStyles.card} ${getCategoryClass(item.category)}`}
              data-testid={`library-item-card-${item.id}`}
            >
              <div className={libraryStyles.imageContainer}>
                <OptimizedImage
                  src={item.photo_urls?.[0]}
                  alt={item.name}
                  width={200}
                  height={140}
                  className={libraryStyles.image}
                  borderRadius="var(--radius-lg) var(--radius-lg) 0 0"
                  fallback={
                    <div
                      className={libraryStyles.imagePlaceholder}
                      style={{
                        background: `linear-gradient(180deg, ${getCategoryColorLight(item.category)} 0%, var(--color-surface) 100%)`,
                      }}
                    >
                      <div className={libraryStyles.placeholderCircle}>
                        <span className={libraryStyles.placeholderIcon}>
                          {getCategoryEmoji(item.category)}
                        </span>
                      </div>
                    </div>
                  }
                />
              </div>
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
          <div className={libraryStyles.emptyIllustration}>📚</div>
          <p className={libraryStyles.emptyText}>
            {search || category
              ? "No items match your search."
              : "Your neighbors haven't shared any items yet. Be the first!"}
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
