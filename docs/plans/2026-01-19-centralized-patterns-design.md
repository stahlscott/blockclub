# Centralized Patterns for LLM-Driven Development

**Date:** 2026-01-19
**Status:** Approved
**Goal:** Establish consistent, centralized patterns that make the codebase quickly and accurately readable by LLM agents, ensuring bug fixes don't need to be reimplemented across multiple locations.

---

## Overview

Three interconnected improvements:

1. **Standardized Result Types** - Consistent return shapes for all server actions and API routes
2. **Centralized Query Layer** - Reusable query functions that encapsulate soft deletes, joins, and ordering
3. **API Routes vs Server Actions Guidelines** - Documentation for when to use each pattern

---

## 1. Standardized Result Types

**Location:** `packages/shared/src/results.ts`

```typescript
// Base result type - all operations return this shape
export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// Helper type for results that return data
export type DataResult<T> = ActionResult<T> & { data: T };

// Common error codes for programmatic handling (optional, for API routes)
export type ErrorCode =
  | "UNAUTHORIZED"      // 401 - not logged in
  | "FORBIDDEN"         // 403 - logged in but not allowed
  | "NOT_FOUND"         // 404 - resource doesn't exist
  | "VALIDATION_ERROR"  // 400 - bad input
  | "CONFLICT"          // 409 - already exists, etc.
  | "SERVER_ERROR";     // 500 - unexpected error

// Extended result for API routes that need error codes
export interface ApiResult<T = void> extends ActionResult<T> {
  code?: ErrorCode;
}
```

**Usage in server actions:**
```typescript
export async function createItem(data: CreateItemData): Promise<ActionResult> {
  if (!membership) {
    return { success: false, error: "You must be a member to add items" };
  }
  return { success: true };
}
```

**Usage when returning data:**
```typescript
export async function getItem(id: string): Promise<ActionResult<Item>> {
  return { success: true, data: item };
}
```

**Update `packages/shared/src/index.ts`:**
```typescript
export * from "./results";
```

---

## 2. Centralized Query Layer

**Location:** `apps/web/src/lib/queries/`

```
lib/queries/
├── index.ts          # Re-exports all query modules
├── types.ts          # Query-specific types (moved from lib/supabase/queries.ts)
├── items.ts          # Item queries
├── memberships.ts    # Membership queries
├── posts.ts          # Post queries
├── loans.ts          # Loan queries
├── users.ts          # User queries
└── neighborhoods.ts  # Neighborhood queries
```

### Design Principles

1. **Each query function takes a Supabase client as first parameter** - Allows callers to pass either regular or admin client
2. **Soft deletes are always filtered** - Every query includes `.is("deleted_at", null)` by default
3. **Standard joins are pre-defined** - FK hints and select patterns defined once
4. **Queries return Supabase response directly** - Callers handle `{ data, error }` their way
5. **Query options for common variations** - Pagination, ordering, filtering via optional params

### Example: `items.ts`

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ItemCategory } from "@blockclub/shared";
import type { ItemWithOwner } from "./types";

type Client = SupabaseClient<Database>;

const ITEM_WITH_OWNER_SELECT = `
  *,
  owner:users!items_owner_id_fkey(id, name, avatar_url)
` as const;

// List items for a neighborhood (library page)
export async function getItemsByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: { category?: ItemCategory; limit?: number; includeUnavailable?: boolean }
) {
  let query = client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!options?.includeUnavailable) {
    query = query.eq("availability", "available");
  }
  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query as unknown as Promise<{ data: ItemWithOwner[] | null; error: Error | null }>;
}

// Single item by ID
export async function getItemById(client: Client, itemId: string) {
  return client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("id", itemId)
    .is("deleted_at", null)
    .single() as unknown as Promise<{ data: ItemWithOwner | null; error: Error | null }>;
}

// Items owned by a user in a neighborhood
export async function getItemsByOwner(
  client: Client,
  neighborhoodId: string,
  ownerId: string
) {
  return client
    .from("items")
    .select(ITEM_WITH_OWNER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}
```

### Example: `memberships.ts`

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@blockclub/shared";
import type { MembershipWithUser } from "./types";

type Client = SupabaseClient<Database>;

const MEMBERSHIP_WITH_USER_SELECT = `
  *,
  user:users!memberships_user_id_fkey(id, name, email, avatar_url, phone_numbers),
  neighborhood:neighborhoods(*)
` as const;

// Active membership for a user in a neighborhood
export async function getActiveMembership(
  client: Client,
  neighborhoodId: string,
  userId: string
) {
  return client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();
}

// All active members of a neighborhood (directory page)
export async function getMembersByNeighborhood(
  client: Client,
  neighborhoodId: string,
  options?: { role?: "admin" | "member" }
) {
  let query = client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("neighborhood_id", neighborhoodId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (options?.role) {
    query = query.eq("role", options.role);
  }

  return query;
}

// All neighborhoods a user belongs to
export async function getNeighborhoodsForUser(client: Client, userId: string) {
  return client
    .from("memberships")
    .select(MEMBERSHIP_WITH_USER_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null);
}
```

### `index.ts`

```typescript
export * from "./items";
export * from "./memberships";
export * from "./posts";
export * from "./loans";
export * from "./users";
export * from "./neighborhoods";
export * from "./types";
```

---

## 3. API Routes vs Server Actions Guidelines

**Add to `apps/web/CLAUDE.md`:**

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

---

## 4. Form State Management (CLAUDE.md addition)

**Add to React 19 Patterns section:**

### Form State Management

**Preferred: useActionState (React 19)**
Use for forms that submit to server actions. Provides `isPending` for free, cleaner code.

**Acceptable: useState**
Use when useActionState doesn't fit (e.g., multi-step forms, complex validation that prevented adoption). Document why in a comment if choosing this pattern.

**Known limitations encountered:**
- (Add specific issues here as they're discovered, so future LLMs understand why some forms use useState)

---

## 5. Tech Debt Items

**Add to `TODO.md` Tech Debt section:**

- [ ] **Migrate existing forms to useActionState pattern** - Forms currently use manual useState for error/loading state. Prefer useActionState for server action forms. See CLAUDE.md for the pattern.
- [ ] **Standardize API route return types** - Update existing API routes to use `ApiResult<T>` from `@blockclub/shared`. Currently routes return inconsistent shapes.

---

## Implementation Plan

### Phase 1: Foundation
1. Create `packages/shared/src/results.ts` with result types
2. Export from `packages/shared/src/index.ts`
3. Update documentation in `apps/web/CLAUDE.md`
4. Update `TODO.md` with tech debt items

### Phase 2: Query Layer
1. Create `apps/web/src/lib/queries/` directory structure
2. Move types from `lib/supabase/queries.ts` to `lib/queries/types.ts`
3. Implement query modules one at a time:
   - `memberships.ts` (most used)
   - `items.ts`
   - `posts.ts`
   - `loans.ts`
   - `users.ts`
   - `neighborhoods.ts`

### Phase 3: Adoption (Gradual)
1. Use new query functions in new code
2. Refactor existing pages to use query layer as they're touched
3. Update server actions to use `ActionResult<T>` return type
4. Update API routes to use `ApiResult<T>` return type

---

## Benefits

1. **LLMs writing new pages** can import from `@/lib/queries` and get correct soft-delete filtering, joins, and ordering automatically
2. **Server actions and API routes** return consistent `ActionResult<T>` shapes
3. **Documentation** clarifies when to use which pattern
4. **Tech debt is tracked** for gradual migration of existing code
5. **Bug fixes in query logic** (e.g., forgetting soft delete filter) only need to happen once
