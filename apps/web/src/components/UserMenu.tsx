"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Settings, Shield, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useNeighborhood } from "./NeighborhoodProvider";
import styles from "./UserMenu.module.css";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const {
    primaryNeighborhood,
    neighborhoods,
    switchNeighborhood,
    isAdmin,
    isStaffAdmin,
    isImpersonating,
    impersonatedUserName,
    impersonatedUserEmail,
    userAvatarUrl,
  } = useNeighborhood();
  const [isOpen, setIsOpen] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // When impersonating, show the impersonated user's info
  const displayName = isImpersonating ? impersonatedUserName : null;
  const displayEmail = isImpersonating ? impersonatedUserEmail : user?.email;
  const displayInitial = displayName?.charAt(0)?.toUpperCase() || displayEmail?.charAt(0)?.toUpperCase() || "?";

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSwitcher(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowSwitcher(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  if (!user) {
    return (
      <Link href="/signin" className={styles.signInLink}>
        Sign in
      </Link>
    );
  }


  const handleLinkClick = () => {
    setIsOpen(false);
    setShowSwitcher(false);
  };

  const handleSwitchNeighborhood = async (neighborhoodId: string) => {
    await switchNeighborhood(neighborhoodId);
    setIsOpen(false);
    setShowSwitcher(false);
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.avatarButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
        data-testid="user-menu-avatar-button"
      >
        <div className={styles.avatar}>
          {userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt="Profile"
              width={32}
              height={32}
              className={styles.avatarImage}
            />
          ) : (
            displayInitial
          )}
        </div>
      </button>

      {isOpen && (
        <div className={styles.dropdown} data-testid="user-menu-dropdown">
          {/* User info header */}
          <div className={styles.userHeader}>
            <div className={styles.avatarLarge}>
              {userAvatarUrl ? (
                <Image
                  src={userAvatarUrl}
                  alt="Profile"
                  width={48}
                  height={48}
                  className={styles.avatarImage}
                />
              ) : (
                displayInitial
              )}
            </div>
            <div className={styles.userInfo}>
              {isImpersonating && displayName && (
                <div className={styles.userName}>{displayName}</div>
              )}
              <div className={isImpersonating ? styles.userEmailSmall : styles.userEmail}>
                {displayEmail}
              </div>
              {primaryNeighborhood && (
                <div className={styles.neighborhoodName}>{primaryNeighborhood.name}</div>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Navigation links */}
          <Link href="/profile" className={styles.menuItem} onClick={handleLinkClick} data-testid="user-menu-profile-link">
            <User className={styles.menuIcon} />
            Edit Profile
          </Link>
          <Link href="/settings" className={styles.menuItem} onClick={handleLinkClick} data-testid="user-menu-settings-link">
            <Settings className={styles.menuIcon} />
            Account Settings
          </Link>

          {/* Admin links */}
          {(isAdmin || isStaffAdmin) && (
            <>
              <div className={styles.divider} />
              {isAdmin && primaryNeighborhood && (
                <Link
                  href={`/neighborhoods/${primaryNeighborhood.slug}/settings`}
                  className={styles.menuItem}
                  onClick={handleLinkClick}
                >
                  Neighborhood Admin
                </Link>
              )}
              {isStaffAdmin && (
                <Link href="/staff" className={styles.menuItem} onClick={handleLinkClick}>
                  <Shield className={styles.menuIcon} />
                  Staff Admin
                </Link>
              )}
            </>
          )}

          {/* Neighborhood switcher - only show if multiple neighborhoods */}
          {neighborhoods.length > 1 && (
            <>
              <div className={styles.divider} />
              <button
                className={styles.menuItem}
                onClick={() => setShowSwitcher(!showSwitcher)}
              >
                <span>Switch Neighborhood</span>
                <span className={`${styles.chevron} ${showSwitcher ? styles.chevronOpen : ""}`}>
                  &#9662;
                </span>
              </button>

              {showSwitcher && (
                <div className={styles.switcherList}>
                  {neighborhoods.map((neighborhood) => (
                    <button
                      key={neighborhood.id}
                      className={`${styles.switcherOption} ${
                        neighborhood.id === primaryNeighborhood?.id ? styles.switcherOptionActive : ""
                      }`}
                      onClick={() => handleSwitchNeighborhood(neighborhood.id)}
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

          <div className={styles.divider} />

          {/* Sign out */}
          <button className={styles.signOutItem} onClick={signOut} data-testid="user-menu-signout-button">
            <LogOut className={styles.menuIcon} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
