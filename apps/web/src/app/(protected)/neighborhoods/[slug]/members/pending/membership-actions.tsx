"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import styles from "./pending.module.css";

interface Props {
  membershipId: string;
  slug: string;
}

export function MembershipActions({ membershipId, slug }: Props) {
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
    <div className={styles.actions}>
      <button
        onClick={() => handleAction("reject")}
        disabled={loading}
        className={styles.rejectButton}
      >
        Decline
      </button>
      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        className={styles.approveButton}
      >
        Approve
      </button>
    </div>
  );
}
