import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import { getItemsByNeighborhood } from "@/lib/queries";
import {
  FILTER_CATEGORIES,
  type FilterCategoryOption,
} from "@/lib/category-utils";
import libraryStyles from "./library.module.css";
import { CategoryFilter } from "./category-filter";
import { LibraryTabs } from "./library-tabs";
import { LibraryClient } from "./library-client";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
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
  const { category } = await searchParams;
  const { user, neighborhood, supabase } = await getNeighborhoodAccess(slug);

  // Fetch visible items and active member count in parallel.
  const [{ data: allItems }, { count: memberCount }] = await Promise.all([
    getItemsByNeighborhood(supabase, neighborhood.id, {
      includeUnavailable: true,
    }),
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "active")
      .is("deleted_at", null),
  ]);

  // Compute which categories have items
  const availableCategories = getCategoriesWithItems(allItems || [], FILTER_CATEGORIES);

  // Apply category filter in memory
  let items = allItems || [];
  if (category && category !== "all") {
    items = items.filter((item: any) => item.category === category);
  }

  return (
    <div className={libraryStyles.container}>
      <div className={libraryStyles.topRow}>
        <Link href="/dashboard" className={libraryStyles.backButton}>
          <ArrowLeft className={libraryStyles.backButtonIcon} />
          Dashboard
        </Link>
        <Link
          href={`/neighborhoods/${slug}/library/new`}
          className={libraryStyles.addButton}
          data-testid="library-add-item-button"
        >
          + Add Item
        </Link>
      </div>

      <div className={libraryStyles.header}>
        <h1 className={libraryStyles.title}>Lending Library</h1>
      </div>

      <LibraryTabs slug={slug} />

      <div className={libraryStyles.filters}>
        {availableCategories.length > 2 && (
          <CategoryFilter
            categories={availableCategories}
            currentCategory={category}
            slug={slug}
          />
        )}
      </div>

      <LibraryClient
        items={items}
        slug={slug}
        userId={user.id}
        category={category}
        memberCount={memberCount || 0}
        totalItemCount={allItems?.length || 0}
      />
    </div>
  );
}
