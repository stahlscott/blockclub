import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { getPathFromUrl } from "@/lib/storage";
import { getImageProfile, type ImageOperation, type ImageProfile } from "@/lib/image-profiles";
import { issueImageUploadCapability, verifyImageUploadCapability } from "@/lib/image-upload-capability";
import { assertImageProfile, ImageServerError, normalizeServerImage } from "@/lib/image-server";
import { cleanupUnreferencedImage, isCanonicalImagePath, type ImageBucket } from "@/lib/image-reference-safety";

export const runtime = "nodejs";

const BUCKETS = ["avatars", "items", "posts"] as const;
type Bucket = (typeof BUCKETS)[number];

interface AuthorizedUpload {
  profile: ImageProfile;
  operation: ImageOperation;
  bucket: Bucket;
  ownerId: string;
  targetId: string | null;
  oldPath: string | null;
}

function jsonError(error: unknown, fallback = "The image upload could not be completed.") {
  if (error instanceof ImageServerError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  logger.error("Image upload route failed", error);
  return NextResponse.json({ error: { code: "UPLOAD_FAILED", message: fallback } }, { status: 500 });
}

function profileToBucket(profile: ImageProfile): Bucket {
  return getImageProfile(profile).bucket;
}

function parseOperation(value: FormDataEntryValue | null): ImageOperation {
  return value === "replace" ? "replace" : "create";
}

async function authorizeUpload(request: Request, profile: ImageProfile, operation: ImageOperation, targetId: string | null, capability: string | null): Promise<AuthorizedUpload> {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new ImageServerError("UNAUTHENTICATED", "You must be signed in.", 401);
  const auth = await getAuthContext(supabase, authUser);
  const bucket = profileToBucket(profile);

  if (profile === "avatar" || profile === "gallery") {
    if (targetId && targetId !== auth.effectiveUserId) throw new ImageServerError("FORBIDDEN", "You can only upload images for the effective profile.", 403);
    if (auth.isImpersonating && !auth.isStaffAdmin) throw new ImageServerError("FORBIDDEN", "You are not authorized to upload this profile image.", 403);
    return { profile, operation, bucket, ownerId: auth.effectiveUserId, targetId: auth.effectiveUserId, oldPath: null };
  }

  if (operation === "create") {
    if (!capability) throw new ImageServerError("CAPABILITY_REQUIRED", "This upload is not bound to an authorized create action.", 403);
    const payload = verifyImageUploadCapability(capability);
    if (!payload || payload.actorId !== authUser.id || payload.effectiveUserId !== auth.effectiveUserId || payload.profile !== profile || payload.operation !== operation) {
      throw new ImageServerError("INVALID_CAPABILITY", "This upload capability is invalid or expired.", 403);
    }
    const { data: membership } = await auth.queryClient.from("memberships").select("id").eq("neighborhood_id", payload.neighborhoodId).eq("user_id", auth.effectiveUserId).eq("status", "active").is("deleted_at", null).maybeSingle();
    if (!membership && !(auth.isStaffAdmin && !auth.isImpersonating)) throw new ImageServerError("FORBIDDEN", "You are not authorized to upload to this neighborhood.", 403);
    const admin = createAdminClient();
    const { data: consumed, error: consumeError } = await admin.rpc("consume_image_upload_capability", { p_nonce: payload.nonce, p_actor_id: authUser.id, p_effective_user_id: auth.effectiveUserId, p_profile: profile, p_operation: operation });
    if (consumeError || !consumed) throw new ImageServerError("INVALID_CAPABILITY", "This upload capability is invalid, expired, or already used.", 403);
    return { profile, operation, bucket, ownerId: auth.effectiveUserId, targetId: null, oldPath: null };
  }

  if (!targetId) throw new ImageServerError("TARGET_REQUIRED", "A replacement target is required.");
  if (profile === "post") {
    const { data: target } = await auth.queryClient.from("posts").select("id, author_id, neighborhood_id, image_url").eq("id", targetId).maybeSingle();
    if (!target || target.author_id !== auth.effectiveUserId) throw new ImageServerError("FORBIDDEN", "You are not authorized to replace this image.", 403);
    return { profile, operation, bucket, ownerId: auth.effectiveUserId, targetId, oldPath: target.image_url ? getPathFromUrl(target.image_url, bucket) : null };
  }
  const { data: target } = await auth.queryClient.from("items").select("id, owner_id, neighborhood_id, photo_urls").eq("id", targetId).maybeSingle();
  if (!target || target.owner_id !== auth.effectiveUserId) throw new ImageServerError("FORBIDDEN", "You are not authorized to replace this image.", 403);
  return { profile, operation, bucket, ownerId: auth.effectiveUserId, targetId, oldPath: target.photo_urls?.[0] ? getPathFromUrl(target.photo_urls[0], bucket) : null };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const formData = await request.formData();
    const profile = assertImageProfile(typeof formData.get("profile") === "string" ? formData.get("profile") as string : null);
    const operation = parseOperation(formData.get("operation"));
    const targetId = typeof formData.get("targetId") === "string" ? formData.get("targetId") as string : null;
    const capability = typeof formData.get("capability") === "string" ? formData.get("capability") as string : null;
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ImageServerError("FILE_REQUIRED", "An image file is required.");
    const config = getImageProfile(profile);
    if (file.size > config.maxRequestBytes) throw new ImageServerError("REQUEST_TOO_LARGE", "That image is too large to upload.", 413);
    const authorized = await authorizeUpload(request, profile, operation, targetId, capability);
    const normalized = await normalizeServerImage(Buffer.from(await file.arrayBuffer()), profile);
    const path = `${authorized.ownerId}/${randomUUID()}.webp`;
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from(authorized.bucket).upload(path, normalized.buffer, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (uploadError) throw new ImageServerError("STORAGE_UPLOAD_FAILED", "The normalized image could not be stored.", 502);
    const { data: publicUrl } = admin.storage.from(authorized.bucket).getPublicUrl(path);
    logger.info("image_upload_normalized", { profile, sourceFormat: normalized.sourceFormat, outputBytes: normalized.bytes, width: normalized.width, height: normalized.height, latencyMs: Date.now() - startedAt });
    return NextResponse.json({ data: { url: publicUrl.publicUrl, path, profile, width: normalized.width, height: normalized.height, bytes: normalized.bytes, format: normalized.format } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json() as { bucket?: string; path?: string };
    if (!body.path || !BUCKETS.includes(body.bucket as Bucket) || !isCanonicalImagePath(body.path, body.bucket as ImageBucket)) throw new ImageServerError("INVALID_PATH", "The image path is invalid.");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ImageServerError("UNAUTHENTICATED", "You must be signed in.", 401);
    const auth = await getAuthContext(supabase, user);
    const ownerId = body.path.split("/")[0];
    if (ownerId !== auth.effectiveUserId || (auth.isImpersonating && !auth.isStaffAdmin)) throw new ImageServerError("FORBIDDEN", "You are not authorized to remove this image.", 403);
    const deleted = await cleanupUnreferencedImage(body.bucket as ImageBucket, body.path);
    return NextResponse.json({ data: { deleted } });
  } catch (error) {
    return jsonError(error, "The image could not be removed.");
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "You must be signed in." } }, { status: 401 });
    const auth = await getAuthContext(supabase, user);
    const body = await request.json() as { profile?: string; operation?: string; neighborhoodId?: string; neighborhoodSlug?: string };
    const profile = assertImageProfile(body.profile ?? null);
    const operation = body.operation === "replace" ? "replace" : "create";
    if (operation !== "create") throw new ImageServerError("INVALID_CAPABILITY_REQUEST", "Only create capabilities can be issued.");
    if (profile === "avatar" || profile === "gallery") throw new ImageServerError("INVALID_CAPABILITY_REQUEST", "Profile uploads do not use create capabilities.");
    const neighborhoodId = body.neighborhoodId || (body.neighborhoodSlug ? (await auth.queryClient.from("neighborhoods").select("id").eq("slug", body.neighborhoodSlug).maybeSingle()).data?.id : null);
    if (!neighborhoodId) throw new ImageServerError("INVALID_CAPABILITY_REQUEST", "A valid neighborhood is required.");
    const { data: membership } = await auth.queryClient.from("memberships").select("id").eq("neighborhood_id", neighborhoodId).eq("user_id", auth.effectiveUserId).eq("status", "active").is("deleted_at", null).maybeSingle();
    if (!membership && !(auth.isStaffAdmin && !auth.isImpersonating)) throw new ImageServerError("FORBIDDEN", "You are not authorized to upload to this neighborhood.", 403);
    const capability = issueImageUploadCapability({ actorId: user.id, effectiveUserId: auth.effectiveUserId, profile, operation, neighborhoodId });
    const payload = verifyImageUploadCapability(capability);
    if (!payload) throw new ImageServerError("CAPABILITY_ISSUE_FAILED", "The image upload capability could not be issued.", 500);
    const { error: capabilityError } = await createAdminClient().from("image_upload_capabilities").insert({ nonce: payload.nonce, actor_id: payload.actorId, effective_user_id: payload.effectiveUserId, profile: payload.profile, operation: payload.operation, neighborhood_id: payload.neighborhoodId, expires_at: new Date(payload.expiresAt * 1000).toISOString() });
    if (capabilityError) throw new ImageServerError("CAPABILITY_ISSUE_FAILED", "The image upload capability could not be issued.", 500);
    return NextResponse.json({ data: { capability, expiresInSeconds: 600 } });
  } catch (error) {
    return jsonError(error);
  }
}
