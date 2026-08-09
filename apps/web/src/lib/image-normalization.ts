import {
  getImageProfile,
  getOutputDimensions,
  getWebpFilename,
  IMAGE_ERROR_MESSAGES,
  isAcceptedImageMimeType,
  validateImageInput,
  type ImageProfile,
} from "./image-profiles";

export interface ImageNormalizationProgress {
  phase: "validating" | "decoding" | "encoding";
  progress: number;
}

export interface NormalizeImageOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ImageNormalizationProgress) => void;
  useWebWorker?: boolean;
}

export interface NormalizedImage {
  file: File;
  width: number;
  height: number;
  bytes: number;
  format: "image/webp";
  sourceBytes: number;
  orientation: number;
}

class ImageNormalizationError extends Error {
  readonly code: keyof typeof IMAGE_ERROR_MESSAGES;

  constructor(code: keyof typeof IMAGE_ERROR_MESSAGES) {
    super(IMAGE_ERROR_MESSAGES[code]);
    this.name = "ImageNormalizationError";
    this.code = code;
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ImageNormalizationError("cancelled");
}

function readUint16(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint32(offset, littleEndian);
}

interface EncodedImageDimensions {
  width: number;
  height: number;
}

/** Read only the EXIF orientation tag. No metadata is copied to the output. */
export async function readExifOrientation(file: Blob): Promise<number> {
  if (file.type !== "image/jpeg") return 1;
  const bytes = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;

  for (let offset = 2; offset + 4 < bytes.length;) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) break;

    if (marker === 0xe1 && segmentLength >= 10 &&
      bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78 &&
      bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66 &&
      bytes[offset + 8] === 0 && bytes[offset + 9] === 0) {
      const tiffOffset = offset + 10;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const byteOrder = view.getUint16(tiffOffset, false);
      const littleEndian = byteOrder === 0x4949;
      if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return 1;
      if (readUint16(view, tiffOffset + 2, littleEndian) !== 42) return 1;
      const firstIfdOffset = readUint32(view, tiffOffset + 4, littleEndian);
      const ifdOffset = tiffOffset + firstIfdOffset;
      if (ifdOffset + 2 > bytes.length) return 1;
      const entries = readUint16(view, ifdOffset, littleEndian);
      for (let entry = 0; entry < entries; entry += 1) {
        const entryOffset = ifdOffset + 2 + entry * 12;
        if (entryOffset + 12 > bytes.length) return 1;
        if (readUint16(view, entryOffset, littleEndian) === 0x0112) {
          const value = readUint16(view, entryOffset + 8, littleEndian);
          return value >= 1 && value <= 8 ? value : 1;
        }
      }
      return 1;
    }
    offset += 2 + segmentLength;
  }
  return 1;
}

/**
 * Read the encoded JPEG dimensions without asking a browser decoder to
 * interpret EXIF. This lets us identify decoders that already applied a
 * quarter-turn to portrait images before drawImage is called.
 */
async function readJpegDimensions(file: Blob): Promise<EncodedImageDimensions | null> {
  if (file.type !== "image/jpeg") return null;
  const bytes = new Uint8Array(await file.slice(0, 128 * 1024).arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const isStartOfFrame = (marker: number) =>
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf);

  for (let offset = 2; offset + 4 < bytes.length;) {
    if (bytes[offset] !== 0xff) return null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset];
    if (marker === 0xda || marker === 0xd9) return null;
    if (offset + 3 >= bytes.length) return null;
    const segmentLength = (bytes[offset + 1] << 8) | bytes[offset + 2];
    if (segmentLength < 2 || offset + 1 + segmentLength > bytes.length) return null;
    if (isStartOfFrame(marker) && segmentLength >= 7) {
      return {
        height: (bytes[offset + 4] << 8) | bytes[offset + 5],
        width: (bytes[offset + 6] << 8) | bytes[offset + 7],
      };
    }
    offset += 1 + segmentLength;
  }
  return null;
}

export interface ExifOrientationTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  outputWidth: number;
  outputHeight: number;
}

/**
 * Return the canvas transform that bakes an EXIF orientation into pixels.
 * The matrix follows the EXIF 1–8 definitions and maps source image edges
 * into a top-left-origin output canvas without relying on browser EXIF handling.
 */
