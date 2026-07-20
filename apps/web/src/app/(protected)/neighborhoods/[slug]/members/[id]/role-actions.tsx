"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/Modal";
import styles from "./member-profile.module.css";

interface RoleActionsProps {
  membershipId: string;
  currentRole: "admin" | "member";
  canPromote: boolean;
  canDemote: boolean;
  memberName: string;
}

export function RoleActions({
  membershipId,
  currentRole,
  canPromote,
  canDemote,
  memberName,
}: RoleActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<"admin" | "member" | null>(null);

  const handleRoleChange = async (newRole: "admin" | "member") => {
    setPendingRole(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/memberships/${membershipId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      // Refresh the page to show updated role
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (!canPromote && !canDemote) {
    return null;
  }

  return (
    <div className={styles.actionContainer}>
      {error && <p className={styles.actionError}>{error}</p>}

      {currentRole === "member" && canPromote && (
        <button
          onClick={() => setPendingRole("admin")}
          disabled={loading}
          className={styles.actionLink}
          data-testid="member-promote-button"
        >
          {loading ? "Updating..." : "Promote to admin"}
        </button>
      )}

      {currentRole === "admin" && canDemote && (
        <button
          onClick={() => setPendingRole("member")}
          disabled={loading}
          className={styles.actionLink}
          data-testid="member-demote-button"
        >
          {loading ? "Updating..." : "Demote to member"}
        </button>
      )}

      <Modal open={pendingRole !== null} onOpenChange={(open) => !open && setPendingRole(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {pendingRole === "admin" ? "Promote" : "Demote"} {memberName}?
            </ModalTitle>
            <ModalDescription>
              This will change {memberName}&apos;s neighborhood role to {pendingRole}.
            </ModalDescription>
          </ModalHeader>
          <div className={styles.actionContainer}>
            <button type="button" onClick={() => setPendingRole(null)} disabled={loading}>
              Cancel
            </button>
            <button type="button" onClick={() => pendingRole && handleRoleChange(pendingRole)} disabled={loading}>
              {loading ? "Updating..." : "Confirm change"}
            </button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
