# Block Club - AI Development Guide

## Project Overview

Block Club is a neighborhood community app built as a Turborepo monorepo.

**Stack:**
- **Web**: Next.js 16 with React 19 and App Router (primary, production)
- **Mobile**: Expo/React Native (scaffold only - placeholder)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Language**: TypeScript (strict mode)
- **Hosting**: Vercel (auto-deploy from main)

**Packages:**
- `apps/web` - Next.js web application
- `apps/mobile` - Expo mobile app (scaffold)
- `packages/shared` - Shared TypeScript types

## Architecture Decisions

### Next.js Patterns
- **App Router** (not Pages Router) - all routes in `apps/web/src/app/`
- **Server Components by default** - only add `"use client"` when needed (useState, useEffect, event handlers)
- **Server Actions** preferred over API routes for mutations
- **Dynamic routes** use `[slug]` and `[id]` folder patterns

### Data Layer
- All database types derive from `@blockclub/shared` types.ts
- Use Supabase client from `@/lib/supabase/server` for server components
- Use Supabase client from `@/lib/supabase/client` for client components
- Multi-tenant: all data scoped to neighborhoods via Row-Level Security (RLS)

### Styling Approach
- **CSS Modules** (*.module.css) for reusable components in `/components`
- **Inline styles object** for page-specific layouts:
  ```typescript
  const styles: { [key: string]: React.CSSProperties } = { ... }
  ```
- **CSS variables** in globals.css for colors, spacing, shadows
- **responsive.module.css** for grid utilities (grid2, grid3, grid4, statsRow)

## Code Conventions

### File Naming
- React components: PascalCase (`Header.tsx`, `InviteButton.tsx`)
- Utilities/lib: kebab-case (`ensure-profile.ts`, `validation.ts`)
- CSS Modules: same name as component (`Header.module.css`)
- Tests: `*.test.ts` suffix in `__tests__/` folders

### Import Order
```typescript
// 1. React and Next.js
import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// 2. External packages
import { createClient } from "@supabase/ssr";

// 3. Shared package types
import type { User, Item, MembershipWithUser } from "@blockclub/shared";

// 4. Internal imports with @ alias
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import responsive from "@/app/responsive.module.css";

// 5. Relative imports (sibling components, local styles)
import styles from "./Component.module.css";
```

### Path Aliases
- Always use `@/` for imports within the web app (maps to `./src/`)
- Never use relative paths like `../../lib/` - use `@/lib/` instead

## Database Patterns

### Multi-Tenant Architecture
- All queries must be scoped to a neighborhood
- RLS policies enforce data isolation automatically
- User can belong to multiple neighborhoods via `memberships` table

### Key Tables
- `users` - User profiles (synced with Supabase Auth)
- `neighborhoods` - Community groups
- `memberships` - User-to-neighborhood with role and status
- `items` - Lending library items
- `loans` - Borrow/return tracking
- `posts` - Bulletin board posts

### Status Enums
```typescript
MembershipStatus: "pending" | "active" | "inactive" | "moved_out"
ItemAvailability: "available" | "borrowed" | "unavailable"
LoanStatus: "requested" | "approved" | "active" | "returned" | "cancelled"
```

### Soft Deletes
- `memberships`, `items`, `loans`, `posts` use `deleted_at` column
- Filter with `.is("deleted_at", null)` in queries

## Common Patterns

### Authentication Flow
```typescript
// Server component - check auth and redirect
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/signin");
```

### Protected Routes
- Routes in `app/(protected)/` require authentication
- Auth check happens in each page's server component
- Redirect to `/signin` if not authenticated

### Form Handling
- Use native `<form>` with `action` prop for server actions
- Client-side validation uses constants from `@/lib/validation.ts`
- Error state managed with `useState` in client components

### React 19 Patterns

**useActionState for Server Actions:**
Prefer `useActionState` over manual `useState` for form submission state when using server actions:
```typescript
"use client";
import { useActionState } from "react";
import { myServerAction, type ActionState } from "./actions";

export function MyForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    myServerAction,
    {} // initial state
  );

  return (
    <form action={formAction}>
      {state.error && <div className={styles.error}>{state.error}</div>}
      <input name="field" />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

Server action signature for useActionState:
```typescript
"use server";
export interface ActionState {
  success?: boolean;
  error?: string;
}

