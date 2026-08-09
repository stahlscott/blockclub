import type { ImageOperation, ImageProfile } from "./image-profiles";

export interface UploadResult {
  url: string;
  path: string;
  profile?: ImageProfile;
  width?: number;
  height?: number;
  bytes?: number;
  format?: "image/webp";
}

export interface UploadError {
  message: string;
  code?: string;
}

export async function requestImageUploadCapability(
  profile: ImageProfile,
  neighborhoodSlug: string,
): Promise<{ capability: string | null; error: UploadError | null }> {
  try {
    const response = await fetch("/api/uploads/images", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ profile, operation: "create", neighborhoodSlug }),
    });
    const payload = (await response.json()) as { data?: { capability?: string }; error?: { message?: string; code?: string } };
    if (!response.ok || !payload.data?.capability) {
      return { capability: null, error: { message: payload.error?.message || "The image upload could not be authorized.", code: payload.error?.code } };
    }
    return { capability: payload.data.capability, error: null };
  } catch (error) {
    return { capability: null, error: { message: error instanceof Error ? error.message : "The image upload could not be authorized." } };
  }
}

export interface UploadRequestOptions {
  profile: ImageProfile;
  operation?: ImageOperation;
  targetId?: string;
  capability?: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

interface UploadApiResponse {
  data?: UploadResult;
  error?: { message?: string; code?: string };
}

/** Upload through the server-authoritative image normalization boundary. */
export async function uploadFile(
  _bucket: "avatars" | "items" | "posts",
  _userId: string,
  file: File,
  options: UploadRequestOptions = { profile: "post" },
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  const formData = new FormData();
  formData.set("profile", options.profile);
  formData.set("operation", options.operation ?? "create");
  if (options.targetId) formData.set("targetId", options.targetId);
  if (options.capability) formData.set("capability", options.capability);
  formData.set("file", file, file.name);
  options.onProgress?.(0);

  try {
    const response = await fetch("/api/uploads/images", {
      method: "POST",
      body: formData,
      signal: options.signal,
      credentials: "same-origin",
    });
    const payload = (await response.json()) as UploadApiResponse;
    if (!response.ok || !payload.data) {
      return { data: null, error: { message: payload.error?.message || "The image could not be uploaded.", code: payload.error?.code } };
    }
    options.onProgress?.(1);
    return { data: payload.data, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : "The image could not be uploaded." } };
  }
}

/** Delete through the same server-authorized boundary used for uploads. */
export async function deleteFile(
  bucket: "avatars" | "items" | "posts",
  path: string,
): Promise<{ error: UploadError | null }> {
  try {
    const response = await fetch("/api/uploads/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ bucket, path }),
    });
    const payload = (await response.json()) as UploadApiResponse;
    return response.ok ? { error: null } : { error: { message: payload.error?.message || "The image could not be removed.", code: payload.error?.code } };
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : "The image could not be removed." } };
  }
}

/**
 * Extract storage path from public URL
 */
export function isAllowedStorageImageUrl(
  value: string | null | undefined,
  storageOrigin: string,
  bucket: "avatars" | "items" | "posts" = "posts",
): boolean {
  if (!value) return true;

  try {
    const url = new URL(value);
    const origin = new URL(storageOrigin).origin;
    return (
      url.origin === origin &&
      (url.protocol === "https:" || new URL(storageOrigin).protocol === "http:") &&
      url.pathname.startsWith(`/storage/v1/object/public/${bucket}/`) &&
      url.pathname.length > `/storage/v1/object/public/${bucket}/`.length
    );
  } catch {
    return false;
  }
}

export function getPathFromUrl(
  url: string,
  bucket: "avatars" | "items" | "posts"
): string | null {
  const match = url.match(
    new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`)
  );
  return match ? match[1] : null;
}

/**
 * Validate image file type and size
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];

  if (file.type === "image/gif") {
    return { valid: false, error: "GIF images are not supported for new uploads." };
  }
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Please select a JPEG, PNG, or WebP image",
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `Image must be less than ${maxSizeMB}MB` };
  }

  return { valid: true };
}
