"use client";

import { useEffect, useCallback } from "react";
import { OptimizedImage } from "./OptimizedImage";
import styles from "./ImageLightbox.module.css";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    // Add escape key listener
    document.addEventListener("keydown", handleKeyDown);

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the image
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close lightbox"
        type="button"
      >
        &times;
      </button>
      <div className={styles.content}>
        <OptimizedImage
          src={src}
          alt={alt}
          width={1200}
          height={900}
          className={styles.image}
          borderRadius="var(--radius-md)"
          priority
        />
      </div>
      <span className={styles.hint}>Press Esc to close</span>
    </div>
  );
}
