# Shared Infrastructure Design

**Ticket:** LBC-7
**Status:** Planned
**Prerequisite for:** LBC-2 (Mobile App)

## Overview

Extract shared logic from the web app into `@blockclub/shared` and centralize Supabase queries into a dedicated query layer. This prepares the codebase for mobile app development by making types, validation, business logic, and data fetching patterns reusable across platforms.

## Goals

1. **Centralized query layer** - All Supabase queries in `@/lib/queries/` with typed functions
2. **Shared business logic** - Validation, date utilities, and permission helpers in `@blockclub/shared`
3. **Test coverage** - All shared logic has unit tests
4. **No behavior changes** - Web app works identically after refactor

## Project 1A: Centralize Supabase Queries

### Current State

Queries are scattered throughout page components and server actions:

```typescript
// In a page component
const { data: items } = await supabase
  .from("items")
  .select("*, owner:users(id, name, avatar_url)")
  .eq("neighborhood_id", neighborhoodId)
  .is("deleted_at", null);
```

### Target State

Domain-organized query functions in `@/lib/queries/`:

```typescript
// @/lib/queries/items.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemWithOwner } from "@blockclub/shared";

export async function getItemsForNeighborhood(
  supabase: SupabaseClient,
  neighborhoodId: string
): Promise<ItemWithOwner[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*, owner:users(id, name, avatar_url)")
    .eq("neighborhood_id", neighborhoodId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ItemWithOwner[];
}
```

### Query Files

| File | Functions |
|------|-----------|
| `users.ts` | `getUserById`, `getUsersByNeighborhood` |
| `memberships.ts` | `getMembership`, `getMembershipsForNeighborhood`, `getPendingMemberships`, `getActiveMemberCount` |
| `neighborhoods.ts` | `getNeighborhoodById`, `getNeighborhoodBySlug`, `getNeighborhoodsForUser` |
| `items.ts` | `getItemsForNeighborhood`, `getItemById`, `getItemsByOwner`, `getItemsWithActiveLoans` |
| `loans.ts` | `getLoansForBorrower`, `getLoansForOwner`, `getPendingLoanRequests`, `getActiveLoanForItem` |
| `posts.ts` | `getPostsForNeighborhood`, `getPostById`, `getReactionsForPost`, `getUserReactionsForPosts` |
| `guides.ts` | `getGuideForNeighborhood` |

### Design Decisions

**Why pass `supabase` as first argument?**

The web app uses different Supabase clients depending on context:
- Regular client (respects RLS)
- Admin client (bypasses RLS for staff impersonation)

Passing the client allows the same query functions to work with either.

**Error handling approach:**

Query functions throw on error. Callers handle errors at the page/action level. This keeps the query layer simple and lets each context decide how to handle failures (redirect, show error, etc.).

---

## Project 1B: Extract Shared Logic

### What Moves to `@blockclub/shared`

#### Validation (`src/validation.ts`)

```typescript
// Constants
export const MAX_NAME_LENGTH = 100;
export const MAX_BIO_LENGTH = 500;
export const MAX_ITEM_NAME_LENGTH = 100;
export const MAX_ITEM_DESCRIPTION_LENGTH = 1000;
export const MAX_POST_LENGTH = 2000;
export const PHONE_REGEX = /^\d{10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation functions
export function validatePhone(phone: string): boolean;
export function validateEmail(email: string): boolean;
export function validateRequired(value: string, fieldName: string): string | null;
export function validateMaxLength(value: string, max: number, fieldName: string): string | null;

// Formatting
export function formatPhoneDisplay(phone: string): string; // "2165551234" -> "(216) 555-1234"
export function normalizePhone(phone: string): string; // Strip non-digits
```

#### Date Utilities (`src/date-utils.ts`)

```typescript
// Parsing (handles date-only strings as local dates)
export function parseDateLocal(dateString: string): Date;
export function getTodayLocal(): Date;
export function getDaysFromNow(days: number): Date;

// Formatting
export function formatDateLocal(date: Date): string; // "2024-03-15"
export function displayDateLocal(dateString: string): string; // "Mar 15, 2024"
export function formatDate(isoTimestamp: string): string; // ISO -> "Mar 15, 2024"
export function formatRelativeTime(isoTimestamp: string): string; // "5m ago", "2d ago"

// Comparison
export function isOverdue(dueDate: string): boolean;
export function daysBetween(date1: Date, date2: Date): number;
```

#### Permissions (`src/permissions.ts`)

