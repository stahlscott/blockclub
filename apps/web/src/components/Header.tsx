"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import styles from "./Header.module.css";

export function Header() {
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Block Club
        </Link>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          {loading ? (
            <span className={styles.loading}>...</span>
          ) : user ? (
            <>
              <Link href="/dashboard" className={styles.navLink}>
                Dashboard
              </Link>
              <Link href="/profile" className={styles.navLink}>
                Profile
              </Link>
              <button onClick={signOut} className={styles.signOutButton}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/signin" className={styles.navLink}>
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className={styles.menuButton}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav className={styles.mobileNav}>
          {loading ? (
            <span className={styles.loading}>...</span>
          ) : user ? (
            <>
              <Link href="/dashboard" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/profile" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                Profile
              </Link>
              <button onClick={() => { signOut(); setMenuOpen(false); }} className={styles.mobileSignOutButton}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/signin" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
