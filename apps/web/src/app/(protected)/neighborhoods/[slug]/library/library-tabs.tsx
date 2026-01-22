"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./library.module.css";

interface Props {
  slug: string;
}

export function LibraryTabs({ slug }: Props) {
  const pathname = usePathname();

  const tabs = [
    { href: `/neighborhoods/${slug}/library`, label: "All Items", exact: true },
    { href: `/neighborhoods/${slug}/library/mine`, label: "My Items", exact: false },
    { href: `/neighborhoods/${slug}/library/loans`, label: "My Loans", exact: false },
  ];

  const isActive = (tab: { href: string; exact: boolean }) => {
    if (tab.exact) {
      // For "All Items", only match exact path (not subpaths like /mine or /loans)
      return pathname === tab.href || pathname.match(/^\/neighborhoods\/[^/]+\/library\/?$/) !== null;
    }
    return pathname.startsWith(tab.href);
  };

  return (
    <nav className={styles.tabs} aria-label="Library sections">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`${styles.tab} ${isActive(tab) ? styles.tabActive : ""}`}
          aria-current={isActive(tab) ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