```typescript
import type { Membership, Item, Post, Loan } from "./types";

// Membership permissions
export function canManageMembers(membership: Membership): boolean;
export function canManageLibrary(membership: Membership): boolean;
export function canModeratePosts(membership: Membership): boolean;
export function isAdmin(membership: Membership): boolean;

// Item permissions
export function canEditItem(userId: string, item: Item): boolean;
export function canDeleteItem(userId: string, item: Item, membership: Membership): boolean;
export function canRequestLoan(userId: string, item: Item): boolean;

// Loan permissions
export function canApproveLoan(userId: string, loan: Loan, item: Item): boolean;
export function canCancelLoan(userId: string, loan: Loan): boolean;
export function canMarkReturned(userId: string, loan: Loan, item: Item): boolean;

// Post permissions
export function canEditPost(userId: string, post: Post): boolean;
export function canDeletePost(userId: string, post: Post, membership: Membership): boolean;
export function canPinPost(membership: Membership): boolean;
```

#### Loan Business Logic (`src/loans.ts`)

```typescript
import type { LoanStatus } from "./types";

// Status display
export function getLoanStatusDisplay(status: LoanStatus): string;
export function getLoanStatusColor(status: LoanStatus): string;

// State machine
export type LoanTransition = "approve" | "decline" | "cancel" | "pickup" | "return";
export function canTransitionLoan(from: LoanStatus, action: LoanTransition): boolean;
export function getNextLoanStatus(from: LoanStatus, action: LoanTransition): LoanStatus;
export function getAvailableTransitions(status: LoanStatus, isOwner: boolean): LoanTransition[];
```

### What Stays Web-Only

| File | Reason |
|------|--------|
| `@/lib/supabase/server.ts` | Uses Next.js cookies API |
| `@/lib/supabase/client.ts` | Uses browser-specific createBrowserClient |
| `@/lib/auth.ts` | Server-only staff admin checks |
| `@/lib/auth-context.ts` | Server action helper with cookie access |
| `@/lib/logger.ts` | Could be shared later, but low priority |

### Updated Package Structure

```
packages/shared/
├── src/
│   ├── types.ts           # (existing) Database types
│   ├── validation.ts      # (new) Validation constants and functions
│   ├── date-utils.ts      # (new) Date parsing and formatting
│   ├── permissions.ts     # (new) Permission check helpers
│   ├── loans.ts           # (new) Loan business logic
│   ├── index.ts           # Re-exports everything
│   └── __tests__/
│       ├── validation.test.ts
│       ├── date-utils.test.ts
│       ├── permissions.test.ts
│       └── loans.test.ts
├── vitest.config.ts
├── package.json
└── tsconfig.json
```

---

## Testing Plan

### Test Setup

Add Vitest to shared package:

```json
// packages/shared/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

```typescript
// packages/shared/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

### Test Coverage

**validation.test.ts:**
- Phone validation: valid 10-digit, with formatting, empty, too short/long
- Email validation: valid formats, invalid formats, edge cases
- Max length: at limit, over limit, empty
- Phone formatting: various input formats

**date-utils.test.ts:**
- `parseDateLocal`: date strings parse to midnight local time
- `formatRelativeTime`: thresholds (now, minutes, hours, days, weeks)
- `isOverdue`: today, yesterday, tomorrow
- Timezone handling: consistent across timezones

**permissions.test.ts:**
- Each permission function with admin vs member roles
- Owner vs non-owner scenarios
- Edge cases: deleted items, inactive memberships

**loans.test.ts:**
- Status display strings
- Valid transitions: requested→approved, approved→active, etc.
- Invalid transitions: returned→approved (should fail)
- Available transitions per status and role

### Move Existing Tests

The web app has `lib/__tests__/date-utils.test.ts` - move this to the shared package and extend coverage.

---

## Implementation Order

1. **Set up shared package testing** - Add Vitest config, verify it runs
2. **Move date-utils** - Copy code, move tests, update web imports
3. **Move validation** - Copy code, write tests, update web imports
4. **Create permissions module** - Extract logic from components, write tests
5. **Create loans module** - Extract business logic, write tests
6. **Create query layer** - Build `@/lib/queries/` structure
7. **Migrate pages to query layer** - One page at a time, verify no regressions

---

## Success Criteria

- [ ] All shared logic has >90% test coverage
- [ ] Web app passes all existing tests after migration
- [ ] No inline Supabase queries remain in page components
- [ ] Mobile app can import and use shared utilities
- [ ] `npm run test` from root runs tests in all packages

---

## Future Considerations

**For mobile app (LBC-2):**
- Query functions will need mobile-specific Supabase client initialization
- Consider a shared query interface that both platforms implement
- Push notification logic may need shared types for notification payloads

**Potential follow-ups:**
- Extract logger to shared (with platform-specific implementations)
- Add shared API response types if mobile uses REST endpoints
