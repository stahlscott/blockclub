"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

interface AdminActionsProps {
  itemId: string;
  itemName: string;
  slug: string;
}

export function AdminActions({ itemId, itemName, slug }: AdminActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${itemName}" from the library? This action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      if (deleteError) {
        throw deleteError;
      }

      // Redirect to library after deletion
      router.push(`/neighborhoods/${slug}/library`);
    } catch (err) {
      logger.error("Error removing item", err, { itemId });
      setError(err instanceof Error ? err.message : "Failed to remove item");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Admin Actions</h3>
      {error && <p style={styles.error}>{error}</p>}
      <button
        onClick={handleRemove}
        disabled={loading}
        style={styles.removeButton}
      >
        {loading ? "Removing..." : "Remove Item"}
      </button>
      <p style={styles.hint}>
        As an admin, you can remove items that violate community guidelines.
      </p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginTop: "1.5rem",
    padding: "1rem",
    backgroundColor: "#fef2f2",
    borderRadius: "8px",
    border: "1px solid #fecaca",
  },
  title: {
    margin: "0 0 0.75rem 0",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#991b1b",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    margin: "0 0 0.5rem 0",
  },
  removeButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    width: "100%",
  },
  hint: {
    marginTop: "0.5rem",
    fontSize: "0.75rem",
    color: "#991b1b",
    margin: "0.5rem 0 0 0",
  },
};
