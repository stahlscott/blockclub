"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/Modal";
import { softDeleteItem, type OwnerMutationState } from "./owner-mutation-actions";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeState, removeAction, removePending] = useActionState<OwnerMutationState, FormData>(softDeleteItem, {});

  useEffect(() => {
    if (removeState.success) router.push(`/neighborhoods/${slug}/library`);
    if (removeState.error) {
      setError(removeState.error);
      setLoading(false);
    }
  }, [removeState.error, removeState.success, router, slug]);

  const handleRemove = () => {
    setError(null);
    setLoading(true);
    setDialogOpen(false);
  };

  return (
    <div className={styles.adminActions}>
      <h3 className={styles.adminTitle}>Admin Actions</h3>
      {error && <p className={styles.adminError}>{error}</p>}
      <Modal open={dialogOpen} onOpenChange={setDialogOpen}>
        <ModalTrigger asChild>
          <button
            type="button"
            disabled={loading || removePending}
            className={styles.removeButton}
            data-testid="library-item-admin-remove-button"
          >
            Remove Item
          </button>
        </ModalTrigger>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Remove &ldquo;{itemName}&rdquo;?</ModalTitle>
            <ModalDescription>
              The item will be hidden from the library. Existing loan history will be preserved and open requests will be cancelled.
            </ModalDescription>
          </ModalHeader>
          <div className={styles.requestActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setDialogOpen(false)}
              disabled={removePending}
            >
              Cancel
            </button>
            <form action={removeAction} onSubmit={handleRemove}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                className={styles.removeButton}
                disabled={removePending}
                data-testid="library-item-admin-remove-confirm-button"
              >
                {removePending ? "Removing..." : "Remove Item"}
              </button>
            </form>
          </div>
        </ModalContent>
      </Modal>
      <p className={styles.adminHint}>
        As an admin, you can remove items that violate community guidelines.
      </p>
    </div>
  );
}
