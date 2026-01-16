"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./member-profile.module.css";

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
    <div className={styles.actionContainer}>
      {error && <p className={styles.actionError}>{error}</p>}
      <button
        onClick={handleMoveOut}
        disabled={loading}
        className={styles.actionLink}
      >
        {loading ? "Updating..." : "Mark as moved out"}
      </button>
    </div>
  );
}
