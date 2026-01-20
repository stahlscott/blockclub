"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./staff-nav.module.css";

const navItems = [
  { href: "/staff", label: "Overview", exact: true },
  { href: "/staff/neighborhoods", label: "Neighborhoods" },
  { href: "/staff/users", label: "Users" },
];

export function StaffNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.link} ${isActive(item.href, item.exact) ? styles.linkActive : ""}`}
          data-testid={`staff-nav-${item.label.toLowerCase()}-link`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
