"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { startImpersonation } from "@/app/actions/impersonation";
import { searchUsers, type UserSearchResult } from "./actions";
import styles from "./users.module.css";

export function UserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    const searchResults = await searchUsers(searchQuery);
    setResults(searchResults);
    setHasSearched(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const getInitial = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const handleImpersonate = async (userId: string) => {
    setLoadingAction(`impersonate-${userId}`);
    const result = await startImpersonation(userId, "/dashboard");
    if (result.success && result.redirectTo) {
      router.push(result.redirectTo);
    } else {
      alert(result.error || "Failed to impersonate user");
      setLoadingAction(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Find User</h2>
        <p className={styles.subtitle}>
          Search for users across all neighborhoods by name or email
        </p>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="search"
          placeholder="Enter a name or email to search..."
          aria-label="Search users by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
          data-testid="user-search-input"
        />
      </div>

      {isLoading && (
        <div className={styles.loadingState}>Searching...</div>
      )}

      {!isLoading && !hasSearched && query.length < 2 && (
        <div className={styles.emptyState}>
          Enter at least 2 characters to search for users
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div className={styles.emptyState}>
          No users found matching &quot;{query}&quot;
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <div className={styles.resultsCount}>
            Found {results.length} user{results.length !== 1 ? "s" : ""}
          </div>
          <div className={styles.resultsList} data-testid="user-search-results">
            {results.map((user) => (
              <div
                key={user.id}
                className={styles.userCard}
                data-testid={`user-card-${user.id}`}
              >
                <div className={styles.userInfo}>
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || "User"}
                      width={48}
                      height={48}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {getInitial(user.name)}
                    </div>
                  )}
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>
                      {user.name || "No name"}
                    </span>
                    <span className={styles.userEmail}>{user.email}</span>

                    {user.memberships.length > 0 ? (
                      <div className={styles.neighborhoodsList}>
                        {user.memberships.map((membership) => (
                          <div
                            key={membership.membership_id}
                            className={styles.neighborhoodRow}
                          >
                            <span className={styles.neighborhoodName}>
                              {membership.neighborhood_name}
                            </span>
                            {membership.role === "admin" && (
                              <span className={styles.roleBadge}>Admin</span>
                            )}
                            {membership.status === "pending" && (
                              <span className={styles.statusBadge}>Pending</span>
                            )}
                            <Link
                              href={`/staff/neighborhoods/${membership.neighborhood_slug}`}
                              className={styles.viewLink}
                              data-testid={`view-in-neighborhood-${membership.membership_id}`}
                            >
                              View
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.noNeighborhoods}>
                        No neighborhood memberships
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.userActions}>
                  <button
                    className={styles.impersonateButton}
                    onClick={() => handleImpersonate(user.id)}
                    disabled={loadingAction !== null}
                    aria-label={`Impersonate ${user.name || user.email}`}
                    data-testid={`staff-impersonate-button-${user.id}`}
                  >
                    {loadingAction === `impersonate-${user.id}`
                      ? "..."
                      : "Act as User"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
