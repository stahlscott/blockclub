"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Props {
  item: any;
  slug: string;
  activeLoan: any;
}

export function OwnerActions({ item, slug, activeLoan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLoanAction(action: "approve" | "decline" | "mark_returned") {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      if (action === "approve") {
        // Approve the loan request
        const { error: loanError } = await supabase
          .from("loans")
          .update({
            status: "active",
            start_date: new Date().toISOString().split("T")[0],
            due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0], // 2 weeks default
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
      console.error("Error updating loan:", err);
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
      console.error("Error updating availability:", err);
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
      console.error("Error deleting item:", err);
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
            Since: {new Date(activeLoan.start_date).toLocaleDateString()}
            {activeLoan.due_date && (
              <> | Due: {new Date(activeLoan.due_date).toLocaleDateString()}</>
            )}
          </p>
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
  loanDates: {
    margin: "0 0 1rem 0",
    fontSize: "0.875rem",
    color: "#666",
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
