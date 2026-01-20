"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./library.module.css";

interface Category {
  value: string;
  label: string;
}

interface Props {
  categories: Category[];
  currentCategory?: string;
  slug: string;
}

export function CategoryFilter({ categories, currentCategory, slug }: Props) {
  const router = useRouter();

  const buildHref = (categoryValue: string) => {
    if (categoryValue === "all") {
      return `/neighborhoods/${slug}/library`;
    }
    return `/neighborhoods/${slug}/library?category=${categoryValue}`;
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(buildHref(e.target.value));
  };

  return (
    <>
      {/* Desktop: chips */}
      <div className={styles.categoryFilter}>
        {categories.map((cat) => {
          const isActive = currentCategory === cat.value || (!currentCategory && cat.value === "all");
          return (
            <Link
              key={cat.value}
              href={buildHref(cat.value)}
              className={`${styles.categoryChip} ${isActive ? styles.categoryChipActive : ""}`}
              data-testid={`library-category-chip-${cat.value}`}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>

      {/* Mobile: dropdown */}
      <select
        className={styles.categorySelect}
        value={currentCategory || "all"}
        onChange={handleSelectChange}
        data-testid="library-category-select"
      >
        {categories.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>
    </>
  );
}
