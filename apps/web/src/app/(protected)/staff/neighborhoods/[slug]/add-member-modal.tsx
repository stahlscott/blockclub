"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { searchUsers, type UserSearchResult } from "../../users/actions";
import styles from "./detail.module.css";

interface AddMemberModalProps {
  neighborhoodId: string;
  existingMemberIds: string[];
}

export function AddMemberModal({
  neighborhoodId,
  existingMemberIds,
}: AddMemberModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Filter out users who are already members
  const availableUsers = results.filter(
    (user) => !existingMemberIds.includes(user.id)
  );

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    const searchResults = await searchUsers(searchQuery);
    setResults(searchResults);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setQuery("");
      setResults([]);
      setError(null);
      return;
    }

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
  }, [query, performSearch, open]);

  const handleAddMember = async (userId: string) => {
    setAddingUserId(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ neighborhood_id: neighborhoodId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to add member");
        setAddingUserId(null);
        return;
      }

      // Success - close modal and refresh
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to add member");
      setAddingUserId(null);
    }
  };

  const getInitial = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={styles.addMemberButton}
          data-testid="add-member-button"
        >
          + Add Member
        </button>
      </DialogTrigger>
      <DialogContent className={styles.addMemberModal}>
        <DialogHeader>
          <DialogTitle>Add Member to Neighborhood</DialogTitle>
        </DialogHeader>

        <div className={styles.modalSearchContainer}>
          <input
            type="search"
            placeholder="Search users by name or email..."
            aria-label="Search users to add"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.modalSearchInput}
            autoFocus
            data-testid="add-member-search-input"
          />
        </div>

        {error && <div className={styles.modalError}>{error}</div>}

        {isLoading && (
          <div className={styles.modalLoading}>Searching...</div>
        )}

        {!isLoading && query.length > 0 && query.length < 2 && (
          <div className={styles.modalHint}>
            Enter at least 2 characters to search
          </div>
        )}

        {!isLoading && query.length >= 2 && availableUsers.length === 0 && results.length > 0 && (
          <div className={styles.modalHint}>
            All matching users are already members
          </div>
        )}

        {!isLoading && query.length >= 2 && results.length === 0 && (
          <div className={styles.modalHint}>
            No users found matching &quot;{query}&quot;
          </div>
        )}

        {!isLoading && availableUsers.length > 0 && (
          <div className={styles.modalResults}>
            {availableUsers.map((user) => (
              <div
                key={user.id}
                className={styles.modalUserRow}
                data-testid={`add-member-user-${user.id}`}
              >
                <div className={styles.modalUserInfo}>
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || "User"}
                      width={32}
                      height={32}
                      className={styles.modalAvatar}
                    />
                  ) : (
                    <div className={styles.modalAvatarPlaceholder}>
                      {getInitial(user.name)}
                    </div>
                  )}
                  <div className={styles.modalUserDetails}>
                    <span className={styles.modalUserName}>
                      {user.name || "No name"}
                    </span>
                    <span className={styles.modalUserEmail}>{user.email}</span>
                  </div>
                </div>
                <button
                  className={styles.modalAddButton}
                  onClick={() => handleAddMember(user.id)}
                  disabled={addingUserId !== null}
                  data-testid={`add-member-confirm-${user.id}`}
                >
                  {addingUserId === user.id ? "Adding..." : "Add"}
                </button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