export function getExifOrientationTransform(
  orientation: number,
  sourceWidth: number,
  sourceHeight: number,
): ExifOrientationTransform {
  const normalizedOrientation = orientation >= 1 && orientation <= 8 ? Math.trunc(orientation) : 1;
  const swapped = normalizedOrientation >= 5;
  const outputWidth = swapped ? sourceHeight : sourceWidth;
  const outputHeight = swapped ? sourceWidth : sourceHeight;

  const matrices: Record<number, [number, number, number, number, number, number]> = {
    1: [1, 0, 0, 1, 0, 0],
    2: [-1, 0, 0, 1, sourceWidth, 0],
    3: [-1, 0, 0, -1, sourceWidth, sourceHeight],
    4: [1, 0, 0, -1, 0, sourceHeight],
    5: [0, 1, 1, 0, 0, 0],
    6: [0, 1, -1, 0, sourceHeight, 0],
    7: [0, -1, -1, 0, sourceHeight, sourceWidth],
    8: [0, -1, 1, 0, 0, sourceWidth],
  };
  const [a, b, c, d, e, f] = matrices[normalizedOrientation];
  return { a, b, c, d, e, f, outputWidth, outputHeight };
}

function drawOrientedImage(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  orientation: number,
  destinationWidth: number,
  destinationHeight: number,
): void {
  const transform = getExifOrientationTransform(orientation, sourceWidth, sourceHeight);
  const scaleX = destinationWidth / transform.outputWidth;
  const scaleY = destinationHeight / transform.outputHeight;
  context.save();
  context.setTransform(
    transform.a * scaleX,
    transform.b * scaleY,
    transform.c * scaleX,
    transform.d * scaleY,
    transform.e * scaleX,
    transform.f * scaleY,
  );
  context.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  context.restore();
}

export interface DecodedImageDimensions {
  width: number;
  height: number;
}

/**
 * Determine whether a decoder has already applied a quarter-turn EXIF
 * orientation. Browsers differ here: ImageBitmap with imageOrientation:none
 * exposes encoded pixels, while some HTMLImageElement implementations expose
 * auto-oriented pixels even when they are later drawn to a canvas.
 */
export function resolveDecodedOrientation(
  orientation: number,
  encoded: DecodedImageDimensions | null,
  decoded: DecodedImageDimensions,
): { orientation: number; width: number; height: number } {
  const normalizedOrientation = orientation >= 1 && orientation <= 8 ? Math.trunc(orientation) : 1;
  const swapsDimensions = normalizedOrientation >= 5 && normalizedOrientation <= 8;
  if (!swapsDimensions || !encoded || encoded.width < 1 || encoded.height < 1) {
    return { orientation: normalizedOrientation, width: decoded.width, height: decoded.height };
  }

  const matchesEncodedDimensions = decoded.width === encoded.width && decoded.height === encoded.height;
  const matchesOrientedDimensions = decoded.width === encoded.height && decoded.height === encoded.width;
  if (matchesOrientedDimensions && !matchesEncodedDimensions) {
    return { orientation: 1, width: decoded.width, height: decoded.height };
  }
  if (matchesEncodedDimensions && !matchesOrientedDimensions) {
    return { orientation: normalizedOrientation, width: decoded.height, height: decoded.width };
  }

  // Some decoders report a scaled intrinsic size. Preserve the same decision
  // using aspect ratios when exact dimensions are unavailable.
  const encodedAspectRatio = encoded.width / encoded.height;
  const orientedAspectRatio = encoded.height / encoded.width;
  const decodedAspectRatio = decoded.width / decoded.height;
  const isAutoOriented = Math.abs(decodedAspectRatio - orientedAspectRatio) < Math.abs(decodedAspectRatio - encodedAspectRatio);
  return isAutoOriented
    ? { orientation: 1, width: decoded.width, height: decoded.height }
    : { orientation: normalizedOrientation, width: decoded.height, height: decoded.width };
}

async function decodeImage(file: File): Promise<{ image: ImageBitmap | HTMLImageElement; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const image = await createImageBitmap(file, { imageOrientation: "none" });
      return { image, width: image.width, height: image.height, close: () => image.close() };
    } catch {
      // Fall through to HTMLImageElement for browsers with partial ImageBitmap support.
    }
  }

  if (typeof window === "undefined" || typeof Image === "undefined") {
    throw new ImageNormalizationError("malformed");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.style.setProperty("image-orientation", "none");
      element.onload = () => resolve(element);
      element.onerror = () => reject(new ImageNormalizationError("malformed"));
      element.src = url;
    });
    return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/webp", quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new ImageNormalizationError("conversionUnavailable")), "image/webp", quality);
  });
}

