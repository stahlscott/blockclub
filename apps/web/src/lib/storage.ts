import { createClient } from "@/lib/supabase/client";

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadError {
  message: string;
}

/**
 * Upload a file to Supabase storage
 * @param bucket - 'avatars' or 'items'
 * @param userId - User ID (used as folder name)
 * @param file - File to upload
 * @param existingPath - Optional path of file to delete before upload
 */
export async function uploadFile(
  bucket: "avatars" | "items" | "posts",
  userId: string,
  file: File,
  existingPath?: string
): Promise<{ data: UploadResult | null; error: UploadError | null }> {
  const supabase = createClient();

  // Generate unique filename with timestamp
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const filename = `${timestamp}.${ext}`;
  const path = `${userId}/${filename}`;

  // Delete existing file if replacing
  if (existingPath) {
    await supabase.storage.from(bucket).remove([existingPath]);
  }

  // Upload new file
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: { message: uploadError.message } };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { data: { url: publicUrl, path }, error: null };
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFile(
  bucket: "avatars" | "items" | "posts",
  path: string
): Promise<{ error: UploadError | null }> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error ? { message: error.message } : null };
}

/**
 * Extract storage path from public URL
 */
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
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Please select a JPEG, PNG, WebP, or GIF image",
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `Image must be less than ${maxSizeMB}MB` };
  }

  return { valid: true };
}
