"use client";

import { useState } from "react";

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
      <button onClick={handleCopy} style={styles.linkButton}>
        {copied ? "Copied!" : "Invite"}
      </button>
    );
  }

  return (
    <button onClick={handleCopy} style={styles.button}>
      <span style={styles.icon}>🔗</span>
      <span>{copied ? "Link Copied!" : "Invite"}</span>
    </button>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  button: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1.5rem 1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    border: "none",
    color: "#333",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  icon: {
    fontSize: "1.5rem",
  },
  linkButton: {
    color: "#666",
    backgroundColor: "transparent",
    fontSize: "0.875rem",
    padding: "0.5rem 1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
