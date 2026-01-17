# Block Club - AI Development Guide

## Project Overview

Block Club is a neighborhood community app built as a Turborepo monorepo.

**Stack:**
- **Web**: Next.js 14 with App Router (primary, production)
- **Mobile**: Expo/React Native (scaffold only)
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
import { isSuperAdmin } from "@/lib/auth";
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

### Fetching Related Data
```typescript
// Join pattern using Supabase select
const { data: items } = await supabase
  .from("items")
  .select("*, owner:users(id, name, avatar_url)")
  .eq("neighborhood_id", neighborhoodId);
```

### Super Admin Check
```typescript
import { isSuperAdmin } from "@/lib/auth";
const isUserSuperAdmin = isSuperAdmin(user.email);
```

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