export async function myServerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // ... validation and database operations
  return { success: true };
}
```

### Next.js 16 Patterns

**Middleware:**
- Next.js 16 renames middleware.ts to `proxy.ts` with `proxy()` function
- Located at `apps/web/proxy.ts`

**Cache Components (Future):**
- Next.js 16 introduces `"use cache"` directive for explicit caching
- Requires `cacheComponents: true` in next.config.js
- Also requires wrapping dynamic data in Suspense boundaries
- Currently disabled; enable when ready to adopt Suspense throughout

**Data Fetching:**
- Extract data fetching into separate functions for parallel execution
- See `apps/web/src/app/(protected)/dashboard/data.ts` for example

### Fetching Related Data
```typescript
// Join pattern using Supabase select
const { data: items } = await supabase
  .from("items")
  .select("*, owner:users(id, name, avatar_url)")
  .eq("neighborhood_id", neighborhoodId);
```

### Staff Admin Check
```typescript
import { isStaffAdmin } from "@/lib/auth";
const isUserStaffAdmin = isStaffAdmin(user.email);
```

### Auth Context Helper
Use `getAuthContext()` from `/lib/auth-context.ts` for server actions that need staff admin and impersonation logic:
```typescript
import { getAuthContext } from "@/lib/auth-context";

// In a server action or API route
const supabase = await createClient();
const { data: { user: authUser } } = await supabase.auth.getUser();
if (!authUser) redirect("/signin");

const { effectiveUserId, queryClient, isImpersonating, isStaffAdmin } =
  await getAuthContext(supabase, authUser);

// Use queryClient for database queries (bypasses RLS for staff admins)
const { data } = await queryClient.from("items").select("*");
```

### Date Utilities
Use `/lib/date-utils.ts` for consistent date handling:
```typescript
import {
  parseDateLocal,      // "2024-03-15" -> Date at midnight local
  formatDateLocal,     // Date -> "2024-03-15"
  displayDateLocal,    // "2024-03-15" -> "Mar 15, 2024"
  formatDate,          // ISO timestamp -> "Mar 15, 2024"
  formatRelativeTime,  // ISO timestamp -> "5m ago", "2d ago"
  getTodayLocal,       // Today at midnight local
  getDaysFromNow,      // Date N days from now
} from "@/lib/date-utils";
```

## Component Guidelines

- Keep components under 300 lines
- Split large forms into section components
- Extract reusable logic into custom hooks or utilities
- Use composition over monolithic components

## Package Responsibilities

### @blockclub/shared
- TypeScript type definitions matching Supabase schema
- Insert/Update type variants for mutations
- Joined types for queries with relations (e.g., `ItemWithOwner`)
- **Do not put** UI components, React code, or web-specific utilities here

### apps/web
- All React components and pages
- Supabase client configuration
- Business logic and utilities
- Styling (CSS Modules, globals.css)

### apps/mobile
- Expo/React Native code (currently scaffold only)
- Will share types from @blockclub/shared
- Will have its own styling approach (React Native StyleSheet)

## Testing

### Unit Tests (Vitest)
- Located in `lib/__tests__/*.test.ts`
- Test pure functions and utilities
- Run: `npm run test:unit -w @blockclub/web`

### E2E Tests (Playwright)
- Located in `apps/web/e2e/`
- Test complete user flows
- Run: `npm run test:e2e -w @blockclub/web`

### Test Requirements
- Unit tests required for business logic in `/lib/`
- E2E tests recommended for user-facing flows
- Test authorization logic for protected actions

## Environment Variables

Required in `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx
STAFF_ADMIN_EMAILS=admin@example.com
```

## Commands

```bash
npm run dev:web      # Start web dev server (port 3000)
npm run build:web    # Build web app
npm run lint         # Lint all packages
npm run typecheck    # TypeScript check all packages
```
