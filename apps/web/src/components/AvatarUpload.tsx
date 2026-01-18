"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  uploadFile,
  validateImageFile,
  getPathFromUrl,
} from "@/lib/storage";
import styles from "./AvatarUpload.module.css";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  name: string;
  onUploadComplete: (url: string) => void;
  onError: (message: string) => void;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  name,
  onUploadComplete,
  onError,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitial = (name: string) => {
    const stripped = name.replace(/^the\s+/i, "");
    return stripped.charAt(0)?.toUpperCase() || "?";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      onError(validation.error!);
      return;
    }

    // Show preview
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const existingPath = currentAvatarUrl
      ? getPathFromUrl(currentAvatarUrl, "avatars")
      : undefined;

    const { data, error } = await uploadFile(
      "avatars",
      userId,
      file,
      existingPath || undefined
    );

    setUploading(false);

    if (error) {
      setPreviewUrl(null);
      setImageLoading(false);
      onError(error.message);
      return;
    }

    if (data) {
      onUploadComplete(data.url);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={styles.container} data-testid="avatar-upload">
      <div
        className={styles.avatarWrapper}
        onClick={() => !uploading && fileInputRef.current?.click()}
        data-testid="avatar-upload-trigger"
      >
        {displayUrl ? (
          <>
            {imageLoading && <div className={styles.skeleton} />}
            <Image
              src={displayUrl}
              alt={name}
              width={100}
              height={100}
              className={`${styles.avatarImage} ${imageLoading ? styles.imageHidden : ""}`}
              unoptimized={!!previewUrl}
              onLoad={() => setImageLoading(false)}
            />
          </>
        ) : (
          <span className={styles.avatarInitial}>{getInitial(name)}</span>
        )}
        <div className={styles.overlay}>
          {uploading ? "Uploading..." : "Change Photo"}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className={styles.hiddenInput}
        disabled={uploading}
      />
      <p className={styles.hint}>Click to upload a profile photo</p>
    </div>
  );
}
