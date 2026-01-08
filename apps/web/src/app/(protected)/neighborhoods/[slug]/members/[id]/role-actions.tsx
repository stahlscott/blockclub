"use client";

import { useState } from "react";

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
    <div style={styles.container}>
      {error && <p style={styles.error}>{error}</p>}

      {currentRole === "member" && canPromote && (
        <button
          onClick={() => handleRoleChange("admin")}
          disabled={loading}
          style={styles.promoteButton}
        >
          {loading ? "Updating..." : "Promote to Admin"}
        </button>
      )}

      {currentRole === "admin" && canDemote && (
        <button
          onClick={() => handleRoleChange("member")}
          disabled={loading}
          style={styles.demoteButton}
        >
          {loading ? "Updating..." : "Demote to Member"}
        </button>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginTop: "1rem",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    margin: 0,
  },
  promoteButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  demoteButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
};
