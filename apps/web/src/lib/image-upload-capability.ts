import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { ImageOperation, ImageProfile } from "./image-profiles";

const CAPABILITY_TTL_SECONDS = 10 * 60;
const CAPABILITY_VERSION = "image-upload-v1";

export interface ImageUploadCapabilityPayload {
  version: string;
  actorId: string;
  effectiveUserId: string;
  profile: ImageProfile;
  operation: ImageOperation;
  neighborhoodId: string;
  expiresAt: number;
  nonce: string;
}

function getSigningSecret(): string {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Image upload signing secret is not configured");
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", getSigningSecret()).update(value).digest("base64url");
}

export function issueImageUploadCapability(input: Omit<ImageUploadCapabilityPayload, "version" | "expiresAt" | "nonce">): string {
  const payload: ImageUploadCapabilityPayload = {
    ...input,
    version: CAPABILITY_VERSION,
    expiresAt: Math.floor(Date.now() / 1000) + CAPABILITY_TTL_SECONDS,
    nonce: randomUUID(),
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyImageUploadCapability(token: string): ImageUploadCapabilityPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const payload = JSON.parse(decode(encoded)) as ImageUploadCapabilityPayload;
    if (payload.version !== CAPABILITY_VERSION || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
