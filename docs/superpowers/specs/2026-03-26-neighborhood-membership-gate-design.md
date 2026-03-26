# Neighborhood Membership Gate

**Date:** 2026-03-26
**Status:** Draft
**Problem:** Users can access protected app features (profile editing, image uploads) without being part of a neighborhood, leading to silent failures (e.g., Supabase Storage RLS rejecting uploads without user-visible errors).

## Context

Block Club is a multi-tenant app where all meaningful data is scoped to neighborhoods. Currently, the middleware (`proxy.ts` / `middleware.ts`) only checks authentication — it doesn't verify neighborhood membership. Individual neighborhood-scoped pages (`/neighborhoods/[slug]/*`) enforce membership via `getNeighborhoodAccess()`, but non-neighborhood pages like `/profile`, `/settings`, and `/dashboard` are accessible to any authenticated user.

This means a user who signs up without an invite link (or whose invite-based membership is still pending) can navigate freely through protected routes. The dashboard shows a "No neighborhood yet" empty state, but nothing prevents them from accessing `/profile` and attempting image uploads that silently fail due to storage RLS policies.

## Decision

**Approach 2: Shared `(protected)` layout with membership gate.**

A new layout at `apps/web/src/app/(protected)/layout.tsx` checks for active neighborhood membership and redirects users who don't have one. This sits between the middleware (auth) and individual page components (neighborhood-specific access).

### Why not middleware-level enforcement?

Adding a Supabase membership query to the middleware would run on every request to protected routes, adding latency. The middleware's responsibility is session management and auth — business logic belongs in the app layer.

### Why not per-page checks?

The bug we're fixing is exactly what happens with per-page enforcement: it's easy to forget on new pages. A shared layout provides automatic coverage for all current and future protected routes.

## Design

### 1. Shared `(protected)` layout — membership gate

**File:** `apps/web/src/app/(protected)/layout.tsx`

**Behavior:**
1. Get the authenticated user
2. Check `isStaffAdmin()` — if true and not impersonating, pass through (staff admins are redirected to `/staff` by the dashboard; they need access for impersonation workflows)
3. Use `getAuthContext()` to determine the effective user ID (consistent with existing protected pages), then query memberships for that user
4. If the user has at least one active membership (`status = 'active'`, `deleted_at IS NULL`) — render children
5. If the user has only pending memberships — redirect to `/waiting`
6. If the user has no memberships at all — redirect to `/get-started`

**Data flow:** The layout only checks for the *existence* of active memberships. It does not select a primary neighborhood or fetch neighborhood data — that remains the responsibility of individual pages.

### 2. `/get-started` page — no memberships

**File:** `apps/web/src/app/(auth)/get-started/page.tsx`

**Route group:** `(auth)` — outside the `(protected)` layout gate to avoid redirect loops. Must still require authentication (check auth, redirect to `/signin` if not authenticated).

**Content:**
- Greeting with user's name
- Explanation: "Block Club is built around neighborhoods. Join yours to get started."
- Primary action: Input field to paste an invite link, with a submit button
- Secondary text: "Don't have a link? Ask a neighbor who's already on Block Club to share their invite."
- Sign-out link

**Invite link handling:** The input accepts either a full URL or a bare slug. Parsing logic:
1. If the input contains `/join/`, extract the slug from the path (works regardless of domain — `lakewoodblock.club`, `blockclub.vercel.app`, `localhost:3000`, etc.)
2. Otherwise, treat the entire trimmed input as a slug (e.g., `lakewood-heights`)
3. Redirect to `/join/[slug]`

### 3. `/waiting` page — pending memberships only

**File:** `apps/web/src/app/(auth)/waiting/page.tsx`

**Route group:** `(auth)` — same reasoning as `/get-started`.

**Content:**
- "Waiting for approval" heading
- List of neighborhoods the user has requested to join (name only)
- Friendly copy: "A neighbor will review your request soon."
- "Check again" link to `/dashboard` — the layout gate re-evaluates membership and either lets them through or redirects back to `/waiting`
- Sign-out link

**Transition flow:** When an admin approves the membership, the user clicks "Check again" which navigates to `/dashboard`. The layout gate sees the active membership and renders the dashboard normally.

### 4. Dashboard cleanup

**Remove:** The "No neighborhood yet" empty state block (currently lines ~673-684 in `dashboard/page.tsx`). With the layout gate, this code path is unreachable for non-staff users.

**Keep:** The pending memberships banner — this is for users who have an active membership in one neighborhood but are pending in another. This is a valid state that the layout gate allows through (they have at least one active membership).

### 5. Middleware — no changes needed

The middleware checks `isProtectedRoute` against `/dashboard`, `/neighborhoods`, `/profile` paths and redirects unauthenticated users to `/signin`. It also redirects authenticated users away from `/signin` and `/signup` specifically.

`/get-started` and `/waiting` are not in either list, so:
- Unauthenticated users hitting `/get-started` or `/waiting` are not auto-redirected by middleware (the pages themselves check auth and redirect to `/signin`)
- Authenticated users on those pages are not redirected to `/dashboard` by middleware

No middleware changes required.

### 6. Edge cases

| Scenario | Behavior |
|----------|----------|
| User signs up via invite, auto-approved | Callback redirects to `/dashboard`, layout gate passes (active membership exists) |
| User signs up via invite, pending approval | Callback redirects to `/dashboard`, layout gate redirects to `/waiting` |
| User signs up without invite | Callback redirects to `/dashboard`, layout gate redirects to `/get-started` |
| User visits `/join/[slug]` directly | Public page, not behind gate — works as before |
| Pending user gets approved, clicks "Check again" | Navigates to `/dashboard`, layout gate passes |
| Staff admin (not impersonating) | Layout gate passes, dashboard redirects to `/staff` |
| Staff admin impersonating user without membership | Layout gate checks impersonated user's memberships, redirects appropriately |
| User with active membership in neighborhood A, pending in B | Layout gate passes (has active membership), dashboard shows pending banner for B |
| User's only membership gets deactivated/deleted | Next navigation to protected route triggers layout gate, redirects to `/get-started` |

## Out of Scope

- **Storage RLS audit:** The silent upload failure is fixed by prevention (users can't reach the profile page without a membership). A separate audit of storage RLS policies would be good but is not part of this change.
- **Real-time approval notifications:** The `/waiting` page uses manual refresh. WebSocket/polling for real-time updates could be added later if the wait time proves problematic.
- **Onboarding wizard:** The `/get-started` page is minimal — paste a link or ask a neighbor. A richer onboarding flow (neighborhood discovery, create-your-own) could be built later.
- **Middleware protected routes gap:** The middleware only protects `/dashboard`, `/neighborhoods`, and `/profile` — it does not include `/settings` or `/staff`. Those routes rely on in-page auth checks. This is pre-existing and unrelated to this change, but worth addressing separately.
