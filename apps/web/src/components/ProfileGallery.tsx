"use client";

import { useState } from "react";
import { OptimizedImage } from "./OptimizedImage";
import { ImageLightbox } from "./ImageLightbox";
import styles from "./ProfileGallery.module.css";

interface ProfileGalleryProps {
  photoUrls: string[];
  memberName: string;
}

export function ProfileGallery({ photoUrls, memberName }: ProfileGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!photoUrls || photoUrls.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Photos</h2>
      <div className={styles.grid}>
        {photoUrls.map((url, index) => (
          <button
            key={url}
            type="button"
            className={styles.photoButton}
            onClick={() => setLightboxUrl(url)}
            aria-label={`View photo ${index + 1}`}
          >
            <OptimizedImage
              src={url}
              alt={`${memberName} photo ${index + 1}`}
              width={200}
              height={200}
              className={styles.photo}
              borderRadius="var(--radius-lg)"
            />
          </button>
        ))}
      </div>

      {lightboxUrl && (
        <ImageLightbox
          src={lightboxUrl}
          alt={`${memberName} photo`}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
}
