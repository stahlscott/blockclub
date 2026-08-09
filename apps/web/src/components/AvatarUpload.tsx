"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { uploadFile, validateImageFile } from "@/lib/storage";
import { normalizeImage } from "@/lib/image-normalization";
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

    setUploading(true);
    setImageLoading(true);
    let normalizedFile: File;
    try {
      const normalized = await normalizeImage(file, "avatar", { useWebWorker: true });
      normalizedFile = normalized.file;
      setPreviewUrl(URL.createObjectURL(normalizedFile));
    } catch (error) {
      setUploading(false);
      onError(error instanceof Error ? error.message : "The image could not be processed.");
      return;
    }

    const { data, error } = await uploadFile("avatars", userId, normalizedFile, {
      profile: "avatar",
      operation: "replace",
      targetId: userId,
    });

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
      <button
        type="button"
        className={styles.avatarWrapper}
        onClick={() => !uploading && fileInputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile photo"
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
              sizes="100px"
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
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        aria-label="Upload profile photo"
        className={styles.hiddenInput}
        disabled={uploading}
      />
      <p className={styles.hint}>Click to upload a profile photo</p>
    </div>
  );
}
