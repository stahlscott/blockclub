"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseDateLocal, displayDateLocal, getTodayLocal } from "@/lib/date-utils";
import { requestLoan, type RequestLoanState } from "./actions";
import styles from "./item-detail.module.css";

interface Props {
  itemId: string;
  slug: string;
  isAvailable: boolean;
  userLoan: any | null;
}

export function BorrowButton({ itemId, slug, isAvailable, userLoan }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState<RequestLoanState, FormData>(
    requestLoan,
    {}
  );

  // Refresh the page when the request succeeds
  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

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
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="slug" value={slug} />

      {state.error && <div className={styles.error}>{state.error}</div>}

      <textarea
        name="notes"
        placeholder="Add a note to the owner (optional)..."
        rows={3}
        className={styles.textarea}
      />

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className={styles.formCancelButton}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.button}
          disabled={isPending}
        >
          {isPending ? "Sending..." : "Send Request"}
        </button>
      </div>
    </form>
  );
}
