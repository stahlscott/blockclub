"use client";

import { useState } from "react";
import styles from "./InviteButton.module.css";

interface InviteButtonProps {
  slug: string;
  variant?: "card" | "link";
}

export function InviteButton({ slug, variant = "card" }: InviteButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/join/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "link") {
    return (
      <button onClick={handleCopy} className={styles.linkButton}>
        {copied ? "Copied!" : "Invite"}
      </button>
    );
  }

  return (
    <button onClick={handleCopy} className={styles.button}>
      <span className={styles.icon}>🔗</span>
      <span>{copied ? "Link Copied!" : "Invite"}</span>
    </button>
  );
}
