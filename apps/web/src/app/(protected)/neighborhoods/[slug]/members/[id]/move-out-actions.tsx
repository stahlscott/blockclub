"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/Modal";
import styles from "./member-profile.module.css";

interface MoveOutActionsProps {
  membershipId: string;
  slug: string;
  canMarkMovedOut: boolean;
  memberName: string;
}

export function MoveOutActions({
  membershipId,
  slug,
  canMarkMovedOut,
  memberName,
}: MoveOutActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleMoveOut = async () => {
    setLoading(true);
    setDialogOpen(false);
    setError(null);

    try {
      const response = await fetch(`/api/memberships/${membershipId}/move-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update membership");
      }

      // Redirect to directory after marking someone as moved out
      router.push(`/neighborhoods/${slug}/directory`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (!canMarkMovedOut) {
    return null;
  }

  return (
    <div className={styles.actionContainer}>
      {error && <p className={styles.actionError}>{error}</p>}
      <Modal open={dialogOpen} onOpenChange={setDialogOpen}>
        <button
          onClick={() => setDialogOpen(true)}
          disabled={loading}
          className={styles.actionLink}
          data-testid="member-move-out-button"
        >
          {loading ? "Updating..." : "Mark as moved out"}
        </button>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Mark {memberName} as moved out?</ModalTitle>
            <ModalDescription>
              Their lending library items will be removed from the neighborhood.
            </ModalDescription>
          </ModalHeader>
          <div className={styles.actionContainer}>
            <button type="button" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </button>
            <button type="button" onClick={handleMoveOut} disabled={loading}>
              {loading ? "Updating..." : "Confirm move-out"}
            </button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
