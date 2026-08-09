"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { OptimizedImage } from "./OptimizedImage";
import { uploadFile, validateImageFile } from "@/lib/storage";
import { normalizeImage } from "@/lib/image-normalization";
import styles from "./ItemPhotoUpload.module.css";

interface ItemPhotoUploadProps {
  userId: string;
  itemId?: string;
  uploadCapability?: string;
  photos: string[];
  maxPhotos?: number;
  onPhotosChange: (urls: string[]) => void;
  onError: (message: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

interface PendingUpload {
  id: string;
  previewUrl: string;
  status: "uploading" | "error";
}

export function ItemPhotoUpload({
  userId,
  itemId,
  uploadCapability,
  photos,
  maxPhotos = 5,
  onPhotosChange,
  onError,
  onUploadingChange,
}: ItemPhotoUploadProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || pendingUploads.some((pending) => pending.status === "uploading")) return;

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
    onUploadingChange?.(true);

    try {
      // Upload files
      const uploadedUrls: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const pending = newPending[i];

        let normalizedFile: File;
        try {
          normalizedFile = (await normalizeImage(file, "item", { useWebWorker: true })).file;
        } catch (error) {
          setPendingUploads((prev) => prev.map((p) => p.id === pending.id ? { ...p, status: "error" as const } : p));
          onError(error instanceof Error ? error.message : "The image could not be processed.");
          continue;
        }

        const { data, error } = await uploadFile("items", userId, normalizedFile, {
          profile: "item",
          operation: itemId ? "replace" : "create",
          targetId: itemId,
          capability: uploadCapability,
        });

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
    } finally {
      onUploadingChange?.(false);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
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
    <div className={styles.container} role="group" aria-labelledby="item-photos-label">
      <span id="item-photos-label" className={styles.label}>Photos</span>
      <p className={styles.hint}>
        Add up to {maxPhotos} photos. First photo will be the cover image.
      </p>
      {pendingUploads.some((pending) => pending.status === "uploading") && (
        <p role="status">Processing photo. Save will be available when it finishes.</p>
      )}

      <div className={styles.grid}>
        {photos.map((url, index) => (
          <div key={url} className={styles.photoItem}>
            <OptimizedImage
              src={url}
              alt={`Photo ${index + 1}`}
              width={120}
              height={120}
              className={styles.photo}
              sizes="120px"
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
            <Image
              src={pending.previewUrl}
              alt="Uploading..."
              width={120}
              height={120}
              sizes="120px"
              className={`${styles.photo} ${styles.photoUploading}`}
              unoptimized
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
