/**
 * Permission checking helpers.
 * Pure functions that check if a user can perform actions.
 */

import type { Membership, Item, Post, Loan } from "./types";

// ============================================================================
// Membership Permissions
// ============================================================================

/**
 * Check if membership grants admin privileges.
 */
export function isAdmin(membership: Membership | null | undefined): boolean {
  return membership?.role === "admin" && membership?.status === "active";
}

/**
 * Check if membership is active (regardless of role).
 */
export function isActiveMember(
  membership: Membership | null | undefined
): boolean {
  return membership?.status === "active";
}

/**
 * Check if user can manage neighborhood members (approve, remove, etc.).
 */
export function canManageMembers(
  membership: Membership | null | undefined
): boolean {
  return isAdmin(membership);
}

/**
 * Check if user can moderate posts (pin, delete any post).
 */
export function canModeratePosts(
  membership: Membership | null | undefined
): boolean {
  return isAdmin(membership);
}

// ============================================================================
// Item Permissions
// ============================================================================

/**
 * Check if user owns an item.
 */
export function isItemOwner(userId: string, item: Item): boolean {
  return item.owner_id === userId;
}

/**
 * Check if user can edit an item (only owner can edit).
 */
export function canEditItem(userId: string, item: Item): boolean {
  return isItemOwner(userId, item);
}

/**
 * Check if user can delete an item (owner or admin).
 */
export function canDeleteItem(
  userId: string,
  item: Item,
  membership: Membership | null | undefined
): boolean {
  return isItemOwner(userId, item) || isAdmin(membership);
}

/**
 * Check if user can request to borrow an item.
 * Cannot borrow own items.
 */
export function canRequestLoan(userId: string, item: Item): boolean {
  return !isItemOwner(userId, item) && item.availability === "available";
}

// ============================================================================
// Loan Permissions
// ============================================================================

/**
 * Check if user can approve/decline a loan request.
 * Only item owner can do this.
 */
export function canManageLoanRequest(
  userId: string,
  loan: Loan,
  item: Item
): boolean {
  return isItemOwner(userId, item) && loan.status === "requested";
}

/**
 * Check if user can cancel a loan.
 * Borrower can cancel their own pending loans.
 */
export function canCancelLoan(userId: string, loan: Loan): boolean {
  return (
    loan.borrower_id === userId &&
    (loan.status === "requested" || loan.status === "approved")
  );
}

/**
 * Check if user can mark a loan as returned.
 * Only item owner can confirm return.
 */
export function canMarkLoanReturned(
  userId: string,
  loan: Loan,
  item: Item
): boolean {
  return isItemOwner(userId, item) && loan.status === "active";
}

// ============================================================================
// Post Permissions
// ============================================================================

/**
 * Check if user is the author of a post.
 */
export function isPostAuthor(userId: string, post: Post): boolean {
  return post.author_id === userId;
}

/**
 * Check if user can edit a post (only author can edit).
 */
export function canEditPost(userId: string, post: Post): boolean {
  return isPostAuthor(userId, post);
}

/**
 * Check if user can delete a post (author or admin).
 */
export function canDeletePost(
  userId: string,
  post: Post,
  membership: Membership | null | undefined
): boolean {
  return isPostAuthor(userId, post) || isAdmin(membership);
}

/**
 * Check if user can pin/unpin posts (admin only).
 */
export function canPinPost(
  membership: Membership | null | undefined
): boolean {
  return isAdmin(membership);
}
