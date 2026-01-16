"use client";

import { useState } from "react";
import styles from "./member-profile.module.css";

interface RoleActionsProps {
  membershipId: string;
  currentRole: "admin" | "member";
  canPromote: boolean;
  canDemote: boolean;
  memberName: string;
}

export function RoleActions({
  membershipId,
  currentRole,
  canPromote,
  canDemote,
  memberName,
}: RoleActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (newRole: "admin" | "member") => {
    const action = newRole === "admin" ? "promote" : "demote";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${memberName} to ${newRole}?`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/memberships/${membershipId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      // Refresh the page to show updated role
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (!canPromote && !canDemote) {
    return null;
  }

  return (
    <div className={styles.actionContainer}>
      {error && <p className={styles.actionError}>{error}</p>}

      {currentRole === "member" && canPromote && (
        <button
          onClick={() => handleRoleChange("admin")}
          disabled={loading}
          className={styles.actionLink}
        >
          {loading ? "Updating..." : "Promote to admin"}
        </button>
      )}

      {currentRole === "admin" && canDemote && (
        <button
          onClick={() => handleRoleChange("member")}
          disabled={loading}
          className={styles.actionLink}
        >
          {loading ? "Updating..." : "Demote to member"}
        </button>
      )}
    </div>
  );
}
