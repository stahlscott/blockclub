"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startImpersonation } from "@/app/actions/impersonation";
import {
  approveMembership,
  declineMembership,
  removeMembership,
} from "./actions";
import styles from "./detail.module.css";

interface Member {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  membership_id: string;
  role: string;
  status: string;
  joined_at: string;
}

interface MemberListProps {
  members: Member[];
  neighborhoodSlug: string;
}

type FilterStatus = "all" | "active" | "pending";

export function MemberList({ members, neighborhoodSlug }: MemberListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filteredMembers = members.filter((m) => {
    // Filter by status
    if (filter === "active" && m.status !== "active") return false;
    if (filter === "pending" && m.status !== "pending") return false;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !m.name?.toLowerCase().includes(searchLower) &&
        !m.email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    return true;
  });

  const pendingCount = members.filter((m) => m.status === "pending").length;
  const activeCount = members.filter((m) => m.status === "active").length;

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

  const handleApprove = async (membershipId: string) => {
    setLoadingAction(`approve-${membershipId}`);
    const result = await approveMembership(membershipId, neighborhoodSlug);
    if (!result.success) {
      alert(result.error || "Failed to approve");
    }
    setLoadingAction(null);
  };

  const handleDecline = async (membershipId: string) => {
    setLoadingAction(`decline-${membershipId}`);
    const result = await declineMembership(membershipId, neighborhoodSlug);
    if (!result.success) {
      alert(result.error || "Failed to decline");
    }
    setLoadingAction(null);
  };

  const handleRemove = async (membershipId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this neighborhood?`)) return;
    setLoadingAction(`remove-${membershipId}`);
    const result = await removeMembership(membershipId, neighborhoodSlug);
    if (!result.success) {
      alert(result.error || "Failed to remove");
    }
    setLoadingAction(null);
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Members</h3>
        <input
          type="search"
          placeholder="Search members..."
          aria-label="Search members by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          data-testid="member-search-input"
        />
      </div>

      <div className={styles.filterTabs} role="tablist" aria-label="Filter members by status">
        <button
          className={`${styles.filterTab} ${filter === "all" ? styles.filterTabActive : ""}`}
          onClick={() => setFilter("all")}
          role="tab"
          aria-selected={filter === "all"}
          data-testid="filter-tab-all"
        >
          All ({members.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === "active" ? styles.filterTabActive : ""}`}
          onClick={() => setFilter("active")}
          role="tab"
          aria-selected={filter === "active"}
          data-testid="filter-tab-active"
        >
          Active ({activeCount})
        </button>
        <button
          className={`${styles.filterTab} ${filter === "pending" ? styles.filterTabActive : ""}`}
          onClick={() => setFilter("pending")}
          role="tab"
          aria-selected={filter === "pending"}
          data-testid="filter-tab-pending"
        >
          Pending ({pendingCount})
        </button>
      </div>

      <div className={styles.memberList}>
        {filteredMembers.map((member) => (
          <div
            key={member.membership_id}
            className={styles.memberCard}
            data-testid={`member-card-${member.membership_id}`}
          >
            <div className={styles.memberInfo}>
              {member.avatar_url ? (
                <Image
                  src={member.avatar_url}
                  alt={member.name || "User"}
                  width={40}
                  height={40}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {getInitial(member.name)}
                </div>
              )}
              <div className={styles.memberDetails}>
                <span className={styles.memberName}>
                  {member.name || "No name"}
                  {member.role === "admin" && (
                    <span className={styles.adminBadge}>Admin</span>
                  )}
                  {member.status === "pending" && (
                    <span className={styles.pendingBadge}>Pending</span>
                  )}
                </span>
                <span className={styles.memberEmail}>{member.email}</span>
                <span className={styles.memberMeta}>
                  {member.status === "pending" ? "Requested" : "Joined"}{" "}
                  {new Date(member.joined_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className={styles.memberActions}>
              {member.status === "pending" ? (
                <>
                  <button
                    className={`${styles.actionButton} ${styles.declineButton}`}
                    onClick={() => handleDecline(member.membership_id)}
                    disabled={loadingAction !== null}
                    data-testid={`decline-button-${member.membership_id}`}
                  >
                    {loadingAction === `decline-${member.membership_id}`
                      ? "..."
                      : "Decline"}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.approveButton}`}
                    onClick={() => handleApprove(member.membership_id)}
                    disabled={loadingAction !== null}
                    data-testid={`approve-button-${member.membership_id}`}
                  >
                    {loadingAction === `approve-${member.membership_id}`
                      ? "..."
                      : "Approve"}
                  </button>
                </>
              ) : (
                <>
                  {member.role !== "admin" && (
                    <button
                      className={`${styles.actionButton} ${styles.removeButton}`}
                      onClick={() =>
                        handleRemove(
                          member.membership_id,
                          member.name || member.email
                        )
                      }
                      disabled={loadingAction !== null}
                      data-testid={`remove-button-${member.membership_id}`}
                    >
                      {loadingAction === `remove-${member.membership_id}`
                        ? "..."
                        : "Remove"}
                    </button>
                  )}
                  <button
                    className={styles.actionButton}
                    onClick={() => handleImpersonate(member.id)}
                    disabled={loadingAction !== null}
                    data-testid={`impersonate-button-${member.id}`}
                  >
                    {loadingAction === `impersonate-${member.id}`
                      ? "..."
                      : "Act as User"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className={styles.emptyState}>
            {search ? "No members match your search" : "No members yet"}
          </div>
        )}
      </div>
    </div>
  );
}
