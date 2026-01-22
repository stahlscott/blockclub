"use client";

import { useState, useRef } from "react";
import { OptimizedImage } from "./OptimizedImage";
import {
  uploadFile,
  deleteFile,
  validateImageFile,
  getPathFromUrl,
} from "@/lib/storage";
import styles from "./PostImageUpload.module.css";

interface PostImageUploadProps {
  userId: string;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  onError: (message: string) => void;
}

export function PostImageUpload({
  userId,
  imageUrl,
  onImageChange,
  onError,
}: PostImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      onError(validation.error!);
      return;
    }

    setUploading(true);

    const { data, error } = await uploadFile("posts", userId, file);

    if (error) {
      onError(error.message);
      setUploading(false);
    } else if (data) {
      onImageChange(data.url);
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!imageUrl) return;

    const path = getPathFromUrl(imageUrl, "posts");
    if (path) {
      await deleteFile("posts", path);
    }

    onImageChange(null);
  };

  return (
    <div className={styles.container} role="group" aria-labelledby="post-image-label">
      <span id="post-image-label" className={styles.label}>Photo (optional)</span>

      {imageUrl ? (
        <div className={styles.preview}>
          <OptimizedImage
            src={imageUrl}
            alt="Post image"
            width={200}
            height={200}
            className={styles.image}
            borderRadius="var(--radius-md)"
          />
          <button
            type="button"
            onClick={handleRemove}
            className={styles.removeButton}
            title="Remove image"
          >
            x
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={styles.addButton}
        >
          {uploading ? (
            <span>Uploading...</span>
          ) : (
            <>
              <span className={styles.addIcon}>+</span>
              <span>Add Photo</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className={styles.hiddenInput}
      />
    </div>
  );
}
