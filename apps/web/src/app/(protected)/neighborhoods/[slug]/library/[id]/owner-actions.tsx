"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/Modal";
import { softDeleteItem } from "./owner-mutation-actions";
import { formatDateLocal, displayDateLocal, getDaysFromNow } from "@/lib/date-utils";
import {
  approveLoan,
  activateLoan,
  declineLoan,
  markLoanReturned,
  type LoanActionState,
} from "./loan-actions";
import {
  toggleItemAvailability,
  updateLoanDueDate,
  type OwnerMutationState,
} from "./owner-mutation-actions";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const [activateState, activateAction, activatePending] = useActionState<
    LoanActionState,
    FormData
  >(activateLoan, {});

  const [declineState, declineAction, declinePending] = useActionState<
    LoanActionState,
    FormData
  >(declineLoan, {});

  const [returnState, returnAction, returnPending] = useActionState<
    LoanActionState,
    FormData
  >(markLoanReturned, {});
  const [dueDateState, dueDateAction, dueDatePending] = useActionState<OwnerMutationState, FormData>(updateLoanDueDate, {});
  const [availabilityState, availabilityAction, availabilityPending] = useActionState<OwnerMutationState, FormData>(toggleItemAvailability, {});

  // Combined loading state
  const isActionPending = approvePending || activatePending || declinePending || returnPending || dueDatePending || availabilityPending || loading;

  const [deleteState, deleteAction, deletePending] = useActionState<OwnerMutationState, FormData>(softDeleteItem, {});

  // Combined error state
  const error = localError || approveState.error || activateState.error || declineState.error || returnState.error || dueDateState.error || availabilityState.error || deleteState.error;

  useEffect(() => {
    if (deleteState.success) {
      router.push(`/neighborhoods/${slug}/library`);
      router.refresh();
    }
    if (deleteState.error) setLoading(false);
  }, [deleteState.error, deleteState.success, router, slug]);

  const handleDelete = () => {
    setLocalError("");
    setDeleteDialogOpen(false);
  };

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

      {/* Approved loan awaiting owner-confirmed pickup */}
      {activeLoan && activeLoan.status === "approved" && (
        <div className={styles.requestCard}>
          <h3 className={styles.requestTitle}>Approved — confirm pickup</h3>
          <p className={styles.requestText}>
            Confirm when <strong>{activeLoan.borrower?.name}</strong> has picked up this item.
          </p>
          <div className={styles.dueDateSection}>
            <label htmlFor="pickupDueDate" className={styles.dueDateLabel}>Due date</label>
            <input
              type="date"
              id="pickupDueDate"
              name="dueDate"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              min={formatDateLocal(new Date())}
              className={styles.dueDateInput}
              style={{ opacity: noDueDate ? 0.5 : 1 }}
              disabled={noDueDate}
              form="activate-form"
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={noDueDate}
                onChange={(event) => setNoDueDate(event.target.checked)}
                className={styles.checkbox}
              />
              No due date (return when done)
            </label>
          </div>
          <form id="activate-form" action={activateAction}>
            <input type="hidden" name="loanId" value={activeLoan.id} />
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="dueDate" value={dueDate} />
            <input type="hidden" name="noDueDate" value={noDueDate ? "true" : "false"} />
            <button
              type="submit"
              className={styles.approveButton}
              disabled={isActionPending}
              data-testid="library-item-pickup-button"
            >
              {activatePending ? "Confirming pickup..." : "Confirm Pickup"}
            </button>
          </form>
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
                <form action={dueDateAction}>
                  <input type="hidden" name="loanId" value={activeLoan.id} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="dueDate" value={dueDate} />
                  <input type="hidden" name="noDueDate" value={noDueDate ? "true" : "false"} />
                  <button
                    type="submit"
                    className={styles.saveDueDateButton}
                    disabled={isActionPending}
                  >
                    {dueDatePending ? "Saving..." : "Save"}
                  </button>
                </form>
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
          <form action={availabilityAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="slug" value={slug} />
            <button
              type="submit"
              className={styles.toggleButton}
              disabled={isActionPending}
              data-testid="library-item-toggle-availability-button"
            >
              {availabilityPending ? "Saving..." : item.availability === "available" ? "Mark Unavailable" : "Mark Available"}
            </button>
          </form>
        )}

        <Modal open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <ModalTrigger asChild>
            <button
              type="button"
              className={styles.deleteButton}
              disabled={loading || !!activeLoan || deletePending}
              data-testid="library-item-delete-button"
            >
              Delete Item
            </button>
          </ModalTrigger>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Delete {item.id ? "this item" : "item"}?</ModalTitle>
              <ModalDescription>
                The item will be removed from the library. Existing loan history will be preserved; open requests will be cancelled.
              </ModalDescription>
            </ModalHeader>
            <div className={styles.requestActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deletePending}
              >
                Cancel
              </button>
              <form action={deleteAction} onSubmit={handleDelete}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="slug" value={slug} />
                <button
                  type="submit"
                  className={styles.deleteButton}
                  disabled={deletePending}
                  data-testid="library-item-delete-confirm-button"
                >
                  {deletePending ? "Deleting..." : "Delete Item"}
                </button>
              </form>
            </div>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
