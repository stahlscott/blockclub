# Neighborhood Membership Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent users without an active neighborhood membership from accessing protected app features by adding a shared layout gate that redirects them to onboarding pages.

**Architecture:** A new `(protected)/layout.tsx` checks membership status and redirects to `/get-started` (no memberships) or `/waiting` (pending only). Both pages live under `(auth)` route group to avoid the gate. The invite link parser handles full URLs (any domain) and bare slugs.

**Tech Stack:** Next.js 16 App Router, Supabase (auth + queries), CSS Modules, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-03-26-neighborhood-membership-gate-design.md`

---

### Task 1: Invite link slug parser utility

A pure function that extracts a neighborhood slug from user input — either a full URL containing `/join/` or a bare slug. This is the only piece of real logic worth unit testing; everything else is data fetching + rendering.

**Files:**
- Create: `apps/web/src/lib/parse-invite-input.ts`
- Create: `apps/web/src/lib/__tests__/parse-invite-input.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/lib/__tests__/parse-invite-input.test.ts
import { describe, it, expect } from "vitest";
import { parseInviteInput } from "../parse-invite-input";

describe("parseInviteInput", () => {
  it("extracts slug from full URL with /join/ path", () => {
    expect(parseInviteInput("https://lakewoodblock.club/join/lakewood-heights")).toBe("lakewood-heights");
  });

  it("extracts slug from dev environment URL", () => {
    expect(parseInviteInput("https://blockclub.vercel.app/join/test-neighborhood")).toBe("test-neighborhood");
  });

  it("extracts slug from localhost URL", () => {
    expect(parseInviteInput("http://localhost:3000/join/my-block")).toBe("my-block");
  });

  it("treats bare slug as-is", () => {
    expect(parseInviteInput("lakewood-heights")).toBe("lakewood-heights");
  });

  it("trims whitespace from input", () => {
    expect(parseInviteInput("  lakewood-heights  ")).toBe("lakewood-heights");
  });

  it("handles URL with trailing slash", () => {
    expect(parseInviteInput("https://lakewoodblock.club/join/lakewood-heights/")).toBe("lakewood-heights");
  });

  it("returns null for empty input", () => {
    expect(parseInviteInput("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(parseInviteInput("   ")).toBeNull();
  });

  it("returns null for URL with /join/ but no slug", () => {
    expect(parseInviteInput("https://lakewoodblock.club/join/")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w @blockclub/web -- parse-invite-input`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// apps/web/src/lib/parse-invite-input.ts

/**
 * Parses user input from the get-started page into a neighborhood slug.
 * Accepts either a full invite URL (any domain) or a bare slug.
 */
export function parseInviteInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If input contains /join/, extract the slug from the path
  const joinIndex = trimmed.indexOf("/join/");
  if (joinIndex !== -1) {
    const afterJoin = trimmed.slice(joinIndex + "/join/".length).replace(/\/+$/, "");
    return afterJoin || null;
  }

  // Otherwise treat the whole input as a bare slug
  return trimmed;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w @blockclub/web -- parse-invite-input`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/parse-invite-input.ts apps/web/src/lib/__tests__/parse-invite-input.test.ts
git commit -m "feat: add invite link slug parser utility"
```

---

### Task 2: Shared `(protected)` layout with membership gate

The core of the fix. This server component layout wraps all protected routes and redirects users without active memberships.

**Files:**
- Create: `apps/web/src/app/(protected)/layout.tsx`

**References:**
- `apps/web/src/lib/supabase/server.ts` — `createClient`, `getAuthUser`
- `apps/web/src/lib/auth-context.ts` — `getAuthContext`
- `apps/web/src/lib/auth.ts` — `isStaffAdmin`
- `apps/web/src/app/(protected)/settings/page.tsx` — existing auth check pattern to follow

- [ ] **Step 1: Create the layout**

```typescript
// apps/web/src/app/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { isStaffAdmin } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/signin");
  }

  // Staff admins (not impersonating) bypass the membership gate.
  // They get redirected to /staff by the dashboard page and need
  // access to protected routes for impersonation workflows.
  const supabase = await createClient();
  // Use queryClient from getAuthContext — when staff admin is impersonating,
  // the regular supabase client's RLS won't allow reading another user's memberships.
  const { effectiveUserId, isImpersonating, queryClient } = await getAuthContext(supabase, authUser);
  const isUserStaffAdmin = isStaffAdmin(authUser.email);

  if (isUserStaffAdmin && !isImpersonating) {
    return <>{children}</>;
  }

  // Check for active memberships
  const { data: activeMemberships } = await queryClient
    .from("memberships")
    .select("id")
    .eq("user_id", effectiveUserId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1);

  if (activeMemberships && activeMemberships.length > 0) {
    return <>{children}</>;
  }

  // No active memberships — check for pending
  const { data: pendingMemberships } = await queryClient
    .from("memberships")
    .select("id")
    .eq("user_id", effectiveUserId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .limit(1);

  if (pendingMemberships && pendingMemberships.length > 0) {
    redirect("/waiting");
  }

  redirect("/get-started");
}
```

- [ ] **Step 2: Verify the app still loads for a user with an active membership**

Run: `npm run dev:web`
Navigate to `/dashboard` as an authenticated user with a neighborhood.
Expected: Dashboard renders normally — the layout gate passes through.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(protected)/layout.tsx
git commit -m "feat: add membership gate to protected layout"
```

---

### Task 3: `/get-started` page

For authenticated users with zero memberships. Uses the shared `auth.module.css` styles consistent with signin/signup pages.

**Files:**
- Create: `apps/web/src/app/(auth)/get-started/page.tsx`

**References:**
- `apps/web/src/app/(auth)/auth.module.css` — shared auth page styles
- `apps/web/src/app/(auth)/signup/page.tsx` — pattern: client component, Suspense wrapper, `auth.module.css`
- `apps/web/src/lib/parse-invite-input.ts` — slug parser from Task 1

- [ ] **Step 1: Create the page**

```typescript
// apps/web/src/app/(auth)/get-started/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseInviteInput } from "@/lib/parse-invite-input";
import "@/app/globals.css";
import styles from "../auth.module.css";

function GetStartedForm() {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load user name for greeting
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/signin");
        return;
      }
      setUserName(user.user_metadata?.name || null);
      setLoading(false);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const slug = parseInviteInput(inviteInput);
    if (!slug) {
      setError("Please enter an invite link or neighborhood name.");
      return;
    }

    router.push(`/join/${slug}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  if (loading) return null;

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>
          {userName ? `Welcome, ${userName}!` : "Welcome!"}
        </h1>
        <p className={styles.subtitle}>
          Block Club is built around neighborhoods. Join yours to get started.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="invite-input" className={styles.label}>
              Invite link or neighborhood name
            </label>
            <input
              id="invite-input"
              type="text"
              className={styles.input}
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="e.g., lakewood-heights or paste a link"
              data-testid="get-started-invite-input"
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={styles.button}
            data-testid="get-started-submit-button"
          >
            Go to neighborhood
          </button>
        </form>

        <p className={styles.hint}>
          Don&apos;t have a link? Ask a neighbor who&apos;s already on Block Club to share their invite.
        </p>

        <div className={styles.footer}>
          <button
            onClick={handleSignOut}
            className={styles.changeEmailLink}
            data-testid="get-started-signout-button"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense>
      <GetStartedForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev:web`
Navigate to `/get-started` directly.
Expected: Page renders with invite input, submit button, and sign-out link. Submitting a slug navigates to `/join/{slug}`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(auth)/get-started/page.tsx
git commit -m "feat: add get-started page for users without neighborhood"
```

---

### Task 4: `/waiting` page

For authenticated users who have only pending memberships. Server component — no client interactivity needed beyond a link.

**Files:**
- Create: `apps/web/src/app/(auth)/waiting/page.tsx`

**References:**
- `apps/web/src/app/(auth)/auth.module.css` — shared auth page styles
- `apps/web/src/lib/supabase/server.ts` — `createClient`

- [ ] **Step 1: Create the page**

The waiting page is a server component for the data fetching, with a small client component for sign-out (since there's no server-side sign-out route in the app — sign-out is done via client-side `supabase.auth.signOut()`).

**Files:**
- Create: `apps/web/src/app/(auth)/waiting/page.tsx`
- Create: `apps/web/src/app/(auth)/waiting/SignOutButton.tsx`

```typescript
// apps/web/src/app/(auth)/waiting/SignOutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "../auth.module.css";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  return (
    <button
      onClick={handleSignOut}
      className={styles.changeEmailLink}
      data-testid="waiting-signout-button"
    >
      Sign out
    </button>
  );
}
```

```typescript
// apps/web/src/app/(auth)/waiting/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "@/app/globals.css";
import styles from "../auth.module.css";
import { SignOutButton } from "./SignOutButton";

interface PendingMembership {
  id: string;
  neighborhood: { name: string } | null;
}

export default async function WaitingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch pending memberships with neighborhood names
  const { data: pendingMemberships } = await supabase
    .from("memberships")
    .select("id, neighborhood:neighborhoods(name)")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .is("deleted_at", null);

  // If no pending memberships, they may have been approved or have none
  if (!pendingMemberships || pendingMemberships.length === 0) {
    redirect("/dashboard");
  }

  const neighborhoodNames = (pendingMemberships as PendingMembership[])
    .map((m) => m.neighborhood?.name)
    .filter(Boolean);

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>Waiting for approval</h1>
        <p className={styles.subtitle}>
          You&apos;ve requested to join:
        </p>
        <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
          {neighborhoodNames.map((name) => (
            <li key={name} style={{ marginBottom: "var(--space-1)" }}>{name}</li>
          ))}
        </ul>
        <p className={styles.hint}>
          A neighbor will review your request soon. Once approved, you&apos;ll have
          full access to your neighborhood on Block Club.
        </p>
        <Link
          href="/dashboard"
          className={styles.button}
          style={{ textAlign: "center", textDecoration: "none", display: "block" }}
          data-testid="waiting-check-again-link"
        >
          Check again
        </Link>
        <div className={styles.footer}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run: `npm run dev:web`
Navigate to `/waiting` directly (you may need to manually create a pending membership in the database for testing).
Expected: Page shows neighborhood names, "Check again" link, and sign-out option.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(auth)/waiting/page.tsx apps/web/src/app/(auth)/waiting/SignOutButton.tsx
git commit -m "feat: add waiting page for pending membership approval"
```

---

### Task 5: Dashboard cleanup — remove dead empty state

The "No neighborhood yet" empty state in the dashboard is now unreachable for non-staff users. Remove it.

**Files:**
- Modify: `apps/web/src/app/(protected)/dashboard/page.tsx` — remove the empty state block (~lines 673-684)
- Modify: `apps/web/src/app/(protected)/dashboard/dashboard.module.css` — remove `.emptyState`, `.emptyIllustration`, `.emptyTitle`, `.emptyText` styles if they're only used by this block

- [ ] **Step 1: Read the current dashboard to identify exact code to remove**

Read `dashboard/page.tsx` around lines 455-688 to see the full conditional structure.
Read `dashboard.module.css` and grep for `emptyState`, `emptyIllustration`, `emptyTitle`, `emptyText` usage to confirm they're only used in the block being removed.

- [ ] **Step 2: Remove the empty state JSX**

Remove the `else` branch of the `primaryNeighborhood` conditional that renders the "No neighborhood yet" empty state. The ternary `primaryNeighborhood ? (...neighborhood content...) : (...empty state...)` becomes just the neighborhood content wrapped in a conditional `{primaryNeighborhood && (...)}`.

- [ ] **Step 3: Remove dead CSS classes**

If `emptyState`, `emptyIllustration`, `emptyTitle`, `emptyText` are not used anywhere else in the dashboard (or other files), remove them from `dashboard.module.css`.

- [ ] **Step 4: Verify the dashboard still renders correctly**

Run: `npm run dev:web`
Navigate to `/dashboard` as an authenticated user with a neighborhood.
Expected: Dashboard renders normally.

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/(protected)/dashboard/page.tsx apps/web/src/app/(protected)/dashboard/dashboard.module.css
git commit -m "fix: remove unreachable no-neighborhood empty state from dashboard"
```

---

### Task 6: E2E test — membership gate redirect

Add a Playwright test that verifies the gate behavior. This tests the critical path: an authenticated user without a membership gets redirected.

**Files:**
- Create: `apps/web/e2e/membership-gate.spec.ts`

**References:**
- `apps/web/e2e/auth.spec.ts` — existing auth E2E test patterns
- `apps/web/e2e/impersonation.spec.ts` — patterns for testing with different user states

- [ ] **Step 1: Read existing E2E test patterns**

Read `apps/web/e2e/auth.spec.ts` to understand:
- How test users are set up (seed data vs. signup flow)
- How authentication is handled in tests
- What assertions and selectors are used

- [ ] **Step 2: Write the E2E test**

The test needs an authenticated user with no memberships. Determine from the existing E2E tests how to set this up (there may be a test user seed, or you may need to create a user via the signup flow and ensure they have no memberships).

Test scenarios:
1. Authenticated user with no memberships navigates to `/dashboard` → redirected to `/get-started`
2. User on `/get-started` enters a slug → navigated to `/join/{slug}`
3. Authenticated user with only pending membership navigates to `/dashboard` → redirected to `/waiting`
4. User on `/waiting` clicks "Check again" → navigates to `/dashboard` (which redirects back to `/waiting` if still pending)

- [ ] **Step 3: Run the E2E test**

Run: `npx playwright test membership-gate.spec.ts`
Expected: All scenarios pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/membership-gate.spec.ts
git commit -m "test(e2e): add membership gate redirect tests"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm run test:unit -w @blockclub/web && npm run lint && npm run typecheck`
Expected: All pass.

- [ ] **Step 2: Run E2E tests**

Run: `npm run test:e2e -w @blockclub/web`
Expected: All pass, including existing tests (no regressions).

- [ ] **Step 3: Manual smoke test of the full flow**

1. Sign in as a user with an active membership → dashboard loads normally
2. Sign in as a user with no memberships → redirected to `/get-started`
3. On `/get-started`, paste a full invite URL → navigated to `/join/{slug}`
4. On `/get-started`, type a bare slug → navigated to `/join/{slug}`
5. Sign in as a user with only a pending membership → redirected to `/waiting`
6. On `/waiting`, click "Check again" → navigates to `/dashboard`, redirected back to `/waiting`
7. As staff admin (not impersonating) → dashboard redirects to `/staff` as before
8. Navigate to `/profile` without membership → redirected to `/get-started` (not profile page)
