import type { ItemCategory } from "@blockclub/shared";

interface CategoryConfig {
  emoji: string;
  colorLight: string;
}

const CATEGORY_CONFIG: Record<ItemCategory, CategoryConfig> = {
  tools: {
    emoji: "🔧",
    colorLight: "var(--color-park-light)",
  },
  kitchen: {
    emoji: "🍳",
    colorLight: "var(--color-brick-light)",
  },
  outdoor: {
    emoji: "🏕️",
    colorLight: "var(--color-lake-light)",
  },
  sports: {
    emoji: "⚽",
    colorLight: "var(--color-park-light)",
  },
  games: {
    emoji: "🎲",
    colorLight: "var(--color-warning-light)",
  },
  electronics: {
    emoji: "📱",
    colorLight: "#eef2ff",
  },
  books: {
    emoji: "📚",
    colorLight: "var(--color-primary-light)",
  },
  baby: {
    emoji: "🍼",
    colorLight: "#fdf2f8",
  },
  travel: {
    emoji: "✈️",
    colorLight: "var(--color-lake-light)",
  },
  other: {
    emoji: "📦",
    colorLight: "var(--color-background)",
  },
};

export function getCategoryEmoji(category: ItemCategory): string {
  return CATEGORY_CONFIG[category]?.emoji ?? "📦";
}

export function getCategoryColorLight(category: ItemCategory): string {
  return CATEGORY_CONFIG[category]?.colorLight ?? "var(--color-background)";
}

/**
 * Category option for dropdowns and filters
 */
export interface CategoryOption {
  value: ItemCategory;
  label: string;
}

/**
 * Category option that includes "all" for filters
 */
export interface FilterCategoryOption {
  value: ItemCategory | "all";
  label: string;
}

/**
 * Alphabetized list of item categories for dropdowns (forms).
 * "Other" is placed last as a catch-all.
 */
export const ITEM_CATEGORIES: CategoryOption[] = [
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

/**
 * Alphabetized list of categories for filters, with "All" at the start.
 * "Other" is placed last as a catch-all.
 */
export const FILTER_CATEGORIES: FilterCategoryOption[] = [
  { value: "all", label: "All" },
  ...ITEM_CATEGORIES,
];
