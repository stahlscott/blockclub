"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useNeighborhood } from "./NeighborhoodProvider";
import { UserMenu } from "./UserMenu";
import styles from "./Header.module.css";

export function Header() {
  const { user, loading, signOut } = useAuth();
  const { primaryNeighborhood, neighborhoods, loading: neighborhoodLoading, switchNeighborhood, isAdmin, isStaffAdmin } = useNeighborhood();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMobileSwitcher, setShowMobileSwitcher] = useState(false);

  // Extract slug from URL if on a neighborhood route
  const urlSlugMatch = pathname?.match(/^\/neighborhoods\/([^\/]+)/);
  const urlSlug = urlSlugMatch?.[1];

  // Use URL slug if present, otherwise fall back to primary neighborhood
  const activeSlug = urlSlug || primaryNeighborhood?.slug;

  // Build neighborhood-specific links
  const postsLink = activeSlug ? `/neighborhoods/${activeSlug}/posts` : null;
  const libraryLink = activeSlug ? `/neighborhoods/${activeSlug}/library` : null;
  const directoryLink = activeSlug ? `/neighborhoods/${activeSlug}/directory` : null;

  // Check if a link is active
  const isActive = (path: string | null) => {
    if (!path) return false;
    return pathname.startsWith(path);
  };

  const handleMobileSwitch = async (neighborhoodId: string) => {
    await switchNeighborhood(neighborhoodId);
    setShowMobileSwitcher(false);
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href={user ? "/dashboard" : "/"} className={styles.logo}>
          Block Club
        </Link>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          {loading || neighborhoodLoading ? (
            <span className={styles.loading}>...</span>
          ) : user ? (
            <>
              {/* Neighborhood navigation - show if viewing a neighborhood or user has one */}
              {activeSlug && (
                <div className={styles.neighborhoodNav}>
                  <Link
                    href={postsLink!}
                    className={`${styles.navLink} ${isActive(postsLink) ? styles.navLinkActive : ""}`}
                  >
                    Posts
                  </Link>
                  <Link
                    href={libraryLink!}
                    className={`${styles.navLink} ${isActive(libraryLink) ? styles.navLinkActive : ""}`}
                  >
                    Library
                  </Link>
                  <Link
                    href={directoryLink!}
                    className={`${styles.navLink} ${isActive(directoryLink) ? styles.navLinkActive : ""}`}
                  >
                    Directory
                  </Link>
                </div>
              )}
              <UserMenu />
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
          {loading || neighborhoodLoading ? (
            <span className={styles.loading}>...</span>
          ) : user ? (
            <>
              {/* User info section */}
              <div className={styles.mobileUserSection}>
                <div className={styles.mobileAvatar}>
                  {user.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className={styles.mobileUserInfo}>
                  <div className={styles.mobileUserEmail}>{user.email}</div>
                  {primaryNeighborhood && (
                    <div className={styles.mobileNeighborhoodName}>{primaryNeighborhood.name}</div>
                  )}
                </div>
              </div>

              <div className={styles.mobileDivider} />

              {/* Main navigation */}
              <Link href="/dashboard" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              {activeSlug && (
                <>
                  <Link href={postsLink!} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                    Posts
                  </Link>
                  <Link href={libraryLink!} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                    Library
                  </Link>
                  <Link href={directoryLink!} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                    Directory
                  </Link>
                </>
              )}

              <div className={styles.mobileDivider} />

              {/* Account links */}
              <Link href="/profile" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                Edit Profile
              </Link>
              <Link href="/settings" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                Account Settings
              </Link>

              {/* Admin links */}
              {(isAdmin || isStaffAdmin) && (
                <>
                  <div className={styles.mobileDivider} />
                  {isAdmin && primaryNeighborhood && (
                    <Link
                      href={`/neighborhoods/${primaryNeighborhood.slug}/settings`}
                      className={styles.mobileNavLink}
                      onClick={() => setMenuOpen(false)}
                    >
                      Neighborhood Admin
                    </Link>
                  )}
                  {isStaffAdmin && (
                    <Link href="/admin" className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
                      Staff Admin
                    </Link>
                  )}
                </>
              )}

              {/* Neighborhood switcher - only if multiple */}
              {neighborhoods.length > 1 && (
                <>
                  <div className={styles.mobileDivider} />
                  <button
                    className={styles.mobileSwitcherToggle}
                    onClick={() => setShowMobileSwitcher(!showMobileSwitcher)}
                  >
                    <span>Switch Neighborhood</span>
                    <span className={`${styles.chevron} ${showMobileSwitcher ? styles.chevronOpen : ""}`}>
                      ▼
                    </span>
                  </button>
                  {showMobileSwitcher && (
                    <div className={styles.mobileSwitcherList}>
                      {neighborhoods.map((neighborhood) => (
                        <button
                          key={neighborhood.id}
                          className={`${styles.mobileSwitcherOption} ${
                            neighborhood.id === primaryNeighborhood?.id ? styles.mobileSwitcherOptionActive : ""
                          }`}
                          onClick={() => handleMobileSwitch(neighborhood.id)}
                        >
                          <span>{neighborhood.name}</span>
                          {neighborhood.id === primaryNeighborhood?.id && (
                            <span className={styles.checkmark}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className={styles.mobileDivider} />

              <button onClick={() => { signOut(); setMenuOpen(false); }} className={styles.mobileSignOutButton}>
                Sign Out
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
