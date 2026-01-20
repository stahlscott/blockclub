import { describe, it, expect } from "vitest";
import {
  getCategoryEmoji,
  getCategoryColorLight,
  ITEM_CATEGORIES,
  FILTER_CATEGORIES,
} from "../category-utils";
import type { ItemCategory } from "@blockclub/shared";

describe("getCategoryEmoji", () => {
  it("returns correct emoji for each category", () => {
    expect(getCategoryEmoji("tools")).toBe("🔧");
    expect(getCategoryEmoji("kitchen")).toBe("🍳");
    expect(getCategoryEmoji("outdoor")).toBe("🏕️");
    expect(getCategoryEmoji("sports")).toBe("⚽");
    expect(getCategoryEmoji("games")).toBe("🎲");
    expect(getCategoryEmoji("electronics")).toBe("📱");
    expect(getCategoryEmoji("books")).toBe("📚");
    expect(getCategoryEmoji("baby")).toBe("🍼");
    expect(getCategoryEmoji("travel")).toBe("✈️");
    expect(getCategoryEmoji("other")).toBe("📦");
  });

  it("returns fallback emoji for unknown category", () => {
    expect(getCategoryEmoji("unknown" as ItemCategory)).toBe("📦");
  });
});

describe("getCategoryColorLight", () => {
  it("returns correct light color for each category", () => {
    expect(getCategoryColorLight("tools")).toBe("var(--color-park-light)");
    expect(getCategoryColorLight("kitchen")).toBe("var(--color-brick-light)");
    expect(getCategoryColorLight("outdoor")).toBe("var(--color-lake-light)");
    expect(getCategoryColorLight("sports")).toBe("var(--color-park-light)");
    expect(getCategoryColorLight("games")).toBe("var(--color-warning-light)");
    expect(getCategoryColorLight("electronics")).toBe("#eef2ff");
    expect(getCategoryColorLight("books")).toBe("var(--color-primary-light)");
    expect(getCategoryColorLight("baby")).toBe("#fdf2f8");
    expect(getCategoryColorLight("travel")).toBe("var(--color-lake-light)");
    expect(getCategoryColorLight("other")).toBe("var(--color-background)");
  });

  it("returns fallback light color for unknown category", () => {
    expect(getCategoryColorLight("unknown" as ItemCategory)).toBe("var(--color-background)");
  });
});

describe("ITEM_CATEGORIES", () => {
  it("contains all 10 categories", () => {
    expect(ITEM_CATEGORIES).toHaveLength(10);
  });

  it("has 'other' as the last category", () => {
    expect(ITEM_CATEGORIES[ITEM_CATEGORIES.length - 1].value).toBe("other");
  });

  it("is alphabetically sorted (except 'other' which is last)", () => {
    const categoriesWithoutOther = ITEM_CATEGORIES.slice(0, -1);
    const labels = categoriesWithoutOther.map((c) => c.label);
    const sortedLabels = [...labels].sort();
    expect(labels).toEqual(sortedLabels);
  });

  it("has correct label format for each category", () => {
    for (const category of ITEM_CATEGORIES) {
      expect(category.label).toBeTruthy();
      expect(category.value).toBeTruthy();
      // Labels should be capitalized
      expect(category.label[0]).toBe(category.label[0].toUpperCase());
    }
  });
});

describe("FILTER_CATEGORIES", () => {
  it("starts with 'All' option", () => {
    expect(FILTER_CATEGORIES[0]).toEqual({ value: "all", label: "All" });
  });

  it("contains all item categories plus 'All'", () => {
    expect(FILTER_CATEGORIES).toHaveLength(ITEM_CATEGORIES.length + 1);
  });

  it("includes all ITEM_CATEGORIES after 'All'", () => {
    const filterWithoutAll = FILTER_CATEGORIES.slice(1);
    expect(filterWithoutAll).toEqual(ITEM_CATEGORIES);
  });
});
