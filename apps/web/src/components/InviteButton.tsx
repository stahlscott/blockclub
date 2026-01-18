"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import styles from "./InviteButton.module.css";

interface InviteButtonProps {
  slug: string;
  variant?: "card" | "link";
}

export function InviteButton({ slug, variant = "card" }: InviteButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${slug}`
      : `/join/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-HTTPS contexts or if permissions denied
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById(
      "invite-qr-canvas"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `invite-${slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Canvas export can fail in rare cases
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowModal(false);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      document.addEventListener("keydown", handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal, handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const modal = showModal && (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Invite QR code"
      data-testid="invite-modal"
    >
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Invite to Neighborhood</h2>
        <div className={styles.qrContainer}>
          <QRCodeCanvas
            value={url}
            size={300}
            level="M"
            marginSize={2}
            id="invite-qr-canvas"
          />
        </div>
        <div className={styles.qrUrl}>{url}</div>
        <div className={styles.qrActions}>
          <button
            onClick={handleCopy}
            className={styles.qrButton}
            type="button"
            data-testid="invite-modal-copy-button"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={handleDownloadQR}
            className={styles.qrButtonOutlined}
            type="button"
            data-testid="invite-modal-download-button"
          >
            Download QR
          </button>
        </div>
      </div>
      <button
        className={styles.closeButton}
        onClick={handleCloseModal}
        aria-label="Close"
        type="button"
        data-testid="invite-modal-close-button"
      >
        &times;
      </button>
      <span className={styles.hint}>Press Esc to close</span>
    </div>
  );

  if (variant === "link") {
    return (
      <>
        <button onClick={handleOpenModal} className={styles.linkButton} data-testid="invite-button">
          <span className={styles.linkIcon}>👋</span>
          <span className={styles.linkText}>Invite</span>
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <button onClick={handleOpenModal} className={styles.button} data-testid="invite-button">
        <span className={styles.icon}>🔗</span>
        <span>Invite</span>
      </button>
      {modal}
    </>
  );
}
