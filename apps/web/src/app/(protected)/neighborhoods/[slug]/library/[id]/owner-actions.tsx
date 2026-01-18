"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { formatDateLocal, displayDateLocal, getDaysFromNow } from "@/lib/date-utils";
import styles from "./item-detail.module.css";

interface Props {
  item: any;
  slug: string;
  activeLoan: any;
}

export function OwnerActions({ item, slug, activeLoan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Default due date is 2 weeks from today, or use existing due date for active loans
  const defaultDueDate = activeLoan?.due_date || formatDateLocal(getDaysFromNow(14));
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [noDueDate, setNoDueDate] = useState(activeLoan?.status === "active" && !activeLoan?.due_date);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

  async function handleLoanAction(action: "approve" | "decline" | "mark_returned") {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      if (action === "approve") {
        // Approve the loan request with selected due date (or null if no due date)
        const { error: loanError } = await supabase
          .from("loans")
          .update({
            status: "active",
            start_date: formatDateLocal(new Date()),
            due_date: noDueDate ? null : dueDate,
          })
          .eq("id", activeLoan.id);

        if (loanError) throw loanError;

        // Mark item as borrowed
        const { error: itemError } = await supabase
          .from("items")
          .update({ availability: "borrowed" })
          .eq("id", item.id);

        if (itemError) throw itemError;
      } else if (action === "decline") {
        // Decline/cancel the request
        const { error: loanError } = await supabase
          .from("loans")
          .update({ status: "cancelled" })
          .eq("id", activeLoan.id);

        if (loanError) throw loanError;
      } else if (action === "mark_returned") {
        // Mark as returned
        const { error: loanError } = await supabase
          .from("loans")
          .update({
            status: "returned",
            returned_at: new Date().toISOString(),
          })
          .eq("id", activeLoan.id);

        if (loanError) throw loanError;

        // Mark item as available
        const { error: itemError } = await supabase
          .from("items")
          .update({ availability: "available" })
          .eq("id", item.id);

        if (itemError) throw itemError;
      }

      router.refresh();
    } catch (err: any) {
      logger.error("Error updating loan", err, { itemId: item.id });
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateDueDate() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("loans")
        .update({ due_date: noDueDate ? null : dueDate })
        .eq("id", activeLoan.id);

      if (updateError) throw updateError;

      setIsEditingDueDate(false);
      router.refresh();
    } catch (err: any) {
      logger.error("Error updating due date", err, { itemId: item.id });
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAvailability() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const newStatus = item.availability === "available" ? "unavailable" : "available";

      const { error: updateError } = await supabase
        .from("items")
        .update({ availability: newStatus })
        .eq("id", item.id);

      if (updateError) throw updateError;

      router.refresh();
    } catch (err: any) {
      logger.error("Error updating availability", err, { itemId: item.id });
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      router.push(`/neighborhoods/${slug}/library`);
      router.refresh();
    } catch (err: any) {
      logger.error("Error deleting item", err, { itemId: item.id });
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Pending loan request */}
      {activeLoan && activeLoan.status === "requested" && (
        <div className={styles.requestCard}>
          <h3 className={styles.requestTitle}>Borrow Request</h3>
          <p className={styles.requestText}>
            <strong>{activeLoan.borrower?.name}</strong> wants to borrow this item
          </p>
          {activeLoan.notes && (
            <p className={styles.requestNotes}>&ldquo;{activeLoan.notes}&rdquo;</p>
          )}
          <div className={styles.dueDateSection}>
            <label htmlFor="dueDate" className={styles.dueDateLabel}>
              Due date
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={formatDateLocal(new Date())}
              className={styles.dueDateInput}
              style={{ opacity: noDueDate ? 0.5 : 1 }}
              disabled={noDueDate}
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={noDueDate}
                onChange={(e) => setNoDueDate(e.target.checked)}
                className={styles.checkbox}
              />
              No due date (return when done)
            </label>
          </div>
          <div className={styles.requestActions}>
            <button
              onClick={() => handleLoanAction("decline")}
              className={styles.declineButton}
              disabled={loading}
              data-testid="library-item-decline-button"
            >
              Decline
            </button>
            <button
              onClick={() => handleLoanAction("approve")}
              className={styles.approveButton}
              disabled={loading}
              data-testid="library-item-approve-button"
            >
              Approve
            </button>
          </div>
        </div>
      )}

      {/* Active loan */}
      {activeLoan && activeLoan.status === "active" && (
        <div className={styles.activeLoanCard}>
          <h3 className={styles.requestTitle}>Currently Borrowed</h3>
          <p className={styles.requestText}>
            Borrowed by <strong>{activeLoan.borrower?.name}</strong>
          </p>
          <p className={styles.loanDates}>
            Since: {displayDateLocal(activeLoan.start_date)}
          </p>
          
          {isEditingDueDate ? (
            <div className={styles.editDueDateSection}>
              <label htmlFor="editDueDate" className={styles.dueDateLabel}>
                Due date
              </label>
              <input
                type="date"
                id="editDueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={formatDateLocal(new Date())}
                className={styles.dueDateInput}
                style={{ opacity: noDueDate ? 0.5 : 1 }}
                disabled={noDueDate}
              />
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={noDueDate}
                  onChange={(e) => setNoDueDate(e.target.checked)}
                  className={styles.checkbox}
                />
                No due date (return when done)
              </label>
              <div className={styles.editDueDateActions}>
                <button
                  onClick={() => {
                    setDueDate(activeLoan.due_date || defaultDueDate);
                    setNoDueDate(!activeLoan.due_date);
                    setIsEditingDueDate(false);
                  }}
                  className={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateDueDate}
                  className={styles.saveDueDateButton}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.dueDateDisplay}>
              <span className={styles.dueDateText}>
                Due: {activeLoan.due_date 
                  ? displayDateLocal(activeLoan.due_date)
                  : "No due date set"}
              </span>
              <button
                onClick={() => setIsEditingDueDate(true)}
                className={styles.editDueDateButton}
              >
                Edit
              </button>
            </div>
          )}
          
          <button
            onClick={() => handleLoanAction("mark_returned")}
            className={styles.returnButton}
            disabled={loading}
            data-testid="library-item-mark-returned-button"
          >
            Mark as Returned
          </button>
        </div>
      )}

      {/* Owner management buttons */}
      <div className={styles.ownerActions}>
        <Link href={`/neighborhoods/${slug}/library/${item.id}/edit`} className={styles.editButton} data-testid="library-item-edit-button">
          Edit Item
        </Link>

        {!activeLoan && item.availability !== "borrowed" && (
          <button
            onClick={handleToggleAvailability}
            className={styles.toggleButton}
            disabled={loading}
            data-testid="library-item-toggle-availability-button"
          >
            {item.availability === "available" ? "Mark Unavailable" : "Mark Available"}
          </button>
        )}

        <button
          onClick={handleDelete}
          className={styles.deleteButton}
          disabled={loading || !!activeLoan}
          data-testid="library-item-delete-button"
        >
          Delete Item
        </button>
      </div>
    </div>
  );
}
