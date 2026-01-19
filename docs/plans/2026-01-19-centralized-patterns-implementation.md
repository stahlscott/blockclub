# Centralized Patterns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish consistent, centralized patterns (result types, query layer, documentation) for LLM-driven development.

**Architecture:** Create shared result types in `@blockclub/shared`, centralized query functions in `apps/web/src/lib/queries/`, and documentation updates in CLAUDE.md files.

**Tech Stack:** TypeScript, Supabase, Next.js

---

## Task 1: Create Result Types in Shared Package

**Files:**
- Create: `packages/shared/src/results.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1: Create the results.ts file**

Create `packages/shared/src/results.ts`:

```typescript
/**
 * Standardized result types for server actions and API routes.
 * All operations should return these shapes for consistency.
 */

/**
 * Base result type for all operations.
 * @template T - The type of data returned on success (void if none)
 */
export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Helper type for results that must return data.
 * Use when the operation always returns data on success.
 */
export type DataResult<T> = ActionResult<T> & { data: T };

/**
 * Common error codes for programmatic handling.
 * Maps to HTTP status codes for API routes.
 */
export type ErrorCode =
  | "UNAUTHORIZED" // 401 - not logged in
  | "FORBIDDEN" // 403 - logged in but not allowed
  | "NOT_FOUND" // 404 - resource doesn't exist
  | "VALIDATION_ERROR" // 400 - bad input
  | "CONFLICT" // 409 - already exists, etc.
  | "SERVER_ERROR"; // 500 - unexpected error

/**
 * Extended result for API routes that need error codes.
 * Use in API routes where HTTP status code mapping is needed.
 */
export interface ApiResult<T = void> extends ActionResult<T> {
  code?: ErrorCode;
}

/**
 * Map error codes to HTTP status codes.
 * Utility for API route handlers.
 */
export const ERROR_CODE_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  SERVER_ERROR: 500,
};
```

**Step 2: Update shared package index.ts**

Add to `packages/shared/src/index.ts`:

```typescript
// Results
export * from "./results";
```

**Step 3: Run typecheck to verify**

Run: `npm run typecheck`
Expected: PASS with no errors

**Step 4: Commit**

```bash
git add packages/shared/src/results.ts packages/shared/src/index.ts
git commit -m "feat(shared): add standardized result types for actions and API routes"
```

---

## Task 2: Create Query Layer Directory Structure

**Files:**
- Create: `apps/web/src/lib/queries/types.ts`
- Create: `apps/web/src/lib/queries/index.ts`

**Step 1: Create types.ts with query-specific types**

Move and expand types from `lib/supabase/queries.ts`. Create `apps/web/src/lib/queries/types.ts`:

```typescript
/**
 * Type-safe query result types for Supabase.
 *
 * These types match the actual runtime data shape from Supabase queries
 * with joins. Use these instead of `as unknown as T` double-casts.
 */

import type {
  User,
  Neighborhood,
  Membership,
  Item,
  Loan,
  Post,
  NotificationPreferences,
} from "@blockclub/shared";

// ============================================================================
// USER QUERY TYPES
// ============================================================================

/** User with minimal fields for display (avatars, names in lists) */
export interface UserSummary {
  id: string;
  name: string;
  avatar_url: string | null;
}

/** User with contact info for directory/profiles */
export interface UserWithContact extends UserSummary {
  email: string;
  phone_numbers: Array<{ label: string; number: string }> | null;
}

/** User with notification preferences */
export interface UserWithPreferences extends UserWithContact {
  notification_preferences: NotificationPreferences | null;
}

// ============================================================================
// MEMBERSHIP QUERY TYPES
// ============================================================================

/** Membership with user summary (for member lists) */
export interface MembershipWithUser extends Membership {
  user: UserWithContact;
}

/** Membership with neighborhood (for user's neighborhood list) */
export interface MembershipWithNeighborhood extends Membership {
  neighborhood: Neighborhood;
}

/** Membership with both user and neighborhood */
export interface MembershipFull extends Membership {
  user: UserWithContact;
  neighborhood: Neighborhood;
}

