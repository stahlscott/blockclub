"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface Props {
  item: any;
  slug: string;
  activeLoan: any;
}

export function OwnerActions({ item, slug, activeLoan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Helper to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  
  // Helper to parse YYYY-MM-DD string as local date (not UTC)
  const parseDateLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  
  // Helper to display a date string in local timezone
  const displayDate = (dateStr: string) => {
    return parseDateLocal(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  
  // Default due date is 2 weeks from today, or use existing due date for active loans
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
  const defaultDueDate = activeLoan?.due_date || formatDateLocal(twoWeeksFromNow);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

  async function handleLoanAction(action: "approve" | "decline" | "mark_returned") {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      if (action === "approve") {
        // Approve the loan request with selected due date
        const { error: loanError } = await supabase
          .from("loans")
          .update({
            status: "active",
            start_date: formatDateLocal(new Date()),
            due_date: dueDate,
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
        .update({ due_date: dueDate })
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
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}

      {/* Pending loan request */}
      {activeLoan && activeLoan.status === "requested" && (
        <div style={styles.requestCard}>
          <h3 style={styles.requestTitle}>Borrow Request</h3>
          <p style={styles.requestText}>
            <strong>{activeLoan.borrower?.name}</strong> wants to borrow this item
          </p>
          {activeLoan.notes && (
            <p style={styles.requestNotes}>"{activeLoan.notes}"</p>
          )}
          <div style={styles.dueDateSection}>
            <label htmlFor="dueDate" style={styles.dueDateLabel}>
              Due date
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={formatDateLocal(new Date())}
              style={styles.dueDateInput}
            />
          </div>
          <div style={styles.requestActions}>
            <button
              onClick={() => handleLoanAction("decline")}
              style={styles.declineButton}
              disabled={loading}
            >
              Decline
            </button>
            <button
              onClick={() => handleLoanAction("approve")}
              style={styles.approveButton}
              disabled={loading}
            >
              Approve
            </button>
          </div>
        </div>
      )}

      {/* Active loan */}
      {activeLoan && activeLoan.status === "active" && (
        <div style={styles.activeLoanCard}>
          <h3 style={styles.requestTitle}>Currently Borrowed</h3>
          <p style={styles.requestText}>
            Borrowed by <strong>{activeLoan.borrower?.name}</strong>
          </p>
          <p style={styles.loanDates}>
            Since: {displayDate(activeLoan.start_date)}
          </p>
          
          {isEditingDueDate ? (
            <div style={styles.editDueDateSection}>
              <label htmlFor="editDueDate" style={styles.dueDateLabel}>
                Due date
              </label>
              <input
                type="date"
                id="editDueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={formatDateLocal(new Date())}
                style={styles.dueDateInput}
              />
              <div style={styles.editDueDateActions}>
                <button
                  onClick={() => {
                    setDueDate(activeLoan.due_date || defaultDueDate);
                    setIsEditingDueDate(false);
                  }}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateDueDate}
                  style={styles.saveDueDateButton}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div style={styles.dueDateDisplay}>
              <span style={styles.dueDateText}>
                Due: {activeLoan.due_date 
                  ? displayDate(activeLoan.due_date)
                  : "No due date set"}
              </span>
              <button
                onClick={() => setIsEditingDueDate(true)}
                style={styles.editDueDateButton}
              >
                Edit
              </button>
            </div>
          )}
          
          <button
            onClick={() => handleLoanAction("mark_returned")}
            style={styles.returnButton}
            disabled={loading}
          >
            Mark as Returned
          </button>
        </div>
      )}

      {/* Owner management buttons */}
      <div style={styles.ownerActions}>
        <Link href={`/neighborhoods/${slug}/library/${item.id}/edit`} style={styles.editButton}>
          Edit Item
        </Link>

        {!activeLoan && item.availability !== "borrowed" && (
          <button
            onClick={handleToggleAvailability}
            style={styles.toggleButton}
            disabled={loading}
          >
            {item.availability === "available" ? "Mark Unavailable" : "Mark Available"}
          </button>
        )}

        <button
          onClick={handleDelete}
          style={styles.deleteButton}
          disabled={loading || !!activeLoan}
        >
          Delete Item
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
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
  requestCard: {
    padding: "1.25rem",
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
  },
  activeLoanCard: {
    padding: "1.25rem",
    backgroundColor: "#dbeafe",
    borderRadius: "8px",
  },
  requestTitle: {
    margin: "0 0 0.5rem 0",
    fontSize: "1rem",
    fontWeight: "600",
  },
  requestText: {
    margin: "0 0 0.5rem 0",
    fontSize: "0.875rem",
  },
  requestNotes: {
    margin: "0 0 1rem 0",
    fontSize: "0.875rem",
    fontStyle: "italic",
    color: "#666",
  },
  dueDateSection: {
    marginBottom: "1rem",
  },
  dueDateLabel: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: "500",
    color: "#666",
    marginBottom: "0.375rem",
  },
  dueDateInput: {
    width: "100%",
    padding: "0.625rem 0.75rem",
    fontSize: "0.875rem",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    backgroundColor: "white",
  },
  loanDates: {
    margin: "0 0 0.75rem 0",
    fontSize: "0.875rem",
    color: "#1e40af",
  },
  dueDateDisplay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: "6px",
    marginBottom: "1rem",
  },
  dueDateText: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#1e40af",
  },
  editDueDateButton: {
    padding: "0.375rem 0.75rem",
    backgroundColor: "white",
    color: "#2563eb",
    border: "1px solid #93c5fd",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  editDueDateSection: {
    marginBottom: "1rem",
  },
  editDueDateActions: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  cancelButton: {
    flex: 1,
    padding: "0.5rem 0.75rem",
    backgroundColor: "white",
    color: "#666",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  saveDueDateButton: {
    flex: 1,
    padding: "0.5rem 0.75rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  requestActions: {
    display: "flex",
    gap: "0.75rem",
  },
  declineButton: {
    flex: 1,
    padding: "0.625rem 1rem",
    backgroundColor: "white",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
  approveButton: {
    flex: 1,
    padding: "0.625rem 1rem",
    backgroundColor: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  returnButton: {
    width: "100%",
    padding: "0.625rem 1rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  ownerActions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingTop: "0.5rem",
    borderTop: "1px solid #eee",
  },
  editButton: {
    display: "block",
    textAlign: "center",
    padding: "0.75rem 1rem",
    backgroundColor: "#f5f5f5",
    color: "#333",
    textDecoration: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  toggleButton: {
    padding: "0.75rem 1rem",
    backgroundColor: "white",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "0.75rem 1rem",
    backgroundColor: "white",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    fontSize: "0.875rem",
    cursor: "pointer",
  },
};
