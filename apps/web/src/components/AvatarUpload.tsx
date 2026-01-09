"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  uploadFile,
  validateImageFile,
  getPathFromUrl,
} from "@/lib/storage";

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
    <div style={styles.container}>
      <div
        style={styles.avatarWrapper}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={name}
            width={100}
            height={100}
            style={styles.avatarImage}
            unoptimized={!!previewUrl}
          />
        ) : (
          <span style={styles.avatarInitial}>{getInitial(name)}</span>
        )}
        <div style={styles.overlay}>
          {uploading ? "Uploading..." : "Change Photo"}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={uploading}
      />
      <p style={styles.hint}>Click to upload a profile photo</p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  avatarWrapper: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  avatarInitial: {
    fontSize: "2.5rem",
    fontWeight: "600",
    color: "#3730a3",
  },
  overlay: {
    position: "absolute",
    inset: "0",
    backgroundColor: "rgba(0,0,0,0.5)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    opacity: 0,
    transition: "opacity 0.2s",
  },
  hint: {
    marginTop: "0.5rem",
    fontSize: "0.75rem",
    color: "#666",
  },
};
