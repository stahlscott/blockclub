"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS, validateLength } from "@blockclub/shared";
import { isAllowedStorageImageUrl } from "@/lib/storage";
import { env } from "@/lib/env";
import type { PostOperationResult, PostReactionOperationResult, PostReactionType } from "@blockclub/shared";
import { cleanupImageUrl } from "@/lib/image-reference-safety";

interface CreatePostData {
  slug: string;
  content: string;
  imageUrl: string | null;
  expiresAt: string | null;
}

export type PostCommandResult =
  | { success: true; postId: string; operation: "updated" | "deleted" | "pinned" | "unpinned" }
  | { success: false; code: string; error: string };

export type ReactionCommandResult =
  | { success: true; postId: string; reaction: PostReactionType; active: boolean }
  | { success: false; code: string; error: string };

function validationError(message: string): { success: false; code: string; error: string } {
  return { success: false, code: "VALIDATION", error: message };
}

function createContextError(error: { error: string }): { success: false; error: string } {
  return { success: false, error: error.error };
}

function operationError(result: PostOperationResult): PostCommandResult {
  const messages: Record<string, [string, string]> = {
    not_found: ["NOT_FOUND", "This post is no longer available."],
    not_authorized: ["FORBIDDEN", "You are not allowed to change this post."],
    invalid_content: ["VALIDATION", "Post content is invalid."],
    conflict: ["CONFLICT", "This post changed before your action completed. Refresh and try again."],
  };
  const [code, error] = messages[result.reason] || ["DATABASE_ERROR", "The post could not be updated."];
  return { success: false, code, error };
}

async function getPostContext(slug: string) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { ok: false as const, error: { success: false as const, code: "UNAUTHENTICATED", error: "You must be signed in." } };
  const auth = await getAuthContext(supabase, authUser);
  const { data: neighborhood } = await auth.queryClient.from("neighborhoods").select("id").eq("slug", slug).single();
  if (!neighborhood) return { ok: false as const, error: { success: false as const, code: "NOT_FOUND", error: "Neighborhood not found." } };
  return { ok: true as const, supabase, auth, neighborhood };
}

function validatePostInput(content: string, imageUrl: string | null): { content: string; imageUrl: string | null } | { error: string } {
  const normalizedContent = content.trim();
  const contentError = validateLength(normalizedContent, "Post content", MAX_LENGTHS.postContent);
  if (!normalizedContent) return { error: "Post content cannot be empty." };
  if (contentError) return { error: contentError };
  if (!isAllowedStorageImageUrl(imageUrl, env.SUPABASE_URL, "posts")) {
    return { error: "Post images must use Block Club storage." };
  }
  return { content: normalizedContent, imageUrl: imageUrl || null };
}

export async function createPost(data: CreatePostData): Promise<{ success: boolean; error?: string }> {
  const context = await getPostContext(data.slug);
  if (!context.ok) return createContextError(context.error);
  const { auth, neighborhood } = context;
  const { data: membership } = await auth.queryClient.from("memberships").select("id").eq("neighborhood_id", neighborhood.id).eq("user_id", auth.effectiveUserId).eq("status", "active").is("deleted_at", null).maybeSingle();
  if (!membership) return { success: false, error: "You must be a member to post" };
  const input = validatePostInput(data.content, data.imageUrl);
  if ("error" in input) return { success: false, error: input.error };
  const { data: inserted, error } = await auth.queryClient.from("posts").insert({
    neighborhood_id: neighborhood.id,
    author_id: auth.effectiveUserId,
    content: input.content,
    image_url: input.imageUrl,
    expires_at: data.expiresAt ? new Date(data.expiresAt + "T23:59:59").toISOString() : null,
  }).select("id").maybeSingle();
  if (error || !inserted?.id) {
    logger.error("Error creating post", error, { slug: data.slug });
    if (input.imageUrl) await cleanupImageUrl("posts", input.imageUrl);
    return { success: false, error: "The post could not be created." };
  }
  revalidatePath(`/neighborhoods/${data.slug}/posts`);
  return { success: true };
}

