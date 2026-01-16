"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MoveOutActionsProps {
  membershipId: string;
  slug: string;
  canMarkMovedOut: boolean;
  memberName: string;
}

export function MoveOutActions({
  membershipId,
  slug,
  canMarkMovedOut,
  memberName,
}: MoveOutActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMoveOut = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to mark ${memberName} as moved out? Their lending library items will be removed.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/memberships/${membershipId}/move-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update membership");
      }

      // Redirect to directory after marking someone as moved out
      router.push(`/neighborhoods/${slug}/directory`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (!canMarkMovedOut) {
    return null;
  }

  return (
    <div style={styles.container}>
      {error && <p style={styles.error}>{error}</p>}
      <button
        onClick={handleMoveOut}
        disabled={loading}
        style={styles.actionLink}
      >
        {loading ? "Updating..." : "Mark as moved out"}
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "inline-block",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.75rem",
    margin: "0 0 0.25rem 0",
  },
  actionLink: {
    padding: "0",
    backgroundColor: "transparent",
    color: "#666",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    textDecoration: "underline",
  },
};
