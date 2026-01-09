"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface Props {
  membershipId: string;
  slug: string;
  className?: string;
}

export function MembershipActions({ membershipId, slug, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "approve" | "reject") {
    setLoading(true);

    try {
      const supabase = createClient();

      if (action === "approve") {
        const { error } = await supabase
          .from("memberships")
          .update({ status: "active" })
          .eq("id", membershipId);

        if (error) {
          logger.error("Error approving", error, { membershipId });
          alert("Failed to approve membership");
          return;
        }
      } else {
        // Soft delete: set deleted_at instead of actually deleting
        const { error } = await supabase
          .from("memberships")
          .update({ deleted_at: new Date().toISOString(), status: "inactive" })
          .eq("id", membershipId);

        if (error) {
          logger.error("Error rejecting", error, { membershipId });
          alert("Failed to reject membership");
          return;
        }
      }

      router.refresh();
    } catch (err) {
      logger.error("Error", err, { membershipId });
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className} style={styles.actions}>
      <button
        onClick={() => handleAction("reject")}
        disabled={loading}
        style={styles.rejectButton}
      >
        Decline
      </button>
      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        style={styles.approveButton}
      >
        Approve
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  actions: {
    display: "flex",
    gap: "0.5rem",
  },
  rejectButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "white",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
  approveButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
  },
};
