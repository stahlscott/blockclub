import type { ItemCategory } from "@blockclub/shared";

interface CategoryConfig {
  emoji: string;
  color: string;
  colorLight: string;
}

const CATEGORY_CONFIG: Record<ItemCategory, CategoryConfig> = {
  tools: {
    emoji: "🔧",
    color: "var(--color-park)",
    colorLight: "var(--color-park-light)",
  },
  kitchen: {
    emoji: "🍳",
    color: "var(--color-brick)",
    colorLight: "var(--color-brick-light)",
  },
  outdoor: {
    emoji: "🏕️",
    color: "var(--color-lake)",
    colorLight: "var(--color-lake-light)",
  },
  sports: {
    emoji: "⚽",
    color: "var(--color-park)",
    colorLight: "var(--color-park-light)",
  },
  games: {
    emoji: "🎲",
    color: "var(--color-accent)",
    colorLight: "var(--color-warning-light)",
  },
  electronics: {
    emoji: "📱",
    color: "#6366f1",
    colorLight: "#eef2ff",
  },
  books: {
    emoji: "📚",
    color: "var(--color-primary)",
    colorLight: "var(--color-primary-light)",
  },
  baby: {
    emoji: "🍼",
    color: "#ec4899",
    colorLight: "#fdf2f8",
  },
  travel: {
    emoji: "✈️",
    color: "var(--color-lake)",
    colorLight: "var(--color-lake-light)",
  },
  other: {
    emoji: "📦",
    color: "var(--color-text-muted)",
    colorLight: "var(--color-background)",
  },
};

export function getCategoryEmoji(category: ItemCategory): string {
  return CATEGORY_CONFIG[category]?.emoji ?? "📦";
}

export function getCategoryColor(category: ItemCategory): string {
  return CATEGORY_CONFIG[category]?.color ?? "var(--color-text-muted)";
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
