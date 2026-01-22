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

### Layout Philosophy
- **Flexbox and CSS Grid only** - Never use floats, tables for layout, or absolute positioning for layout flow
- **Flexbox** for one-dimensional layouts (rows OR columns): navbars, button groups, card content
- **CSS Grid** for two-dimensional layouts (rows AND columns): page layouts, card grids, form layouts
- **Gap property** over margins for spacing between flex/grid children
- **No magic numbers** - Use CSS variables (`--space-*`) for all spacing

## Design System

### Visual Philosophy: "The Community Bulletin Board"

Block Club follows the principle: **clean and trustworthy as the default, with intentional moments of warmth.**

The app should feel like a well-designed public library or co-op - warm but understated. Friendliness comes from clarity and respect for the user's time, not visual flourishes.

**Core principles:**
- **Quiet confidence** - Foundation is clean, functional, trustworthy
- **Physical neighborhood metaphors** - Design elements subtly evoke bulletin boards, index cards, posted notices (felt, not seen)
- **Local specificity** - Neighborhood name is prominent; the app feels like it belongs to *this* community
- **Utility over engagement** - Functional, helpful, there when needed - never gamified

### Color Usage

| Color | Purpose |
|-------|---------|
| Brick (`--color-primary`) | Actions: buttons, links, interactive elements |
| Sunny Yellow (`--color-accent`) | Celebrations: NEW badges, pinned posts, milestones |
| Lake Blue (`--color-secondary`) | Structure: navigation, headers, structural elements |
| Category colors | Category indicators only (library items) |
| Semantic colors (red/yellow/green) | Status only, never decoration |

**Background:** Warm cream (`#FFFEF9`) for pages, white for cards (gains warmth by contrast).

### Visual Consistency Rules

- **Shadows:** Two levels only - "resting" (subtle) and "elevated" (hover/focus). No brick-tinted shadows.
- **Border radius:** `6px` throughout for index-card feel. Full radius only for avatars and pills.
- **Spacing:** Strict adherence to scale - page padding `space-8`, card padding `space-5`, section gaps `space-6`.
- **Cards:** Subtle warm border + minimal shadow for paper-like feel. Cards get borders *or* heavy shadows, not both.

### Component Patterns

**Cards:**
- Library items: 4px category color top-border
- Posts: 4px left border (primary color, gold if pinned)
- Hover: Slight rotation (0.5deg) + shadow expansion, not lift

**Buttons:**
- Primary: Clean appearance, warm shadow on hover, subtle press state
- Keep button shadows warm/neutral, not brick-tinted

**Avatars:**
- Warm border color (stone tones)
- Placeholder: Initial letter on consistently-assigned warm background

### Voice & Copy Guidelines

**Tone:** Friendly, human microcopy that sounds like a helpful neighbor.

**Empty states** - Invitations, not dead ends:
- "Nothing here yet - add something your neighbors might need"
- "No posts yet. What's happening on your block?"

**Timestamps** - Human language for recent items:
- "Posted yesterday" / "Shared 3 days ago"

**Success messages** - Neighbor-aware:
- "Added to the library - your neighbors can see it now"
- "You're all set - reach out to [name] to arrange pickup"

**Time awareness:**
- Greetings shift: "Good morning/afternoon/evening, [name]"
- Seasonal touches in copy (not visuals): "Perfect weather for borrowing that tent"

### Identity Architecture

- **City-level:** Subtle (color palette inspired by Lake Erie, not explicitly branded)
- **Neighborhood-level:** Prominent (neighborhood name is the visual anchor)

This scales naturally for future expansion - no theming system needed.

**Full design document:** `docs/plans/2026-01-19-community-bulletin-board-design.md`

**Color scheme document:** `docs/plans/2026-01-19-brick-color-scheme-design.md`

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

### Variable Declarations
- **Always use `const`** - this is the default for all variable declarations
- **Avoid `let`** - needing `let` is a code smell that often indicates the code could be refactored into a cleaner pattern (e.g., using `.map()`, `.reduce()`, ternary expressions, or extracting a function)
- Never use `var`
- ESLint enforces this with the `prefer-const` rule

