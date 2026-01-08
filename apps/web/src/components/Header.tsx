"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function Header() {
  const { user, loading, signOut } = useAuth();

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link href="/" style={styles.logo}>
          Front Porch
        </Link>

        <nav style={styles.nav}>
          {loading ? (
            <span style={styles.loading}>...</span>
          ) : user ? (
            <>
              <Link href="/dashboard" style={styles.navLink}>
                Dashboard
              </Link>
              <Link href="/profile" style={styles.navLink}>
                Profile
              </Link>
              <button onClick={signOut} style={styles.signOutButton}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" style={styles.navLink}>
                Sign in
              </Link>
              <Link href="/signup" style={styles.signUpButton}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    backgroundColor: "white",
    borderBottom: "1px solid #e5e5e5",
    padding: "0.75rem 1rem",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#111",
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  navLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
  },
  signUpButton: {
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "0.875rem",
  },
  signOutButton: {
    backgroundColor: "transparent",
    color: "#666",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
  loading: {
    color: "#999",
  },
};
