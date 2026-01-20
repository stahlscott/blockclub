"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { getCategoryEmoji } from "@/lib/category-utils";
import responsive from "@/app/responsive.module.css";
import libraryStyles from "./library.module.css";

interface Item {
  id: string;
  name: string;
  description?: string;
  category: string;
  availability: string;
  photo_urls?: string[];
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

interface Props {
  items: Item[];
  slug: string;
  userId: string;
  category?: string;
}

export function LibraryClient({ items, slug, userId, category }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const query = debouncedQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.owner?.name?.toLowerCase().includes(query)
    );
  }, [items, debouncedQuery]);

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
    <>
      <div className={libraryStyles.searchWrapper}>
        <Search className={libraryStyles.searchIcon} />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={libraryStyles.searchInput}
          data-testid="library-search-input"
        />
      </div>

      {filteredItems.length > 0 ? (
        <div className={responsive.gridAuto}>
          {filteredItems.map((item) => (
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
                  height={200}
                  className={libraryStyles.image}
                  borderRadius="var(--radius-lg) var(--radius-lg) 0 0"
                  fallback={
                    <div className={libraryStyles.imagePlaceholder}>
                      <span className={libraryStyles.placeholderIcon}>
                        {getCategoryEmoji(item.category as any)}
                      </span>
                    </div>
                  }
                />
              </div>
              <div className={libraryStyles.cardContent}>
                <h3 className={libraryStyles.itemName}>{item.name}</h3>
                <p className={libraryStyles.itemOwner}>
                  {item.owner_id === userId
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
            {searchQuery || category
              ? "No items match your search."
              : "Nothing here yet, add something your neighbors might need."}
          </p>
          <Link
            href={`/neighborhoods/${slug}/library/new`}
            className={libraryStyles.emptyButton}
          >
            Share an item
          </Link>
        </div>
      )}
    </>
  );
}
