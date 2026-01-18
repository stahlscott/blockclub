"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { formatDateLocal, displayDateLocal, getDaysFromNow } from "@/lib/date-utils";
import {
  approveLoan,
  declineLoan,
  markLoanReturned,
  type LoanActionState,
} from "./loan-actions";
import styles from "./item-detail.module.css";

interface Props {
  item: {
    id: string;
    availability: string;
  };
  slug: string;
  activeLoan: {
    id: string;
    status: string;
    due_date: string | null;
    start_date: string | null;
    notes: string | null;
    borrower?: {
      id: string;
      name: string;
    };
  } | null;
}

export function OwnerActions({ item, slug, activeLoan }: Props) {
  const router = useRouter();

  // Local UI state
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  // Default due date is 2 weeks from today, or use existing due date for active loans
  const defaultDueDate = activeLoan?.due_date || formatDateLocal(getDaysFromNow(14));
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [noDueDate, setNoDueDate] = useState(
    activeLoan?.status === "active" && !activeLoan?.due_date
  );
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

  // Server action states
  const [approveState, approveAction, approvePending] = useActionState<
    LoanActionState,
    FormData
  >(approveLoan, {});

  const [declineState, declineAction, declinePending] = useActionState<
    LoanActionState,
    FormData
  >(declineLoan, {});

  const [returnState, returnAction, returnPending] = useActionState<
    LoanActionState,
    FormData
  >(markLoanReturned, {});

  // Combined loading state
  const isActionPending = approvePending || declinePending || returnPending || loading;

  // Combined error state
  const error = localError || approveState.error || declineState.error || returnState.error;

  // Client-side handlers for non-notification actions
  async function handleUpdateDueDate() {
    setLocalError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("loans")
        .update({ due_date: noDueDate ? null : dueDate })
        .eq("id", activeLoan!.id);

      if (updateError) throw updateError;

      setIsEditingDueDate(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logger.error("Error updating due date", err, { itemId: item.id });
      setLocalError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAvailability() {
    setLocalError("");
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logger.error("Error updating availability", err, { itemId: item.id });
      setLocalError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setLocalError("");
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      logger.error("Error deleting item", err, { itemId: item.id });
      setLocalError(message);
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
              name="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={formatDateLocal(new Date())}
              className={styles.dueDateInput}
              style={{ opacity: noDueDate ? 0.5 : 1 }}
              disabled={noDueDate}
              form="approve-form"
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
            {/* Decline form */}
            <form action={declineAction}>
              <input type="hidden" name="loanId" value={activeLoan.id} />
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                className={styles.declineButton}
                disabled={isActionPending}
                data-testid="library-item-decline-button"
              >
                {declinePending ? "Declining..." : "Decline"}
              </button>
            </form>

            {/* Approve form */}
            <form id="approve-form" action={approveAction}>
              <input type="hidden" name="loanId" value={activeLoan.id} />
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="dueDate" value={dueDate} />
              <input type="hidden" name="noDueDate" value={noDueDate ? "true" : "false"} />
              <button
                type="submit"
                className={styles.approveButton}
                disabled={isActionPending}
                data-testid="library-item-approve-button"
              >
                {approvePending ? "Approving..." : "Approve"}
              </button>
            </form>
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
            Since: {displayDateLocal(activeLoan.start_date!)}
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
                Due:{" "}
                {activeLoan.due_date
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

          {/* Mark as returned form */}
          <form action={returnAction}>
            <input type="hidden" name="loanId" value={activeLoan.id} />
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="slug" value={slug} />
            <button
              type="submit"
              className={styles.returnButton}
              disabled={isActionPending}
              data-testid="library-item-mark-returned-button"
            >
              {returnPending ? "Processing..." : "Mark as Returned"}
            </button>
          </form>
        </div>
      )}

      {/* Owner management buttons */}
      <div className={styles.ownerActions}>
        <Link
          href={`/neighborhoods/${slug}/library/${item.id}/edit`}
          className={styles.editButton}
          data-testid="library-item-edit-button"
        >
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
