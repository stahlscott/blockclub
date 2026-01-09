"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface Props {
  itemId: string;
  slug: string;
  isAvailable: boolean;
  userLoan: any | null;
}

export function BorrowButton({ itemId, slug, isAvailable, userLoan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleRequest() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const { error: insertError } = await supabase.from("loans").insert({
        item_id: itemId,
        borrower_id: user.id,
        status: "requested",
        notes: notes.trim() || null,
      });

      if (insertError) {
        logger.error("Loan request error", insertError, { itemId });
        setError(insertError.message);
        return;
      }

      router.refresh();
    } catch (err) {
      logger.error("Error requesting loan", err, { itemId });
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Helper to parse YYYY-MM-DD string as local date (not UTC)
  const parseDateLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // User has an active loan on this item
  if (userLoan?.status === "active") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = userLoan.due_date && parseDateLocal(userLoan.due_date) < today;
    
    return (
      <div style={isOverdue ? styles.overdueBadge : styles.borrowedBadge}>
        <div style={isOverdue ? styles.overdueTitle : styles.borrowedTitle}>
          {isOverdue ? "Overdue" : "You're borrowing this item"}
        </div>
        {userLoan.due_date && (
          <div style={isOverdue ? styles.overdueDue : styles.borrowedDue}>
            {isOverdue ? "Was due" : "Due"}: {parseDateLocal(userLoan.due_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
        {isOverdue && (
          <div style={styles.overdueHint}>
            Please return this item to the owner
          </div>
        )}
      </div>
    );
  }

  // User has a pending or approved request
  if (userLoan?.status === "requested") {
    return (
      <div style={styles.requestedBadge}>
        Request pending
      </div>
    );
  }

  if (userLoan?.status === "approved") {
    return (
      <div style={styles.approvedBadge}>
        Request approved - contact the owner to arrange pickup
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div style={styles.unavailable}>
        This item is not available for borrowing
      </div>
    );
  }

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)} style={styles.button}>
        Request to Borrow...
      </button>
    );
  }

  return (
    <div style={styles.form}>
      {error && <div style={styles.error}>{error}</div>}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add a note to the owner (optional)..."
        rows={3}
        style={styles.textarea}
      />

      <div style={styles.actions}>
        <button
          onClick={() => setShowForm(false)}
          style={styles.cancelButton}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleRequest}
          style={styles.button}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Request"}
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  button: {
    width: "100%",
    padding: "0.875rem 1.5rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  unavailable: {
    padding: "0.875rem 1.5rem",
    backgroundColor: "#f5f5f5",
    color: "#666",
    borderRadius: "6px",
    textAlign: "center",
    fontSize: "0.875rem",
  },
  requestedBadge: {
    padding: "0.875rem 1.5rem",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    borderRadius: "6px",
    textAlign: "center",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  approvedBadge: {
    padding: "0.875rem 1.5rem",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    borderRadius: "6px",
    textAlign: "center",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  borrowedBadge: {
    padding: "1rem 1.5rem",
    backgroundColor: "#f0fdf4",
    border: "1px solid #86efac",
    color: "#166534",
    borderRadius: "6px",
    textAlign: "center",
  },
  borrowedTitle: {
    fontSize: "0.875rem",
    fontWeight: "600",
    marginBottom: "0.25rem",
  },
  borrowedDue: {
    fontSize: "0.75rem",
    color: "#15803d",
  },
  overdueBadge: {
    padding: "1rem 1.5rem",
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    borderRadius: "6px",
    textAlign: "center",
  },
  overdueTitle: {
    fontSize: "0.875rem",
    fontWeight: "600",
    marginBottom: "0.25rem",
  },
  overdueDue: {
    fontSize: "0.75rem",
    color: "#b91c1c",
  },
  overdueHint: {
    fontSize: "0.75rem",
    color: "#dc2626",
    marginTop: "0.5rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  error: {
    padding: "0.75rem 1rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  textarea: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "0.875rem",
    resize: "vertical",
    fontFamily: "inherit",
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
  },
  cancelButton: {
    flex: 1,
    padding: "0.75rem 1rem",
    backgroundColor: "#f5f5f5",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
};
