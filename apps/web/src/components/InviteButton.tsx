"use client";

import { useInvite } from "@/lib/hooks/useInvite";
import styles from "./InviteButton.module.css";

interface InviteButtonProps {
  slug: string;
  variant?: "card" | "link" | "text";
}

export function InviteButton({ slug, variant = "card" }: InviteButtonProps) {
  const { handleInvite, modal } = useInvite(slug);

  if (variant === "text") {
    return (
      <>
        <button onClick={handleInvite} className={styles.textButton} data-testid="invite-button">
          Invite
        </button>
        {modal}
      </>
    );
  }

  if (variant === "link") {
    return (
      <>
        <button onClick={handleInvite} className={styles.linkButton} data-testid="invite-button">
          <span className={styles.linkIcon}>👋</span>
          <span className={styles.linkText}>Invite Neighbors</span>
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <button onClick={handleInvite} className={styles.button} data-testid="invite-button">
        <span className={styles.icon}>🔗</span>
        <span>Invite</span>
      </button>
      {modal}
    </>
  );
}