// ============================================================================
// ITEM QUERY TYPES
// ============================================================================

/** Item with owner info (standard library view) */
export interface ItemWithOwner extends Item {
  owner: UserSummary;
}

// ============================================================================
// LOAN QUERY TYPES
// ============================================================================

/** Loan with item and borrower (for owner's loan management) */
export interface LoanWithDetails extends Loan {
  item: Item;
  borrower: UserSummary;
}

/** Loan with full item including owner (for borrower's view) */
export interface LoanWithItemAndOwner extends Loan {
  item: ItemWithOwner;
  borrower: UserSummary;
}

// ============================================================================
// POST QUERY TYPES
// ============================================================================

/** Post with author info */
export interface PostWithAuthor extends Post {
  author: UserSummary;
}

// ============================================================================
// NOTIFICATION QUERY TYPES (moved from lib/supabase/queries.ts)
// ============================================================================

/** Shape for loan requested notification query */
export interface LoanRequestedRow {
  id: string;
  notes: string | null;
  borrower: { id: string; name: string };
  item: {
    id: string;
    name: string;
    owner_id: string;
    neighborhood: { slug: string };
  };
}

/** Shape for loan approved/declined notification query */
export interface LoanWithBorrowerRow {
  id: string;
  due_date: string | null;
  borrower: {
    id: string;
    name: string;
    email: string;
    notification_preferences: NotificationPreferences | null;
  };
  item: {
    id: string;
    name: string;
    owner: { id: string; name: string };
    neighborhood: { slug: string };
  };
}

/** Shape for loan returned notification query */
export interface LoanReturnedRow {
  id: string;
  borrower: { id: string; name: string };
  item: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      email: string;
      notification_preferences: NotificationPreferences | null;
    };
    neighborhood: { slug: string };
  };
}

/** Shape for owner query with notification preferences */
export interface OwnerRow {
  id: string;
  name: string;
  email: string;
  notification_preferences: NotificationPreferences | null;
}

// ============================================================================
// TYPE NARROWING HELPERS
// ============================================================================

/**
 * Type guard to filter out null neighborhoods from membership results.
 */
export function hasNeighborhood<
  T extends { neighborhood: { id: string; name: string; slug: string } | null },
>(membership: T): membership is T & { neighborhood: NonNullable<T["neighborhood"]> } {
  return membership.neighborhood !== null;
}

/**
 * Type guard for notification preferences.
 */
export function isNotificationPreferences(
  value: unknown
): value is NotificationPreferences {
  if (typeof value !== "object" || value === null) return false;
  const prefs = value as Record<string, unknown>;
  return (
    typeof prefs.version === "number" &&
    typeof prefs.email_enabled === "boolean" &&
    typeof prefs.channels === "object"
  );
}
```

**Step 2: Create index.ts**

Create `apps/web/src/lib/queries/index.ts`:

```typescript
/**
 * Centralized query layer for Supabase.
 *
 * Import query functions from here instead of writing inline queries.
 * All queries handle soft deletes, standard joins, and default ordering.
 *
 * Usage:
 *   import { getItemsByNeighborhood } from "@/lib/queries";
 *   const { data, error } = await getItemsByNeighborhood(supabase, neighborhoodId);
 */

export * from "./types";

// Query modules will be added here as they're created:
// export * from "./items";
// export * from "./memberships";
// export * from "./posts";
// export * from "./loans";
// export * from "./users";
// export * from "./neighborhoods";
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/queries/
git commit -m "feat(web): add query layer directory structure with types"
```

---

## Task 3: Create Items Query Module

**Files:**
- Create: `apps/web/src/lib/queries/items.ts`
- Modify: `apps/web/src/lib/queries/index.ts`

**Step 1: Create items.ts**

Create `apps/web/src/lib/queries/items.ts`:

```typescript
/**
 * Centralized queries for the items table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ItemCategory } from "@blockclub/shared";
import type { ItemWithOwner } from "./types";

type Client = SupabaseClient<Database>;

// Standard select for items with owner join
// Note: FK hint required because items has multiple user references
const ITEM_WITH_OWNER_SELECT = `
  *,
  owner:users!items_owner_id_fkey(id, name, avatar_url)
` as const;

/**
 * Get all items in a neighborhood.
 * Default: only available items, ordered by newest first.
 */