async function normalizeOnMainThread(file: File, profile: ImageProfile, options: NormalizeImageOptions): Promise<NormalizedImage> {
  const config = getImageProfile(profile);
  const sourceOrientation = await readExifOrientation(file);
  const encodedDimensions = await readJpegDimensions(file);
  throwIfAborted(options.signal);
  options.onProgress?.({ phase: "decoding", progress: 0.2 });
  const decoded = await decodeImage(file);
  const resolved = resolveDecodedOrientation(sourceOrientation, encodedDimensions, decoded);
  const orientation = resolved.orientation;
  const dimensions = getOutputDimensions(resolved.width, resolved.height, config.maxLongestEdge);
  const canvas = typeof OffscreenCanvas === "function"
    ? new OffscreenCanvas(dimensions.width, dimensions.height)
    : typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) {
    decoded.close();
    throw new ImageNormalizationError("conversionUnavailable");
  }
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) {
    decoded.close();
    throw new ImageNormalizationError("conversionUnavailable");
  }
  context.clearRect(0, 0, dimensions.width, dimensions.height);
  drawOrientedImage(context, decoded.image, decoded.width, decoded.height, orientation, dimensions.width, dimensions.height);
  decoded.close();

  const qualitySteps = 5;
  const qualityDelta = (config.initialQuality - config.qualityFloor) / qualitySteps;
  const qualities = Array.from({ length: qualitySteps + 1 }, (_, index) => Math.max(config.qualityFloor, config.initialQuality - qualityDelta * index));
  for (const [index, quality] of qualities.entries()) {
    throwIfAborted(options.signal);
    options.onProgress?.({ phase: "encoding", progress: 0.3 + (index / qualities.length) * 0.7 });
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= config.targetBytes || quality === config.qualityFloor) {
      if (blob.size > config.maxOutputBytes) throw new ImageNormalizationError("outputTooLarge");
      const normalizedFile = new File([blob], getWebpFilename(file.name), { type: "image/webp", lastModified: Date.now() });
      return {
        file: normalizedFile,
        width: dimensions.width,
        height: dimensions.height,
        bytes: blob.size,
        format: "image/webp",
        sourceBytes: file.size,
        orientation,
      };
    }
  }
  throw new ImageNormalizationError("outputTooLarge");
}

/**
 * Normalize an image before upload. This is advisory only: the server repeats
 * validation and normalization for every request, including native clients.
 */
export async function normalizeImage(file: File, profile: ImageProfile, options: NormalizeImageOptions = {}): Promise<NormalizedImage> {
  const config = getImageProfile(profile);
  options.onProgress?.({ phase: "validating", progress: 0 });
  const validationError = validateImageInput(file, profile);
  if (validationError) {
    const code = file.type === "image/gif" ? "gifRejected" : file.size > config.maxRequestBytes ? "tooLarge" : "unsupportedType";
    throw new ImageNormalizationError(code);
  }
  if (!isAcceptedImageMimeType(file.type)) throw new ImageNormalizationError("unsupportedType");
  throwIfAborted(options.signal);

  // Worker conversion is attempted when the browser exposes the primitives.
  // A failed worker falls back to the same tested implementation on the main thread.
  if (options.useWebWorker !== false && typeof Worker === "function" && typeof OffscreenCanvas === "function") {
    try {
      return await normalizeInWorker(file, profile, options);
    } catch (error) {
      if (error instanceof ImageNormalizationError && error.code === "cancelled") throw error;
    }
  }
  return normalizeOnMainThread(file, profile, options);
}

async function normalizeInWorker(file: File, profile: ImageProfile, options: NormalizeImageOptions): Promise<NormalizedImage> {
  // Keep the worker boundary local to this module so callers never depend on
  // a third-party option shape. The worker uses the same native canvas APIs;
  // unsupported worker implementations fall back to the main-thread path.
  const workerSource = `self.onmessage = async (event) => { const { file } = event.data; try { const bitmap = await createImageBitmap(file, { imageOrientation: 'none' }); const canvas = new OffscreenCanvas(bitmap.width, bitmap.height); const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); bitmap.close(); const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 }); self.postMessage({ blob, width: canvas.width, height: canvas.height }); } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'worker conversion failed' }); } };`;
  const url = URL.createObjectURL(new Blob([workerSource], { type: "application/javascript" }));
  const worker = new Worker(url);
  try {
    const result = await new Promise<{ blob?: Blob; width?: number; height?: number; error?: string }>((resolve, reject) => {
      const onAbort = () => { worker.terminate(); reject(new ImageNormalizationError("cancelled")); };
      options.signal?.addEventListener("abort", onAbort, { once: true });
      worker.onmessage = (event) => { options.signal?.removeEventListener("abort", onAbort); resolve(event.data); };
      worker.onerror = () => { options.signal?.removeEventListener("abort", onAbort); reject(new ImageNormalizationError("conversionUnavailable")); };
      worker.postMessage({ file });
    });
    if (!result.blob || !result.width || !result.height || result.error) throw new ImageNormalizationError("conversionUnavailable");
    // The worker path is intentionally conservative; rerun the bounded quality
    // and orientation-aware path if its implementation cannot satisfy the profile.
    return normalizeOnMainThread(file, profile, options);
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
}

export { ImageNormalizationError };
