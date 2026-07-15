"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moderateMembership } from "./actions";
import styles from "./pending.module.css";

interface Props {
  membershipId: string;
  neighborhoodSlug: string;
}

export function MembershipActions({ membershipId, neighborhoodSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(decision: "approve" | "decline") {
    setLoading(true);
    setError(null);
    const result = await moderateMembership({ membershipId, neighborhoodSlug, decision });
    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className={styles.actions}>
      {error && <p className={styles.error}>{error}</p>}
      <button
        onClick={() => handleAction("decline")}
        disabled={loading}
        className={styles.rejectButton}
        data-testid={`pending-member-decline-${membershipId}`}
      >
        Decline
      </button>
      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        className={styles.approveButton}
        data-testid={`pending-member-approve-${membershipId}`}
      >
        Approve
      </button>
    </div>
  );
}
