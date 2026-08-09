import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type ImageBucket = "avatars" | "items" | "posts";

export function isCanonicalImagePath(path: string, bucket: ImageBucket, ownerId?: string): boolean {
  const parts = path.split("/");
  return parts.length === 2 && (!ownerId || parts[0] === ownerId) && parts[1].endsWith(".webp") && ["avatars", "items", "posts"].includes(bucket);
}

export async function isImageReferenceUnclaimed(bucket: ImageBucket, path: string): Promise<boolean> {
  const admin = createAdminClient();
  const publicUrl = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const [{ data: users }, { data: posts }, { data: items }] = await Promise.all([
    admin.from("users").select("avatar_url, photo_urls"),
    admin.from("posts").select("image_url"),
    admin.from("items").select("photo_urls"),
  ]);
  const referenced = [
    ...(users ?? []).flatMap((row) => [row.avatar_url, ...(row.photo_urls ?? [])]),
    ...(posts ?? []).map((row) => row.image_url),
    ...(items ?? []).flatMap((row) => row.photo_urls ?? []),
  ].includes(publicUrl);
  return !referenced;
}

export async function cleanupImageUrl(bucket: ImageBucket, url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  const match = url.match(new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`));
  return match ? cleanupUnreferencedImage(bucket, match[1]) : false;
}

export async function cleanupUnreferencedImage(bucket: ImageBucket, path: string): Promise<boolean> {
  if (!isCanonicalImagePath(path, bucket)) return false;
  if (!(await isImageReferenceUnclaimed(bucket, path))) {
    logger.warn("image_cleanup_skipped_referenced", { bucket, path });
    return false;
  }
  const { error } = await createAdminClient().storage.from(bucket).remove([path]);
  if (error) {
    logger.error("image_cleanup_failed", error, { bucket, path });
    return false;
  }
  logger.info("image_orphan_cleanup", { bucket, path });
  return true;
}
