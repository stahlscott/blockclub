"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface PhoneEntry {
  label: string;
  number: string;
}

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  phones: PhoneEntry[] | null;
  address: string | null;
  unit: string | null;
  move_in_year: number | null;
  children: string | null;
  pets: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: User;
}

interface Props {
  slug: string;
  neighborhoodName: string;
  members: Member[];
}

type SortOption =
  | "address-asc"
  | "address-desc"
  | "name-asc"
  | "name-desc"
  | "move-in-newest"
  | "move-in-oldest"
  | "joined-newest"
  | "joined-oldest";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "address-asc", label: "Address (A-Z)" },
  { value: "address-desc", label: "Address (Z-A)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "move-in-newest", label: "Move-in Year (Newest)" },
  { value: "move-in-oldest", label: "Move-in Year (Oldest)" },
  { value: "joined-newest", label: "Joined (Newest)" },
  { value: "joined-oldest", label: "Joined (Oldest)" },
];

const STORAGE_KEY = "directory-sort-preference";

function extractStreetNumber(address: string | null): number {
  if (!address) return Infinity;
  const match = address.match(/^\d+/);
  return match ? parseInt(match[0], 10) : Infinity;
}

function stripThePrefix(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/^the\s+/i, "");
}

function getInitial(name: string | null | undefined): string {
  const stripped = stripThePrefix(name);
  return stripped.charAt(0)?.toUpperCase() || "?";
}

export function DirectoryClient({ slug, neighborhoodName, members }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("address-asc");

  // Load sort preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SORT_OPTIONS.some((opt) => opt.value === saved)) {
      setSortOption(saved as SortOption);
    }
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sortOption);
  }, [sortOption]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Filter by search query
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      const queryDigits = debouncedQuery.replace(/\D/g, "");

      result = result.filter((member) => {
        const user = member.user;

        // Search name
        if (user.name?.toLowerCase().includes(query)) return true;

        // Search address
        if (user.address?.toLowerCase().includes(query)) return true;

        // Search bio
        if (user.bio?.toLowerCase().includes(query)) return true;

        // Search children
        if (user.children?.toLowerCase().includes(query)) return true;

        // Search pets
        if (user.pets?.toLowerCase().includes(query)) return true;

        // Search phone numbers (digits only)
        if (queryDigits.length > 0) {
          const phoneNumbers = user.phones?.map((p) => p.number) || [];
          if (user.phone) phoneNumbers.push(user.phone);
          if (phoneNumbers.some((p) => p.includes(queryDigits))) return true;
        }

        return false;
      });
    }

    // Sort members
    result.sort((a, b) => {
      switch (sortOption) {
        case "address-asc": {
          const numA = extractStreetNumber(a.user.address);
          const numB = extractStreetNumber(b.user.address);
          if (numA !== numB) return numA - numB;
          return (a.user.address || "").localeCompare(b.user.address || "");
        }
        case "address-desc": {
          const numA = extractStreetNumber(a.user.address);
          const numB = extractStreetNumber(b.user.address);
          if (numA !== numB) return numB - numA;
          return (b.user.address || "").localeCompare(a.user.address || "");
        }
        case "name-asc":
          return stripThePrefix(a.user.name).localeCompare(stripThePrefix(b.user.name));
        case "name-desc":
          return stripThePrefix(b.user.name).localeCompare(stripThePrefix(a.user.name));
        case "move-in-newest":
          return (b.user.move_in_year || 0) - (a.user.move_in_year || 0);
        case "move-in-oldest":
          return (a.user.move_in_year || 9999) - (b.user.move_in_year || 9999);
        case "joined-newest":
          return (
            new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
          );
        case "joined-oldest":
          return (
            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
          );
        default:
          return 0;
      }
    });

    return result;
  }, [members, debouncedQuery, sortOption]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <Link href="/dashboard" style={styles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 style={styles.title}>Neighborhood Directory</h1>
          <p style={styles.subtitle}>
            {members.length} members in {neighborhoodName}
          </p>
        </div>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.sortWrapper}>
          <span style={styles.sortLabel}>Sort by:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            style={styles.sortSelect}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredMembers.length > 0 ? (
        <div style={styles.memberGrid}>
          {filteredMembers.map((member) => (
            <Link
              key={member.id}
              href={`/neighborhoods/${slug}/members/${member.user.id}`}
              style={styles.memberCard}
            >
              <div style={styles.avatar}>
                {member.user.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt={member.user.name}
                    style={styles.avatarImg}
                  />
                ) : (
                  <span style={styles.avatarInitial}>
                    {getInitial(member.user.name)}
                  </span>
                )}
              </div>
              <div style={styles.memberInfo}>
                <h3 style={styles.memberName}>
                  {member.user.name}
                  {member.role === "admin" && (
                    <span style={styles.adminBadge}>Admin</span>
                  )}
                </h3>
                {member.user.address && (
                  <p style={styles.memberAddress}>
                    {member.user.address}
                    {member.user.unit && `, ${member.user.unit}`}
                  </p>
                )}
                {member.user.bio && (
                  <p style={styles.memberBio}>
                    {member.user.bio.length > 80
                      ? `${member.user.bio.substring(0, 80)}...`
                      : member.user.bio}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : debouncedQuery ? (
        <div style={styles.emptyState}>
          <p>No results found for &ldquo;{debouncedQuery}&rdquo;</p>
        </div>
      ) : (
        <div style={styles.emptyState}>
          <p>No members yet. Be the first to invite neighbors!</p>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "1.5rem 1rem",
  },
  header: {
    marginBottom: "1rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1rem",
  },
  title: {
    margin: "0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0.25rem 0 0 0",
    color: "#666",
  },
  controls: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 200px",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    outline: "none",
  },
  sortWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  sortLabel: {
    fontSize: "0.875rem",
    color: "#666",
    whiteSpace: "nowrap",
  },
  sortSelect: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    backgroundColor: "white",
    cursor: "pointer",
  },
  memberGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1rem",
  },
  memberCard: {
    display: "flex",
    gap: "1rem",
    padding: "1.25rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
    transition: "box-shadow 0.15s ease",
  },
  avatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarInitial: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#3730a3",
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    margin: "0 0 0.25rem 0",
    fontSize: "1rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
  },
  adminBadge: {
    fontSize: "0.625rem",
    fontWeight: "500",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "0.125rem 0.375rem",
    borderRadius: "4px",
    textTransform: "uppercase",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  memberAddress: {
    margin: "0 0 0.25rem 0",
    fontSize: "0.875rem",
    color: "#666",
  },
  memberBio: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#888",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem",
    color: "#666",
  },
};
