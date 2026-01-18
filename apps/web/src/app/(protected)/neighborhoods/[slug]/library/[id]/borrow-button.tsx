"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { parseDateLocal, displayDateLocal, getTodayLocal } from "@/lib/date-utils";
import styles from "./item-detail.module.css";

interface Props {
  itemId: string;
  slug: string;
  isAvailable: boolean;
  userLoan: any | null;
}

export function BorrowButton({ itemId, isAvailable, userLoan }: Props) {
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

  // User has an active loan on this item
  if (userLoan?.status === "active") {
    const today = getTodayLocal();
    const isOverdue = userLoan.due_date && parseDateLocal(userLoan.due_date) < today;

    return (
      <div className={isOverdue ? styles.overdueBadge : styles.borrowedBadge}>
        <div className={isOverdue ? styles.overdueTitle : styles.borrowedTitle}>
          {isOverdue ? "Overdue" : "You're borrowing this item"}
        </div>
        {userLoan.due_date && (
          <div className={isOverdue ? styles.overdueDue : styles.borrowedDue}>
            {isOverdue ? "Was due" : "Due"}: {displayDateLocal(userLoan.due_date)}
          </div>
        )}
        {isOverdue && (
          <div className={styles.overdueHint}>
            Please return this item to the owner
          </div>
        )}
      </div>
    );
  }

  // User has a pending or approved request
  if (userLoan?.status === "requested") {
    return (
      <div className={styles.requestedBadge}>
        Request pending
      </div>
    );
  }

  if (userLoan?.status === "approved") {
    return (
      <div className={styles.approvedBadge}>
        Request approved - contact the owner to arrange pickup
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className={styles.unavailable}>
        This item is not available for borrowing
      </div>
    );
  }

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)} className={styles.button}>
        Request to Borrow...
      </button>
    );
  }

  return (
    <div className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add a note to the owner (optional)..."
        rows={3}
        className={styles.textarea}
      />

      <div className={styles.actions}>
        <button
          onClick={() => setShowForm(false)}
          className={styles.formCancelButton}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={handleRequest}
          className={styles.button}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Request"}
        </button>
      </div>
    </div>
  );
}
