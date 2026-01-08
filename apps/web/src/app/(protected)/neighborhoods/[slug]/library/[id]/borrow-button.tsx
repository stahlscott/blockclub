"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  itemId: string;
  slug: string;
  isAvailable: boolean;
  hasExistingRequest: boolean;
}

export function BorrowButton({ itemId, slug, isAvailable, hasExistingRequest }: Props) {
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
        console.error("Loan request error:", insertError);
        setError(insertError.message);
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Error requesting loan:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (hasExistingRequest) {
    return (
      <div style={styles.requestedBadge}>
        Request pending
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
        Request to Borrow
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
