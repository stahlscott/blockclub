"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./directory.module.css";

interface PhoneEntry {
  label: string;
  number: string;
}

interface EmailEntry {
  label: string;
  email: string;
}

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  phones: PhoneEntry[] | null;
  emails: EmailEntry[] | null;
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

function extractStreetName(address: string | null): string {
  if (!address) return "";
  // Remove leading number and whitespace to get street name
  return address.replace(/^\d+\s*/, "").trim().toLowerCase();
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

        // Search email addresses
        if (user.emails?.some((e) => e.email.toLowerCase().includes(query)))
          return true;

        return false;
      });
    }

    // Sort members
    result.sort((a, b) => {
      switch (sortOption) {
        case "address-asc": {
          // Sort by street name first, then by street number
          const streetA = extractStreetName(a.user.address);
          const streetB = extractStreetName(b.user.address);
          const streetCompare = streetA.localeCompare(streetB);
          if (streetCompare !== 0) return streetCompare;
          return extractStreetNumber(a.user.address) - extractStreetNumber(b.user.address);
        }
        case "address-desc": {
          // Sort by street name first (descending), then by street number (descending)
          const streetA = extractStreetName(a.user.address);
          const streetB = extractStreetName(b.user.address);
          const streetCompare = streetB.localeCompare(streetA);
          if (streetCompare !== 0) return streetCompare;
          return extractStreetNumber(b.user.address) - extractStreetNumber(a.user.address);
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
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link href="/dashboard" className={styles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 className={styles.title}>Neighborhood Directory</h1>
          <p className={styles.subtitle}>
            {members.length} households in {neighborhoodName}
          </p>
        </div>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.sortWrapper}>
          <span className={styles.sortLabel}>Sort by:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className={styles.sortSelect}
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
        <div className={styles.memberGrid}>
          {filteredMembers.map((member) => (
            <Link
              key={member.id}
              href={`/neighborhoods/${slug}/members/${member.user.id}`}
              className={styles.memberCard}
            >
              <div className={styles.avatar}>
                {member.user.avatar_url ? (
                  <Image
                    src={member.user.avatar_url}
                    alt={member.user.name}
                    width={56}
                    height={56}
                    className={styles.avatarImg}
                  />
                ) : (
                  <span className={styles.avatarInitial}>
                    {getInitial(member.user.name)}
                  </span>
                )}
              </div>
              <div className={styles.memberInfo}>
                <h3 className={styles.memberName}>
                  {member.user.name}
                  {member.role === "admin" && (
                    <span className={styles.adminBadge}>Admin</span>
                  )}
                </h3>
                {member.user.address && (
                  <p className={styles.memberAddress}>
                    {member.user.address}
                    {member.user.unit && `, ${member.user.unit}`}
                  </p>
                )}
                {member.user.bio && (
                  <p className={styles.memberBio}>
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
        <div className={styles.emptyState}>
          <p>No results found for &ldquo;{debouncedQuery}&rdquo;</p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No members yet. Be the first to invite neighbors!</p>
        </div>
      )}
    </div>
  );
}