```typescript
// Good - use const with functional patterns
const user = await getUser();
const items = data.filter(item => item.active);
const total = items.reduce((sum, item) => sum + item.price, 0);
const status = isActive ? "active" : "inactive";

// Bad - using let when const with a better pattern would work
let total = 0;
for (const item of items) {
  total += item.price;  // Use .reduce() instead
}

let status;
if (isActive) {
  status = "active";  // Use ternary instead
} else {
  status = "inactive";
}
```

### Type Casting
- **Avoid `as unknown as T`** - this double-cast bypasses TypeScript's type safety entirely and is a code smell
- When Supabase queries return data with nested joins, define explicit interface types in `lib/supabase/queries.ts` and use single `as InterfaceName` casts
- Use type guards and type narrowing instead of casting when possible
- If you find yourself needing `as unknown as`, consider:
  1. Defining an explicit interface that matches the actual data shape
  2. Using a type guard function to narrow the type safely
  3. Checking if the upstream type definitions can be improved

```typescript
// Bad - double cast bypasses all type checking
const data = result as unknown as MyType;

// Better - single cast to explicit interface defined in queries.ts
const data = result as LoanRequestedRow;

// Best - type guard for runtime safety
function isMyType(value: unknown): value is MyType {
  return typeof value === 'object' && value !== null && 'id' in value;
}
if (isMyType(result)) {
  // result is now typed as MyType
}
```

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

## Accessibility (a11y)

### Core Principles
- **Semantic HTML first** - Use `<button>`, `<nav>`, `<main>`, `<article>` over generic `<div>`
- **Interactive elements are focusable** - Buttons, links, inputs must be keyboard accessible
- **Color is not the only indicator** - Pair color with icons, text, or patterns
- **Images have alt text** - Decorative images use `alt=""`
- **Never disable zoom** - Do not set `maximum-scale=1` in viewport meta

### Automated Testing
- **ESLint jsx-a11y** - Enabled with recommended rules. Catches issues at dev time.
- **Playwright axe-core** - E2E tests in `e2e/accessibility.spec.ts` scan pages for WCAG violations.
- **Storybook a11y addon** - Check the Accessibility panel for each story.

### Development Workflow
- Run `npm run lint` - jsx-a11y rules catch common issues (missing labels, invalid ARIA, etc.)
- Run `npx playwright test accessibility.spec.ts` - Full page audits against WCAG 2.1 AA
- **Keyboard testing** - Tab through interactive components. Focus states must be visible.
- **Minimum contrast** - 4.5:1 for normal text, 3:1 for large text (18px+)

### Common Patterns
```typescript
// Form inputs: Always pair with <label>
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Icon buttons: Include aria-label
<button aria-label="Close modal" onClick={onClose}>×</button>

// Grouped controls: Use role="group" with aria-labelledby
<div role="group" aria-labelledby="phones-label">
  <span id="phones-label">Phone Numbers</span>
  {/* inputs */}
</div>

// Links in text: Must have underline or 3:1 contrast with surrounding text
<p>Already have an account? <a href="/signin">Sign in</a></p>

// Modal backdrops: Keyboard access via close button + Escape, not backdrop click
// eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop click is supplementary
<div onClick={handleBackdropClick} role="dialog" aria-modal="true">

// Navigation links (not tabs): Use aria-current, not role="tab"
<nav aria-label="Library sections">
  <Link href="/library" aria-current={isActive ? "page" : undefined}>All Items</Link>
</nav>
```

### What NOT to Do
- Don't use `<div>` with `onClick` - use `<button>` instead
- Don't use `role="tablist"` for navigation links to different URLs
- Don't use `<label>` as a heading for a group of controls - use `<span>` with `aria-labelledby`
- Don't rely on color alone to convey meaning (error states, active tabs, etc.)

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

### Test IDs

All interactive elements should have `data-testid` attributes for testing.

**Naming Convention:** `{context}-{component}-{element}` (kebab-case)

- **Context:** Page/feature area (signin, library, header, user-menu)
- **Component:** Optional grouping (form, modal, card)
- **Element:** Element purpose (email-input, submit-button, close-button)

**Examples:**
- `signin-form-email-input`
- `header-mobile-menu-button`
- `library-item-card-{id}` (dynamic)
- `invite-modal-copy-button`

**Guidelines:**
- Add to: buttons, links, inputs, forms, modals, dropdowns
- For list items: include database ID for uniqueness
- Not needed for: static text, images, decorative elements

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