export async function getItemsByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: {
    category?: ItemCategory;
    includeUnavailable?: boolean;
    limit?: number;
  }
) {
  let query = client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!options?.includeUnavailable) {
    query = query.in("availability", ["available", "borrowed"]);
  }

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const result = await query;
  return result as { data: ItemWithOwner[] | null; error: typeof result.error };
}

/**
 * Get a single item by ID.
 */
export async function getItemById(client: Client, itemId: string) {
  const result = await client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("id", itemId)
    .is("deleted_at", null)
    .single();

  return result as { data: ItemWithOwner | null; error: typeof result.error };
}

/**
 * Get all items owned by a specific user in a neighborhood.
 */
export async function getItemsByOwner(
  client: Client,
  neighborhoodId: string,
  ownerId: string,
  options?: { includeUnavailable?: boolean }
) {
  let query = client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!options?.includeUnavailable) {
    query = query.in("availability", ["available", "borrowed"]);
  }

  const result = await query;
  return result as { data: ItemWithOwner[] | null; error: typeof result.error };
}
```

**Step 2: Update index.ts**

Update `apps/web/src/lib/queries/index.ts`:

```typescript
export * from "./types";
export * from "./items";
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/queries/items.ts apps/web/src/lib/queries/index.ts
git commit -m "feat(web): add centralized items query module"
```

---

## Task 4: Create Memberships Query Module

**Files:**
- Create: `apps/web/src/lib/queries/memberships.ts`
- Modify: `apps/web/src/lib/queries/index.ts`

**Step 1: Create memberships.ts**

Create `apps/web/src/lib/queries/memberships.ts`:

```typescript
/**
 * Centralized queries for the memberships table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MembershipRole } from "@blockclub/shared";
import type { MembershipWithUser, MembershipWithNeighborhood } from "./types";

type Client = SupabaseClient<Database>;

// Standard select for membership with user details
const MEMBERSHIP_WITH_USER_SELECT = `
  *,
  user:users!memberships_user_id_fkey(id, name, email, avatar_url, phone_numbers)
` as const;

// Standard select for membership with neighborhood
const MEMBERSHIP_WITH_NEIGHBORHOOD_SELECT = `
  *,
  neighborhood:neighborhoods(*)
` as const;

/**
 * Get a user's active membership in a specific neighborhood.
 * Returns null if user is not an active member.
 */
export async function getActiveMembership(
  client: Client,
  neighborhoodId: string,
  userId: string
) {
  const result = await client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  return result as { data: MembershipWithUser | null; error: typeof result.error };
}

/**
 * Get all active members of a neighborhood (for directory).
 * Ordered by join date (oldest first).
 */
export async function getMembersByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: { role?: MembershipRole; status?: "active" | "pending" }
) {
  let query = client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (options?.role) {
    query = query.eq("role", options.role);
  }

  // Default to active if not specified
  const status = options?.status ?? "active";
  query = query.eq("status", status);

  const result = await query;
  return result as { data: MembershipWithUser[] | null; error: typeof result.error };
}

/**
 * Get all neighborhoods a user belongs to.
 * Used for neighborhood switcher.
 */
export async function getNeighborhoodsForUser(
  client: Client,
  userId: string,
  options?: { includeInactive?: boolean }
) {
  let query = client
    .from("memberships")
    .select(MEMBERSHIP_WITH_NEIGHBORHOOD_SELECT)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (!options?.includeInactive) {
    query = query.eq("status", "active");
  }

  const result = await query;
  return result as { data: MembershipWithNeighborhood[] | null; error: typeof result.error };
}

/**
 * Check if a user has an active membership in a neighborhood.
 * Lightweight check without fetching full data.
 */