export async function deletePost(data: { slug: string; postId: string }): Promise<PostCommandResult> {
  const context = await getPostContext(data.slug);
  if (!context.ok) return context.error;
  if (context.auth.isImpersonating) return { success: false, code: "FORBIDDEN", error: "This post action is not available while impersonating a user." };
  const { supabase } = context;
  const { data: result, error } = await supabase.rpc("soft_delete_post", { p_post_id: data.postId });
  if (error) { logger.error("Error deleting post", error, { postId: data.postId }); return { success: false, code: "DATABASE_ERROR", error: "The post could not be deleted." }; }
  if (!result?.success || result.affected_post_count !== 1 || result.post_id !== data.postId) return operationError(result);
  revalidatePath(`/neighborhoods/${data.slug}/posts`);
  return { success: true, postId: result.post_id, operation: "deleted" };
}

export async function setPostPinned(data: { slug: string; postId: string; pinned: boolean }): Promise<PostCommandResult> {
  const context = await getPostContext(data.slug);
  if (!context.ok) return context.error;
  if (context.auth.isImpersonating) return { success: false, code: "FORBIDDEN", error: "This post action is not available while impersonating a user." };
  const { supabase } = context;
  const { data: result, error } = await supabase.rpc("set_post_pin", { p_post_id: data.postId, p_is_pinned: data.pinned });
  if (error) return { success: false, code: "DATABASE_ERROR", error: "The pin status could not be updated." };
  if (!result?.success || result.affected_post_count !== 1 || result.post_id !== data.postId) return operationError(result);
  revalidatePath(`/neighborhoods/${data.slug}/posts`);
  return { success: true, postId: result.post_id, operation: data.pinned ? "pinned" : "unpinned" };
}

function reactionError(result: PostReactionOperationResult): ReactionCommandResult {
  const messages: Record<string, [string, string]> = {
    not_found: ["NOT_FOUND", "This post is no longer available."],
    not_authorized: ["FORBIDDEN", "You are not allowed to react to this post."],
    conflict: ["CONFLICT", "The reaction changed before your action completed. Refresh and try again."],
  };
  const [code, error] = messages[result.reason] || ["DATABASE_ERROR", "The reaction could not be updated."];
  return { success: false, code, error };
}

export async function togglePostReaction(data: { slug: string; postId: string; reaction: PostReactionType }): Promise<ReactionCommandResult> {
  const context = await getPostContext(data.slug);
  if (!context.ok) return context.error;
  if (context.auth.isImpersonating) return { success: false, code: "FORBIDDEN", error: "This post action is not available while impersonating a user." };
  const { supabase } = context;
  const { data: result, error } = await supabase.rpc("toggle_post_reaction", { p_post_id: data.postId, p_reaction: data.reaction });
  if (error) return { success: false, code: "DATABASE_ERROR", error: "The reaction could not be updated." };
  if (!result?.success || result.affected_reaction_count !== 1 || result.post_id !== data.postId) {
    const operation = result ? reactionError(result) : { success: false as const, code: "CONFLICT", error: "The reaction could not be confirmed." };
    return operation;
  }
  revalidatePath(`/neighborhoods/${data.slug}/posts`);
  return { success: true, postId: result.post_id, reaction: result.reaction, active: result.active };
}

export async function updatePost(data: { slug: string; postId: string; content: string; imageUrl: string | null; expiresAt: string | null; isPinned?: boolean }): Promise<PostCommandResult> {
  const context = await getPostContext(data.slug);
  if (!context.ok) return context.error;
  if (context.auth.isImpersonating) return { success: false, code: "FORBIDDEN", error: "This post action is not available while impersonating a user." };
  const { supabase } = context;
  const input = validatePostInput(data.content, data.imageUrl);
  if ("error" in input) return validationError(input.error);
  const expiresAt = data.expiresAt ? new Date(data.expiresAt + "T23:59:59").toISOString() : null;
  const { data: previousPost } = await supabase.from("posts").select("image_url").eq("id", data.postId).maybeSingle();
  const { data: result, error } = await supabase.rpc("update_post", { p_post_id: data.postId, p_content: input.content, p_image_url: input.imageUrl, p_expires_at: expiresAt, p_is_pinned: data.isPinned ?? null });
  if (error) {
    if (input.imageUrl && input.imageUrl !== previousPost?.image_url) await cleanupImageUrl("posts", input.imageUrl);
    return { success: false, code: "DATABASE_ERROR", error: "The post could not be updated." };
  }
  if (!result?.success || result.affected_post_count !== 1 || result.post_id !== data.postId) return operationError(result);
  if (previousPost?.image_url && previousPost.image_url !== input.imageUrl) await cleanupImageUrl("posts", previousPost.image_url);
  revalidatePath(`/neighborhoods/${data.slug}/posts`);
  return { success: true, postId: result.post_id, operation: "updated" };
}
