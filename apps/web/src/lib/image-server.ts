import sharp from "sharp";

import {
  getImageProfile,
  getOutputDimensions,
  IMAGE_ERROR_MESSAGES,
  isImageProfile,
  type ImageProfile,
} from "./image-profiles";

export interface ServerNormalizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
  format: "image/webp";
  pages: number;
  hasAlpha: boolean;
  sourceFormat: string;
  orientation: number;
}

export class ImageServerError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ImageServerError";
    this.code = code;
    this.status = status;
  }
}

export function assertImageProfile(value: string | null): ImageProfile {
  if (!value || !isImageProfile(value)) throw new ImageServerError("INVALID_PROFILE", "The image profile is invalid.");
  return value;
}

export async function normalizeServerImage(input: Buffer, profile: ImageProfile): Promise<ServerNormalizedImage> {
  const config = getImageProfile(profile);
  if (input.byteLength > config.maxRequestBytes) throw new ImageServerError("REQUEST_TOO_LARGE", IMAGE_ERROR_MESSAGES.tooLarge, 413);

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(input, { failOn: "error", animated: true }).metadata();
  } catch {
    throw new ImageServerError("MALFORMED_IMAGE", IMAGE_ERROR_MESSAGES.malformed);
  }

  const sourceFormat = metadata.format || "unknown";
  if (sourceFormat === "gif") throw new ImageServerError("GIF_REJECTED", IMAGE_ERROR_MESSAGES.gifRejected);
  if (!["jpeg", "png", "webp"].includes(sourceFormat)) throw new ImageServerError("UNSUPPORTED_FORMAT", IMAGE_ERROR_MESSAGES.unsupportedType);
  if (!metadata.width || !metadata.height || metadata.width < 1 || metadata.height < 1) throw new ImageServerError("MALFORMED_IMAGE", IMAGE_ERROR_MESSAGES.malformed);
  const decodedPixels = metadata.width * metadata.height;
  if (decodedPixels > config.maxDecodedPixels) throw new ImageServerError("PIXELS_TOO_LARGE", "That image has too many pixels to process.", 413);
  if ((metadata.pages ?? 1) > 1 || metadata.pageHeight && metadata.pages && metadata.pages > 1) {
    throw new ImageServerError("ANIMATED_IMAGE", "Animated and multi-page images are not supported for new uploads.");
  }

  const orientation = metadata.orientation ?? 1;
  const orientedWidth = orientation >= 5 && orientation <= 8 ? metadata.height : metadata.width;
  const orientedHeight = orientation >= 5 && orientation <= 8 ? metadata.width : metadata.height;
  const dimensions = getOutputDimensions(orientedWidth, orientedHeight, config.maxLongestEdge);
  const isNormalizedWebp = sourceFormat === "webp" && metadata.width === dimensions.width && metadata.height === dimensions.height && !metadata.exif && !metadata.iptc && !metadata.xmp && !metadata.orientation;

  try {
    const pipeline = sharp(input, { failOn: "error", animated: false });
    const output = isNormalizedWebp
      ? await pipeline.toBuffer({ resolveWithObject: true })
      : await pipeline.rotate().resize({ width: dimensions.width, height: dimensions.height, fit: "inside", withoutEnlargement: true }).webp({ quality: Math.round(config.initialQuality * 100), effort: 4 }).toBuffer({ resolveWithObject: true });
    const outputMetadata = await sharp(output.data).metadata();
    if (outputMetadata.pages && outputMetadata.pages > 1) throw new ImageServerError("ANIMATED_IMAGE", "Animated and multi-page images are not supported for new uploads.");
    if (output.data.byteLength > config.maxOutputBytes) {
      const qualities = [config.initialQuality, Math.max(config.qualityFloor, config.initialQuality - 0.06), config.qualityFloor];
      const compressed = await qualities.reduce<Promise<{ data: Buffer; info: sharp.OutputInfo } | null>>(async (previousPromise, quality) => {
        const previous = await previousPromise;
        if (previous && previous.data.byteLength <= config.maxOutputBytes) return previous;
        const candidate = await sharp(input, { failOn: "error" }).rotate().resize({ width: dimensions.width, height: dimensions.height, fit: "inside", withoutEnlargement: true }).webp({ quality: Math.round(quality * 100), effort: 4 }).toBuffer({ resolveWithObject: true });
        return candidate.data.byteLength <= config.maxOutputBytes || quality === config.qualityFloor ? candidate : null;
      }, Promise.resolve(null));
      if (!compressed || compressed.data.byteLength > config.maxOutputBytes) throw new ImageServerError("OUTPUT_TOO_LARGE", IMAGE_ERROR_MESSAGES.outputTooLarge);
      return {
        buffer: compressed.data,
        width: compressed.info.width,
        height: compressed.info.height,
        bytes: compressed.data.byteLength,
        format: "image/webp",
        pages: 1,
        hasAlpha: Boolean(outputMetadata.hasAlpha),
        sourceFormat,
        orientation,
      };
    }
    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.height,
      bytes: output.data.byteLength,
      format: "image/webp",
      pages: 1,
      hasAlpha: Boolean(outputMetadata.hasAlpha),
      sourceFormat,
      orientation,
    };
  } catch (error) {
    if (error instanceof ImageServerError) throw error;
    throw new ImageServerError("CONVERSION_FAILED", "That image could not be converted to WebP.", 422);
  }
}
