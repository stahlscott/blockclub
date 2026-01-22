"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { startImpersonation } from "@/app/actions/impersonation";
import {
  searchUsers,
  getAllUsers,
  type UserSearchResult,
  type PaginatedUsersResult,
} from "./actions";
import styles from "./users.module.css";

const PAGE_SIZE = 20;

export function UserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Load initial user list
  const loadUsers = useCallback(async (page: number) => {
    setIsLoading(true);
    const result: PaginatedUsersResult = await getAllUsers(page, PAGE_SIZE);
    setResults(result.users);
    setCurrentPage(result.page);
    setTotalPages(result.totalPages);
    setTotalCount(result.totalCount);
    setIsLoading(false);
  }, []);

  // Load initial data on mount
  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      // Return to paginated list
      setIsSearchMode(false);
      setHasSearched(false);
      return;
    }

    setIsSearchMode(true);
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

    if (query.length < 2) {
      // Clear search mode and reload paginated list
      if (isSearchMode) {
        setIsSearchMode(false);
        loadUsers(1);
      }
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch, isSearchMode, loadUsers]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadUsers(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadUsers(currentPage + 1);
    }
  };

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
        <h2 className={styles.title}>Users</h2>
        <p className={styles.subtitle}>
          Browse all users or search by name or email
        </p>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="search"
          placeholder="Search by name or email..."
          aria-label="Search users by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
          data-testid="user-search-input"
        />
      </div>

      {isLoading && (
        <div className={styles.loadingState}>Loading...</div>
      )}

      {!isLoading && isSearchMode && hasSearched && results.length === 0 && (
        <div className={styles.emptyState}>
          No users found matching &quot;{query}&quot;
        </div>
      )}

      {!isLoading && !isSearchMode && results.length === 0 && (
        <div className={styles.emptyState}>No users found</div>
      )}

      {!isLoading && results.length > 0 && (
        <>
          <div className={styles.resultsCount}>
            {isSearchMode
              ? `Found ${results.length} user${results.length !== 1 ? "s" : ""}`
              : `Showing ${results.length} of ${totalCount} users`}
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

          {/* Pagination controls - only show when not in search mode */}
          {!isSearchMode && totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationButton}
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                data-testid="pagination-prev"
              >
                ← Previous
              </button>
              <span className={styles.paginationInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className={styles.paginationButton}
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                data-testid="pagination-next"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
