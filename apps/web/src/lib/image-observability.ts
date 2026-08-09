import { logger } from "@/lib/logger";

export type ImageEventName =
  | "image_upload_normalized"
  | "image_upload_rejected"
  | "image_conversion_failed"
  | "image_orphan_cleanup"
  | "image_cleanup_failed"
  | "image_cleanup_skipped_referenced";

export interface ImageEvent {
  event: ImageEventName;
  [key: string]: unknown;
  profile?: string;
  bucket?: string;
  sourceFormat?: string;
  width?: number;
  height?: number;
  outputBytes?: number;
  latencyMs?: number;
  code?: string;
  path?: string;
}

const forbiddenKeys = ["buffer", "file", "image", "contents", "exif", "capability", "metadata"];

export function recordImageEvent(event: ImageEvent): void {
  const safe = Object.fromEntries(Object.entries(event).filter(([key]) => !forbiddenKeys.includes(key)));
  logger.info(event.event, safe);
}