export async function checkMembership(
  client: Client,
  neighborhoodId: string,
  userId: string
): Promise<{ isMember: boolean; role: MembershipRole | null }> {
  const { data } = await client
    .from("memberships")
    .select("role")
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  return {
    isMember: !!data,
    role: data?.role as MembershipRole | null,
  };
}
```

**Step 2: Update index.ts**

Add to `apps/web/src/lib/queries/index.ts`:

```typescript
export * from "./memberships";
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/queries/memberships.ts apps/web/src/lib/queries/index.ts
git commit -m "feat(web): add centralized memberships query module"
```

---

## Task 5: Create Posts Query Module

**Files:**
- Create: `apps/web/src/lib/queries/posts.ts`
- Modify: `apps/web/src/lib/queries/index.ts`

**Step 1: Create posts.ts**

Create `apps/web/src/lib/queries/posts.ts`:

```typescript
/**
 * Centralized queries for the posts table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@blockclub/shared";
import type { PostWithAuthor } from "./types";

type Client = SupabaseClient<Database>;

// Standard select for posts with author
const POST_WITH_AUTHOR_SELECT = `
  *,
  author:users!posts_author_id_fkey(id, name, avatar_url)
` as const;

/**
 * Get all posts in a neighborhood.
 * Pinned posts first, then by newest.
 */
export async function getPostsByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: { limit?: number; includePinned?: boolean }
) {
  let query = client
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const result = await query;
  return result as { data: PostWithAuthor[] | null; error: typeof result.error };
}

/**
 * Get a single post by ID.
 */
export async function getPostById(client: Client, postId: string) {
  const result = await client
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("id", postId)
    .is("deleted_at", null)
    .single();

  return result as { data: PostWithAuthor | null; error: typeof result.error };
}

/**
 * Get posts by a specific author in a neighborhood.
 */
