"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  uploadFile,
  deleteFile,
  validateImageFile,
  getPathFromUrl,
} from "@/lib/storage";
import styles from "./ProfileGalleryUpload.module.css";

const MAX_PHOTOS = 6;

interface ProfileGalleryUploadProps {
  userId: string;
  photoUrls: string[];
  onPhotosChange: (urls: string[]) => void;
  onError: (message: string) => void;
}

function GalleryImage({ url, index }: { url: string; index: number }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <div className={styles.skeleton} />}
      <Image
        src={url}
        alt={`Gallery photo ${index + 1}`}
        width={120}
        height={120}
        className={`${styles.photo} ${isLoading ? styles.photoHidden : ""}`}
        onLoad={() => setIsLoading(false)}
      />
    </>
  );
}

export function ProfileGalleryUpload({
  userId,
  photoUrls,
  onPhotosChange,
  onError,
}: ProfileGalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoUrls.length >= MAX_PHOTOS) {
      onError(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }

    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      onError(validation.error!);
      return;
    }

    setUploading(true);

    // Use gallery subfolder within avatars bucket
    const timestamp = Date.now();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const customFile = new File([file], `gallery_${timestamp}.${ext}`, {
      type: file.type,
    });

    const { data, error } = await uploadFile("avatars", userId, customFile);

    if (error) {
      onError(error.message);
    } else if (data) {
      onPhotosChange([...photoUrls, data.url]);
    }

    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const url = photoUrls[index];
    const path = getPathFromUrl(url, "avatars");

    if (path) {
      await deleteFile("avatars", path);
    }

    const updated = photoUrls.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  const canAddMore = photoUrls.length < MAX_PHOTOS;

  return (
    <div className={styles.container}>
      <label className={styles.label}>Photos</label>
      <span className={styles.hint}>
        Share photos of your family, pets, garden, or home (up to {MAX_PHOTOS})
      </span>

      <div className={styles.grid}>
        {photoUrls.map((url, index) => (
          <div key={url} className={styles.photoWrapper}>
            <GalleryImage url={url} index={index} />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className={styles.removeButton}
              aria-label="Remove photo"
            >
              &times;
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={styles.addButton}
          >
            {uploading ? (
              <span className={styles.uploading}>Uploading...</span>
            ) : (
              <>
                <span className={styles.addIcon}>+</span>
                <span>Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

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
