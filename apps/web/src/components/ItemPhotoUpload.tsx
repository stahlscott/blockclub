"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  uploadFile,
  deleteFile,
  validateImageFile,
  getPathFromUrl,
} from "@/lib/storage";

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
    <div style={styles.container}>
      <label style={styles.label}>Photos</label>
      <p style={styles.hint}>
        Add up to {maxPhotos} photos. First photo will be the cover image.
      </p>

      <div style={styles.grid}>
        {photos.map((url, index) => (
          <div key={url} style={styles.photoItem}>
            <Image
              src={url}
              alt={`Photo ${index + 1}`}
              width={120}
              height={120}
              style={styles.photo}
            />
            {index === 0 && <span style={styles.coverBadge}>Cover</span>}
            <div style={styles.photoActions}>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => handleMakeCover(index)}
                  style={styles.actionButton}
                  title="Make cover"
                >
                  *
                </button>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                style={styles.removeButton}
                title="Remove"
              >
                x
              </button>
            </div>
          </div>
        ))}

        {pendingUploads.map((pending) => (
          <div key={pending.id} style={styles.photoItem}>
            <img
              src={pending.previewUrl}
              alt="Uploading..."
              style={{ ...styles.photo, opacity: 0.5 }}
            />
            <div style={styles.uploadingOverlay}>
              {pending.status === "uploading" ? "Uploading..." : "Error"}
            </div>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={styles.addButton}
          >
            <span style={styles.addIcon}>+</span>
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
        style={{ display: "none" }}
      />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    marginBottom: "1.25rem",
  },
  label: {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: "500",
    marginBottom: "0.25rem",
  },
  hint: {
    fontSize: "0.75rem",
    color: "#666",
    marginBottom: "0.75rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: "0.75rem",
  },
  photoItem: {
    position: "relative",
    aspectRatio: "1",
    borderRadius: "8px",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  coverBadge: {
    position: "absolute",
    top: "4px",
    left: "4px",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "0.625rem",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  photoActions: {
    position: "absolute",
    top: "4px",
    right: "4px",
    display: "flex",
    gap: "4px",
  },
  actionButton: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "rgba(220,38,38,0.8)",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingOverlay: {
    position: "absolute",
    inset: "0",
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
  },
  addButton: {
    aspectRatio: "1",
    border: "2px dashed #ddd",
    borderRadius: "8px",
    backgroundColor: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.25rem",
    color: "#666",
    fontSize: "0.75rem",
  },
  addIcon: {
    fontSize: "1.5rem",
    lineHeight: 1,
  },
};