export async function getPostsByAuthor(
  client: Client,
  neighborhoodId: string,
  authorId: string
) {
  const result = await client
    .from("posts")
    .select(POST_WITH_AUTHOR_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return result as { data: PostWithAuthor[] | null; error: typeof result.error };
}
```

**Step 2: Update index.ts**

Add to `apps/web/src/lib/queries/index.ts`:

```typescript
export * from "./posts";
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/queries/posts.ts apps/web/src/lib/queries/index.ts
git commit -m "feat(web): add centralized posts query module"
```

---

## Task 6: Create Loans Query Module

**Files:**
- Create: `apps/web/src/lib/queries/loans.ts`
- Modify: `apps/web/src/lib/queries/index.ts`

**Step 1: Create loans.ts**

Create `apps/web/src/lib/queries/loans.ts`:

```typescript
/**
 * Centralized queries for the loans table.
 * All queries filter soft deletes and include standard joins.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LoanStatus } from "@blockclub/shared";
import type { LoanWithDetails, LoanWithItemAndOwner } from "./types";

type Client = SupabaseClient<Database>;

// Select for loan with item and borrower (owner's view)
const LOAN_WITH_DETAILS_SELECT = `
  *,
  item:items!loans_item_id_fkey(*),
  borrower:users!loans_borrower_id_fkey(id, name, avatar_url)
` as const;

// Select for loan with full item including owner (borrower's view)
const LOAN_WITH_ITEM_AND_OWNER_SELECT = `
  *,
  item:items!loans_item_id_fkey(*, owner:users!items_owner_id_fkey(id, name, avatar_url)),
  borrower:users!loans_borrower_id_fkey(id, name, avatar_url)
` as const;

/**
 * Get loans for items owned by a user (owner's loan management).
 * Filters by status, ordered by most recent first.
 */
export async function getLoansForOwner(
  client: Client,
  ownerId: string,
  options?: { status?: LoanStatus | LoanStatus[]; neighborhoodId?: string }
) {
  let query = client
    .from("loans")
    .select(LOAN_WITH_DETAILS_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Filter by item owner via join
  query = query.eq("item.owner_id", ownerId);

  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    query = query.in("status", statuses);
  }

  if (options?.neighborhoodId) {
    query = query.eq("item.neighborhood_id", options.neighborhoodId);
  }

  const result = await query;
  return result as { data: LoanWithDetails[] | null; error: typeof result.error };
}

/**
 * Get loans where user is the borrower.
 * Includes full item with owner info.
 */
export async function getLoansForBorrower(
  client: Client,
  borrowerId: string,
  options?: { status?: LoanStatus | LoanStatus[] }
) {
  let query = client
    .from("loans")
    .select(LOAN_WITH_ITEM_AND_OWNER_SELECT)
    .eq("borrower_id", borrowerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (options?.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    query = query.in("status", statuses);
  }

  const result = await query;
  return result as { data: LoanWithItemAndOwner[] | null; error: typeof result.error };
}

/**
 * Get a single loan by ID with full details.
 */
export async function getLoanById(client: Client, loanId: string) {
  const result = await client
    .from("loans")
    .select(LOAN_WITH_ITEM_AND_OWNER_SELECT)
    .eq("id", loanId)
    .is("deleted_at", null)
    .single();

  return result as { data: LoanWithItemAndOwner | null; error: typeof result.error };
}

/**
 * Get active loan for a specific item (if any).
 * Used to check if an item is currently borrowed.
 */
export async function getActiveLoanForItem(client: Client, itemId: string) {
  const result = await client
    .from("loans")
    .select(LOAN_WITH_DETAILS_SELECT)
    .eq("item_id", itemId)
    .in("status", ["approved", "active"])
    .is("deleted_at", null)
    .single();

  return result as { data: LoanWithDetails | null; error: typeof result.error };
}
```

**Step 2: Update index.ts**

Add to `apps/web/src/lib/queries/index.ts`:

```typescript
export * from "./loans";
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/queries/loans.ts apps/web/src/lib/queries/index.ts
git commit -m "feat(web): add centralized loans query module"
```

---

## Task 7: Create Neighborhoods Query Module

**Files:**
- Create: `apps/web/src/lib/queries/neighborhoods.ts`
- Modify: `apps/web/src/lib/queries/index.ts`

**Step 1: Create neighborhoods.ts**

Create `apps/web/src/lib/queries/neighborhoods.ts`:

```typescript
/**
 * Centralized queries for the neighborhoods table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Neighborhood } from "@blockclub/shared";

type Client = SupabaseClient<Database>;

/**
 * Get a neighborhood by slug.
 */
export async function getNeighborhoodBySlug(client: Client, slug: string) {
  const result = await client
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  return result as { data: Neighborhood | null; error: typeof result.error };
}

/**
 * Get a neighborhood by ID.
 */
export async function getNeighborhoodById(client: Client, id: string) {
  const result = await client
    .from("neighborhoods")
    .select("*")
    .eq("id", id)
    .single();

  return result as { data: Neighborhood | null; error: typeof result.error };
}
```

**Step 2: Update index.ts**

Add to `apps/web/src/lib/queries/index.ts`:

```typescript
export * from "./neighborhoods";
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/queries/neighborhoods.ts apps/web/src/lib/queries/index.ts
git commit -m "feat(web): add centralized neighborhoods query module"
```

---

## Task 8: Update CLAUDE.md with API Routes vs Server Actions Guidelines

**Files:**
- Modify: `apps/web/CLAUDE.md`

**Step 1: Add API Routes vs Server Actions section**

Add the following section after the "Form Handling" section in `apps/web/CLAUDE.md`:

```markdown
## API Routes vs Server Actions

### When to Use Server Actions
Server actions are the **default choice** for mutations. Use them when:

- The operation is triggered by a form submission
- You need `revalidatePath()` or `redirect()` after the operation
- The caller only needs success/failure feedback
- Permission model is straightforward (auth + membership check)

**Location:** Colocate with the page in `actions.ts` (e.g., `library/actions.ts`)

**Pattern:**
```typescript
"use server";
import type { ActionResult } from "@blockclub/shared";

export async function createItem(data: CreateItemData): Promise<ActionResult> {
  // ... auth, validation, mutation
  revalidatePath(`/neighborhoods/${slug}/library`);
  return { success: true };
}
```

### When to Use API Routes
Use API routes when:

- **Returning data objects** - The caller needs the created/updated entity back
- **Complex HTTP semantics** - You need specific status codes (404, 409) for client handling
- **Non-form triggers** - Dropdown menus, confirmation dialogs, external webhooks
- **Staff admin operations** - Operations that bypass RLS and need admin client
- **Client-side fetching** - Data needed by client components (e.g., staff status check)

**Location:** `app/api/` directory, organized by resource

**Pattern:**
```typescript
import type { ApiResult } from "@blockclub/shared";

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // ... auth, validation

  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "Forbidden", code: "FORBIDDEN" } satisfies ApiResult,
      { status: 403 }
    );
  }

  // ... mutation
  return NextResponse.json({ success: true, data: updatedEntity } satisfies ApiResult<Entity>);
}
```

### Decision Flowchart

```
Is it a form submission?
  YES → Server Action
  NO ↓

Does it need to return the created/updated entity?
  YES → API Route
  NO ↓

Is it a staff-admin-only operation?
  YES → API Route (in /api/admin/)
  NO ↓

Does it need specific HTTP status codes for error handling?
  YES → API Route
  NO → Server Action
```
```

**Step 2: Update React 19 Patterns section**

Add to the end of the existing "React 19 Patterns" section:

```markdown
### Form State Management

**Preferred: useActionState (React 19)**
Use for forms that submit to server actions. Provides `isPending` for free, cleaner code.

**Acceptable: useState**
Use when useActionState doesn't fit (e.g., multi-step forms, complex validation that prevented adoption). Document why in a comment if choosing this pattern.

**Known limitations encountered:**
- (Add specific issues here as they're discovered, so future LLMs understand why some forms use useState)
```

**Step 3: Run lint to verify markdown**

Run: `npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/CLAUDE.md
git commit -m "docs(web): add API routes vs server actions guidelines"
```

---

## Task 9: Update TODO.md with Tech Debt Items

**Files:**
- Modify: `TODO.md`

**Step 1: Add tech debt items**

Add the following items to the Tech Debt section in `TODO.md`:

```markdown
- [ ] **Migrate existing forms to useActionState pattern** - Forms currently use manual useState for error/loading state. Prefer useActionState for server action forms. See CLAUDE.md for the pattern.
- [ ] **Standardize API route return types** - Update existing API routes to use `ApiResult<T>` from `@blockclub/shared`. Currently routes return inconsistent shapes.
- [ ] **Migrate pages to use centralized query layer** - Replace inline Supabase queries with functions from `@/lib/queries`. Start with library page as reference.
```

**Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: add tech debt items for pattern migrations"
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run full test suite**

Run: `npm run typecheck && npm run lint && npm run test:unit`
Expected: All PASS

**Step 2: Verify query layer exports**

Run: `cd apps/web && npx tsc --noEmit && echo "Types OK"`
Expected: "Types OK"

**Step 3: Update old queries.ts to reference new location**

Update `apps/web/src/lib/supabase/queries.ts` to re-export from new location:

```typescript
/**
 * @deprecated Import from @/lib/queries instead
 * This file is kept for backwards compatibility during migration.
 */

export {
  LoanRequestedRow,
  LoanWithBorrowerRow,
  LoanReturnedRow,
  OwnerRow,
  hasNeighborhood,
  isNotificationPreferences,
} from "@/lib/queries";

// Note: MembershipWithNeighborhoodRow is now MembershipWithNeighborhood in @/lib/queries/types
export type { MembershipWithNeighborhood as MembershipWithNeighborhoodRow } from "@/lib/queries";
```

**Step 4: Final commit**

```bash
git add apps/web/src/lib/supabase/queries.ts
git commit -m "refactor(web): deprecate old queries.ts, point to new query layer"
```

**Step 5: Run tests one more time**

Run: `npm run typecheck && npm run test:unit`
Expected: All PASS

---

## Summary

After completing all tasks, you will have:

1. **`@blockclub/shared`** exports `ActionResult<T>`, `ApiResult<T>`, and `ErrorCode`
2. **`@/lib/queries`** provides centralized query functions for all tables
3. **`apps/web/CLAUDE.md`** documents when to use API routes vs server actions
4. **`TODO.md`** tracks migration of existing code to new patterns

New code should:
- Import result types from `@blockclub/shared`
- Import query functions from `@/lib/queries`
- Follow the documented patterns for API routes vs server actions
