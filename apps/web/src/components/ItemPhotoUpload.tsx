"use client";

import { useState, useRef } from "react";
import { OptimizedImage } from "./OptimizedImage";
import {
  uploadFile,
  deleteFile,
  validateImageFile,
  getPathFromUrl,
} from "@/lib/storage";
import styles from "./ItemPhotoUpload.module.css";

interface ItemPhotoUploadProps {
  userId: string;
  photos: string[];
  maxPhotos?: number;
  onPhotosChange: (urls: string[]) => void;
  onError: (message: string) => void;
}

interface PendingUpload {
  id: string;
  previewUrl: string;
  status: "uploading" | "error";
}

export function ItemPhotoUpload({
  userId,
  photos,
  maxPhotos = 5,
  onPhotosChange,
  onError,
}: ItemPhotoUploadProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxPhotos - photos.length - pendingUploads.length;
    if (remaining <= 0) {
      onError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const filesToUpload = files.slice(0, remaining);

    // Validate all files
    for (const file of filesToUpload) {
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        onError(validation.error!);
        return;
      }
    }

    // Create pending uploads with previews
    const newPending: PendingUpload[] = filesToUpload.map((file, i) => ({
      id: `pending-${Date.now()}-${i}`,
      previewUrl: URL.createObjectURL(file),
      status: "uploading" as const,
    }));

    setPendingUploads((prev) => [...prev, ...newPending]);

    // Upload files
    const uploadedUrls: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const pending = newPending[i];

      const { data, error } = await uploadFile("items", userId, file);

      if (error) {
        setPendingUploads((prev) =>
          prev.map((p) =>
            p.id === pending.id ? { ...p, status: "error" as const } : p
          )
        );
        onError(error.message);
      } else if (data) {
        uploadedUrls.push(data.url);
        setPendingUploads((prev) => prev.filter((p) => p.id !== pending.id));
        URL.revokeObjectURL(pending.previewUrl);
      }
    }

    if (uploadedUrls.length > 0) {
      onPhotosChange([...photos, ...uploadedUrls]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const url = photos[index];
    const path = getPathFromUrl(url, "items");

    if (path) {
      await deleteFile("items", path);
    }

    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleMakeCover = (index: number) => {
    if (index === 0) return;
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(index, 1);
    newPhotos.unshift(moved);
    onPhotosChange(newPhotos);
  };

  const canAddMore = photos.length + pendingUploads.length < maxPhotos;

  return (
    <div className={styles.container}>
      <label className={styles.label}>Photos</label>
      <p className={styles.hint}>
        Add up to {maxPhotos} photos. First photo will be the cover image.
      </p>

      <div className={styles.grid}>
        {photos.map((url, index) => (
          <div key={url} className={styles.photoItem}>
            <OptimizedImage
              src={url}
              alt={`Photo ${index + 1}`}
              width={120}
              height={120}
              className={styles.photo}
              borderRadius="var(--radius-md)"
            />
            {index === 0 && <span className={styles.coverBadge}>Cover</span>}
            <div className={styles.photoActions}>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => handleMakeCover(index)}
                  className={styles.actionButton}
                  title="Make cover"
                >
                  *
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className={styles.removeButton}
                title="Remove"
              >
                x
              </button>
            </div>
          </div>
        ))}

        {pendingUploads.map((pending) => (
          <div key={pending.id} className={styles.photoItem}>
            <img
              src={pending.previewUrl}
              alt="Uploading..."
              className={`${styles.photo} ${styles.photoUploading}`}
            />
            <div className={styles.uploadingOverlay}>
              {pending.status === "uploading" ? "Uploading..." : "Error"}
            </div>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.addButton}
          >
            <span className={styles.addIcon}>+</span>
            <span>Add Photo</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesSelect}
        className={styles.hiddenInput}
      />
    </div>
  );
}
