export type ImageProfile = "avatar" | "gallery" | "post" | "item";
export type ImageResource = "avatar" | "gallery" | "post" | "item";
export type ImageOperation = "create" | "replace";

export interface ImageProfileConfig {
  profile: ImageProfile;
  resource: ImageResource;
  bucket: "avatars" | "posts" | "items";
  maxLongestEdge: number;
  initialQuality: number;
  qualityFloor: number;
  targetBytes: number;
  maxRequestBytes: number;
  maxOutputBytes: number;
  maxDecodedPixels: number;
}

export const IMAGE_PROFILES: Record<ImageProfile, ImageProfileConfig> = {
  avatar: {
    profile: "avatar",
    resource: "avatar",
    bucket: "avatars",
    maxLongestEdge: 512,
    initialQuality: 0.88,
    qualityFloor: 0.76,
    targetBytes: 400 * 1024,
    maxRequestBytes: 12 * 1024 * 1024,
    maxOutputBytes: 400 * 1024,
    maxDecodedPixels: 40_000_000,
  },
  gallery: {
    profile: "gallery",
    resource: "gallery",
    bucket: "avatars",
    maxLongestEdge: 1600,
    initialQuality: 0.9,
    qualityFloor: 0.78,
    targetBytes: 2_000 * 1024,
    maxRequestBytes: 15 * 1024 * 1024,
    maxOutputBytes: 2_000 * 1024,
    maxDecodedPixels: 50_000_000,
  },
  post: {
    profile: "post",
    resource: "post",
    bucket: "posts",
    maxLongestEdge: 1920,
    initialQuality: 0.88,
    qualityFloor: 0.76,
    targetBytes: 2_500 * 1024,
    maxRequestBytes: 20 * 1024 * 1024,
    maxOutputBytes: 2_500 * 1024,
    maxDecodedPixels: 60_000_000,
  },
  item: {
    profile: "item",
    resource: "item",
    bucket: "items",
    maxLongestEdge: 1600,
    initialQuality: 0.9,
    qualityFloor: 0.78,
    targetBytes: 2_000 * 1024,
    maxRequestBytes: 15 * 1024 * 1024,
    maxOutputBytes: 2_000 * 1024,
    maxDecodedPixels: 50_000_000,
  },
};

export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

export const IMAGE_ERROR_MESSAGES = {
  unsupportedType: "Please select a JPEG, PNG, or WebP image.",
  gifRejected: "GIF images are not supported for new uploads.",
  malformed: "That image could not be read. Please choose another image.",
  tooLarge: "That image is too large to upload.",
  outputTooLarge: "That image could not be compressed enough. Please choose a smaller image.",
  conversionUnavailable: "This browser could not convert the image to WebP. Please try another browser.",
  cancelled: "Image processing was cancelled.",
} as const;

export function getImageProfile(profile: ImageProfile): ImageProfileConfig {
  return IMAGE_PROFILES[profile];
}

export function isImageProfile(value: unknown): value is ImageProfile {
  return typeof value === "string" && value in IMAGE_PROFILES;
}

export function isAcceptedImageMimeType(value: string): value is AcceptedImageMimeType {
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function validateImageInput(file: Pick<File, "type" | "size">, profile: ImageProfile): string | null {
  if (file.type === "image/gif") return IMAGE_ERROR_MESSAGES.gifRejected;
  if (!isAcceptedImageMimeType(file.type)) return IMAGE_ERROR_MESSAGES.unsupportedType;
  if (file.size > getImageProfile(profile).maxRequestBytes) return IMAGE_ERROR_MESSAGES.tooLarge;
  return null;
}

export function getWebpFilename(filename: string, suffix = "normalized"): string {
  const basename = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "image";
  return `${basename}-${suffix}.webp`;
}

export function getOutputDimensions(width: number, height: number, maxLongestEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxLongestEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
