"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import styles from "./item-detail.module.css";

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
    <div className={styles.adminActions}>
      <h3 className={styles.adminTitle}>Admin Actions</h3>
      {error && <p className={styles.adminError}>{error}</p>}
      <button
        onClick={handleRemove}
        disabled={loading}
        className={styles.removeButton}
      >
        {loading ? "Removing..." : "Remove Item"}
      </button>
      <p className={styles.adminHint}>
        As an admin, you can remove items that violate community guidelines.
      </p>
    </div>
  );
}
