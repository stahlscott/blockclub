"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
          console.error("Error approving:", error);
          alert("Failed to approve membership");
          return;
        }
      } else {
        const { error } = await supabase
          .from("memberships")
          .delete()
          .eq("id", membershipId);

        if (error) {
          console.error("Error rejecting:", error);
          alert("Failed to reject membership");
          return;
        }
      }

      router.refresh();
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.actions}>
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
