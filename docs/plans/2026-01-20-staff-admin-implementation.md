# Staff Admin Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the monolithic `/staff` page into focused routes with lazy loading and improved impersonation.

**Architecture:** Four server-component routes that each fetch only their required data. Neighborhood detail page is the primary workspace. Impersonation extended to accept redirect destination.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase, CSS Modules

**Design Doc:** `docs/plans/2026-01-20-staff-admin-overhaul-design.md`

---

## Task 1: Extend Impersonation Action

**Files:**
- Modify: `apps/web/src/app/actions/impersonation.ts`

**Step 1: Update startImpersonation signature**

Add optional `redirectTo` parameter to `startImpersonation`:

```typescript
/**
 * Start impersonating a user.
 * Only staff admins can call this action.
 *
 * @param targetUserId - The ID of the user to impersonate
 * @param redirectTo - Optional path to redirect to after impersonation (default: /dashboard)
 * @returns Success status with redirect path - caller handles navigation
 */
export async function startImpersonation(
  targetUserId: string,
  redirectTo?: string
): Promise<{ success: boolean; error?: string; redirectTo?: string }> {
```

**Step 2: Return redirectTo in success response**

At the end of the function, change:
```typescript
  await setImpersonationCookie(targetUserId);
  return { success: true, redirectTo: redirectTo || "/dashboard" };
```

**Step 3: Commit**

```bash
git add apps/web/src/app/actions/impersonation.ts
git commit -m "feat(staff): extend impersonation to accept redirect destination"
```

---

## Task 2: Create Staff Layout with Navigation

**Files:**
- Create: `apps/web/src/app/(protected)/staff/layout.tsx`
- Create: `apps/web/src/app/(protected)/staff/staff-nav.tsx`
- Create: `apps/web/src/app/(protected)/staff/staff-nav.module.css`

**Step 1: Create staff-nav.module.css**

```css
.nav {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-4);
}

.link {
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.linkActive {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
```

**Step 2: Create staff-nav.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./staff-nav.module.css";

const navItems = [
  { href: "/staff", label: "Overview", exact: true },
  { href: "/staff/neighborhoods", label: "Neighborhoods" },
  { href: "/staff/users", label: "Users" },
];

export function StaffNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.link} ${isActive(item.href, item.exact) ? styles.linkActive : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

**Step 3: Create layout.tsx**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { StaffNav } from "./staff-nav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  if (!isStaffAdmin(user.email)) {
    logger.warn("Non-staff admin attempted to access /staff", {
      userId: user.id,
      email: user.email,
    });
    redirect("/dashboard");
  }

  return (
    <div>
      <h1 style={{ marginBottom: "var(--space-4)" }}>Staff Admin</h1>
      <StaffNav />
      {children}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/\(protected\)/staff/layout.tsx \
        apps/web/src/app/\(protected\)/staff/staff-nav.tsx \
        apps/web/src/app/\(protected\)/staff/staff-nav.module.css
git commit -m "feat(staff): add layout with navigation"
```

---

## Task 3: Create Overview Page

**Files:**
- Modify: `apps/web/src/app/(protected)/staff/page.tsx` (replace existing)
- Delete: `apps/web/src/app/(protected)/staff/staff-client.tsx` (later, after migration)
- Delete: `apps/web/src/app/(protected)/staff/staff.module.css` (later, after migration)

**Step 1: Create new overview page**

Replace the entire contents of `page.tsx`:

```tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import responsive from "@/app/responsive.module.css";

async function getStats() {
  const adminSupabase = createAdminClient();

  const [neighborhoods, users, items] = await Promise.all([
    adminSupabase.from("neighborhoods").select("*", { count: "exact", head: true }),
    adminSupabase.from("users").select("*", { count: "exact", head: true }),
    adminSupabase.from("items").select("*", { count: "exact", head: true }),
  ]);

  return {
    neighborhoodCount: neighborhoods.count || 0,
    userCount: users.count || 0,
    itemCount: items.count || 0,
  };
}

const styles: { [key: string]: React.CSSProperties } = {
  statsRow: {
    display: "flex",
    gap: "var(--space-4)",
    marginBottom: "var(--space-8)",
  },
  stat: {
    background: "var(--color-surface)",
    padding: "var(--space-5)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    textAlign: "center",
    minWidth: "120px",
  },
  statValue: {
    display: "block",
    fontSize: "var(--font-size-2xl)",
    fontWeight: 600,
    color: "var(--color-text)",
  },
  statLabel: {
    fontSize: "var(--font-size-sm)",
    color: "var(--color-text-secondary)",
  },
  sectionTitle: {
    fontSize: "var(--font-size-lg)",
    fontWeight: 600,
    marginBottom: "var(--space-4)",
  },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "var(--space-4)",
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    textDecoration: "none",
    color: "var(--color-text)",
    transition: "border-color var(--transition-fast)",
  },
};

export default async function StaffOverviewPage() {
  const stats = await getStats();

  return (
    <div>
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.neighborhoodCount}</span>
          <span style={styles.statLabel}>Neighborhoods</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.userCount}</span>
          <span style={styles.statLabel}>Users</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.itemCount}</span>
          <span style={styles.statLabel}>Items</span>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Quick Actions</h2>
      <div className={responsive.grid3}>
        <Link href="/staff/neighborhoods" style={styles.actionCard}>
          <span>View Neighborhoods</span>
        </Link>
        <Link href="/staff/users" style={styles.actionCard}>
          <span>Find User</span>
        </Link>
        <Link href="/neighborhoods/new" style={styles.actionCard}>
          <span>New Neighborhood</span>
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: Verify it works**

Run: `npm run dev:web`
Navigate to `/staff` - should see stats and quick actions with new nav.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(protected\)/staff/page.tsx
git commit -m "feat(staff): replace overview with lightweight stats page"
```

---

## Task 4: Create Neighborhoods List Page

**Files:**
- Create: `apps/web/src/app/(protected)/staff/neighborhoods/page.tsx`
- Create: `apps/web/src/app/(protected)/staff/neighborhoods/neighborhoods-table.tsx`
- Create: `apps/web/src/app/(protected)/staff/neighborhoods/neighborhoods.module.css`

**Step 1: Create neighborhoods.module.css**

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-5);
}

.title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.newButton {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.newButton:hover {
  background: var(--color-primary-hover);
}

.table {
  width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.tableHeader {
  display: grid;
  grid-template-columns: 2fr 1fr 80px 80px 100px 80px;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tableRow {
  display: grid;
  grid-template-columns: 2fr 1fr 80px 80px 100px 80px;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
  align-items: center;
  font-size: var(--font-size-sm);
}

.tableRow:hover {
  background: var(--color-surface-hover);
}

.name {
  font-weight: 500;
  color: var(--color-text);
}

.slug {
  color: var(--color-text-secondary);
  font-family: monospace;
  font-size: var(--font-size-xs);
}

.count {
  text-align: center;
  color: var(--color-text-secondary);
}

.date {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.viewLink {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  font-size: var(--font-size-sm);
}

.viewLink:hover {
  text-decoration: underline;
}

.emptyRow {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
}
```

**Step 2: Create neighborhoods-table.tsx**

```tsx
import Link from "next/link";
import styles from "./neighborhoods.module.css";

interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  memberCount: number;
  itemCount: number;
}

interface NeighborhoodsTableProps {
  neighborhoods: Neighborhood[];
}

export function NeighborhoodsTable({ neighborhoods }: NeighborhoodsTableProps) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        <span>Name</span>
        <span>Slug</span>
        <span style={{ textAlign: "center" }}>Members</span>
        <span style={{ textAlign: "center" }}>Items</span>
        <span>Created</span>
        <span></span>
      </div>
      {neighborhoods.map((n) => (
        <div key={n.id} className={styles.tableRow}>
          <span className={styles.name}>{n.name}</span>
          <span className={styles.slug}>{n.slug}</span>
          <span className={styles.count}>{n.memberCount}</span>
          <span className={styles.count}>{n.itemCount}</span>
          <span className={styles.date}>
            {new Date(n.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Link href={`/staff/neighborhoods/${n.slug}`} className={styles.viewLink}>
            View
          </Link>
        </div>
      ))}
      {neighborhoods.length === 0 && (
        <div className={styles.emptyRow}>No neighborhoods yet</div>
      )}
    </div>
  );
}
```

**Step 3: Create page.tsx**

```tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { NeighborhoodsTable } from "./neighborhoods-table";
import styles from "./neighborhoods.module.css";

interface NeighborhoodRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

async function getNeighborhoods() {
  const adminSupabase = createAdminClient();

  const { data: neighborhoods } = await adminSupabase
    .from("neighborhoods")
    .select("id, name, slug, created_at")
    .order("name");

  if (!neighborhoods) return [];

  // Get counts for each neighborhood
  const neighborhoodIds = neighborhoods.map((n) => n.id);

  const [membershipCounts, itemCounts] = await Promise.all([
    adminSupabase
      .from("memberships")
      .select("neighborhood_id")
      .in("neighborhood_id", neighborhoodIds.length > 0 ? neighborhoodIds : [""])
      .eq("status", "active")
      .is("deleted_at", null),
    adminSupabase
      .from("items")
      .select("neighborhood_id")
      .in("neighborhood_id", neighborhoodIds.length > 0 ? neighborhoodIds : [""])
      .is("deleted_at", null),
  ]);

  const memberCountMap: Record<string, number> = {};
  const itemCountMap: Record<string, number> = {};

  (membershipCounts.data || []).forEach((m) => {
    memberCountMap[m.neighborhood_id] = (memberCountMap[m.neighborhood_id] || 0) + 1;
  });

  (itemCounts.data || []).forEach((i) => {
    itemCountMap[i.neighborhood_id] = (itemCountMap[i.neighborhood_id] || 0) + 1;
  });

  return (neighborhoods as NeighborhoodRow[]).map((n) => ({
    ...n,
    memberCount: memberCountMap[n.id] || 0,
    itemCount: itemCountMap[n.id] || 0,
  }));
}

export default async function StaffNeighborhoodsPage() {
  const neighborhoods = await getNeighborhoods();

  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.title}>All Neighborhoods ({neighborhoods.length})</h2>
        <Link href="/neighborhoods/new" className={styles.newButton}>
          + New Neighborhood
        </Link>
      </div>
      <NeighborhoodsTable neighborhoods={neighborhoods} />
    </div>
  );
}
```

**Step 4: Verify and commit**

Run: `npm run dev:web`
Navigate to `/staff/neighborhoods` - should see the table.

```bash
git add apps/web/src/app/\(protected\)/staff/neighborhoods/
git commit -m "feat(staff): add neighborhoods list page"
```

---

## Task 5: Create Neighborhood Detail Page

**Files:**
- Create: `apps/web/src/app/(protected)/staff/neighborhoods/[slug]/page.tsx`
- Create: `apps/web/src/app/(protected)/staff/neighborhoods/[slug]/member-list.tsx`
- Create: `apps/web/src/app/(protected)/staff/neighborhoods/[slug]/detail.module.css`
- Create: `apps/web/src/app/(protected)/staff/neighborhoods/[slug]/actions.ts`

**Step 1: Create detail.module.css**

```css
.backLink {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-4);
}

.backLink:hover {
  color: var(--color-text);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.headerLeft h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.meta {
  display: flex;
  gap: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.meta span {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.headerActions {
  display: flex;
  gap: var(--space-3);
}

.actAsAdminButton {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.actAsAdminButton:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.actAsAdminButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settingsLink {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
  transition: border-color var(--transition-fast);
}

.settingsLink:hover {
  border-color: var(--color-border-emphasis);
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.sectionTitle {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.searchInput {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  width: 250px;
}

.searchInput:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filterTabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.filterTab {
  padding: var(--space-1) var(--space-3);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filterTab:hover {
  border-color: var(--color-border-emphasis);
}

.filterTabActive {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.memberList {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.memberCard {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.memberInfo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatarPlaceholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.memberDetails {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.memberName {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.adminBadge {
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-weight: 500;
}

.pendingBadge {
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  background: var(--color-warning-light);
  color: var(--color-warning-text);
  border-radius: var(--radius-full);
  font-weight: 500;
}

.memberEmail {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.memberMeta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.memberActions {
  display: flex;
  gap: var(--space-2);
}

.actionButton {
  padding: var(--space-1) var(--space-3);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.actionButton:hover:not(:disabled) {
  border-color: var(--color-border-emphasis);
  color: var(--color-text);
}

.actionButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.approveButton {
  background: var(--color-success-light);
  border-color: var(--color-success);
  color: var(--color-success);
}

.approveButton:hover:not(:disabled) {
  background: var(--color-success);
  color: white;
}

.declineButton {
  color: var(--color-error);
  border-color: var(--color-error-light);
}

.declineButton:hover:not(:disabled) {
  background: var(--color-error-light);
}

.removeButton {
  color: var(--color-error);
  border-color: transparent;
}

.removeButton:hover:not(:disabled) {
  border-color: var(--color-error-light);
  background: var(--color-error-light);
}

.emptyState {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.quickLinks {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.quickLink {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-decoration: none;
}

.quickLink:hover {
  text-decoration: underline;
}
```

**Step 2: Create actions.ts**

```typescript
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function approveMembership(
  membershipId: string,
  neighborhoodSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    return { success: false, error: "Unauthorized" };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("memberships")
    .update({ status: "active" })
    .eq("id", membershipId);

  if (error) {
    logger.error("Failed to approve membership", error);
    return { success: false, error: "Failed to approve membership" };
  }

  revalidatePath(`/staff/neighborhoods/${neighborhoodSlug}`);
  return { success: true };
}

export async function declineMembership(
  membershipId: string,
  neighborhoodSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    return { success: false, error: "Unauthorized" };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("memberships")
    .update({ status: "inactive", deleted_at: new Date().toISOString() })
    .eq("id", membershipId);

  if (error) {
    logger.error("Failed to decline membership", error);
    return { success: false, error: "Failed to decline membership" };
  }

  revalidatePath(`/staff/neighborhoods/${neighborhoodSlug}`);
  return { success: true };
}

export async function removeMembership(
  membershipId: string,
  neighborhoodSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    return { success: false, error: "Unauthorized" };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("memberships")
    .update({ status: "inactive", deleted_at: new Date().toISOString() })
    .eq("id", membershipId);

  if (error) {
    logger.error("Failed to remove membership", error);
    return { success: false, error: "Failed to remove membership" };
  }

  revalidatePath(`/staff/neighborhoods/${neighborhoodSlug}`);
  return { success: true };
}
```

**Step 3: Create member-list.tsx**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startImpersonation } from "@/app/actions/impersonation";
import { approveMembership, declineMembership, removeMembership } from "./actions";
import styles from "./detail.module.css";

interface Member {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  membership_id: string;
  role: string;
  status: string;
  joined_at: string;
}

interface MemberListProps {
  members: Member[];
  neighborhoodSlug: string;
}

type FilterStatus = "all" | "active" | "pending";

export function MemberList({ members, neighborhoodSlug }: MemberListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filteredMembers = members.filter((m) => {
    // Filter by status
    if (filter === "active" && m.status !== "active") return false;
    if (filter === "pending" && m.status !== "pending") return false;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !m.name?.toLowerCase().includes(searchLower) &&
        !m.email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    return true;
  });

  const pendingCount = members.filter((m) => m.status === "pending").length;
  const activeCount = members.filter((m) => m.status === "active").length;

  const getInitial = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const handleImpersonate = async (userId: string) => {
    setLoadingAction(`impersonate-${userId}`);
    const result = await startImpersonation(userId, `/neighborhoods/${neighborhoodSlug}`);
    if (result.success && result.redirectTo) {
      router.push(result.redirectTo);
    } else {
      alert(result.error || "Failed to impersonate user");
      setLoadingAction(null);
    }
  };

  const handleApprove = async (membershipId: string) => {
    setLoadingAction(`approve-${membershipId}`);
    const result = await approveMembership(membershipId, neighborhoodSlug);
    if (!result.success) {
      alert(result.error || "Failed to approve");
    }
    setLoadingAction(null);
  };

  const handleDecline = async (membershipId: string) => {
    setLoadingAction(`decline-${membershipId}`);
    const result = await declineMembership(membershipId, neighborhoodSlug);
    if (!result.success) {
      alert(result.error || "Failed to decline");
    }
    setLoadingAction(null);
  };

  const handleRemove = async (membershipId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this neighborhood?`)) return;
    setLoadingAction(`remove-${membershipId}`);
    const result = await removeMembership(membershipId, neighborhoodSlug);
    if (!result.success) {
      alert(result.error || "Failed to remove");
    }
    setLoadingAction(null);
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Members</h3>
        <input
          type="search"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === "all" ? styles.filterTabActive : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({members.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === "active" ? styles.filterTabActive : ""}`}
          onClick={() => setFilter("active")}
        >
          Active ({activeCount})
        </button>
        <button
          className={`${styles.filterTab} ${filter === "pending" ? styles.filterTabActive : ""}`}
          onClick={() => setFilter("pending")}
        >
          Pending ({pendingCount})
        </button>
      </div>

      <div className={styles.memberList}>
        {filteredMembers.map((member) => (
          <div key={member.membership_id} className={styles.memberCard}>
            <div className={styles.memberInfo}>
              {member.avatar_url ? (
                <Image
                  src={member.avatar_url}
                  alt={member.name || "User"}
                  width={40}
                  height={40}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {getInitial(member.name)}
                </div>
              )}
              <div className={styles.memberDetails}>
                <span className={styles.memberName}>
                  {member.name || "No name"}
                  {member.role === "admin" && (
                    <span className={styles.adminBadge}>Admin</span>
                  )}
                  {member.status === "pending" && (
                    <span className={styles.pendingBadge}>Pending</span>
                  )}
                </span>
                <span className={styles.memberEmail}>{member.email}</span>
                <span className={styles.memberMeta}>
                  {member.status === "pending" ? "Requested" : "Joined"}{" "}
                  {new Date(member.joined_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className={styles.memberActions}>
              {member.status === "pending" ? (
                <>
                  <button
                    className={`${styles.actionButton} ${styles.approveButton}`}
                    onClick={() => handleApprove(member.membership_id)}
                    disabled={loadingAction !== null}
                  >
                    {loadingAction === `approve-${member.membership_id}` ? "..." : "Approve"}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.declineButton}`}
                    onClick={() => handleDecline(member.membership_id)}
                    disabled={loadingAction !== null}
                  >
                    {loadingAction === `decline-${member.membership_id}` ? "..." : "Decline"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleImpersonate(member.id)}
                    disabled={loadingAction !== null}
                  >
                    {loadingAction === `impersonate-${member.id}` ? "..." : "Act as User"}
                  </button>
                  {member.role !== "admin" && (
                    <button
                      className={`${styles.actionButton} ${styles.removeButton}`}
                      onClick={() => handleRemove(member.membership_id, member.name || member.email)}
                      disabled={loadingAction !== null}
                    >
                      {loadingAction === `remove-${member.membership_id}` ? "..." : "Remove"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className={styles.emptyState}>
            {search ? "No members match your search" : "No members yet"}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Create page.tsx**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberList } from "./member-list";
import { ActAsAdminButton } from "./act-as-admin-button";
import { InviteButton } from "@/components/InviteButton";
import styles from "./detail.module.css";

interface MemberRow {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  membership_id: string;
  role: string;
  status: string;
  joined_at: string;
}

async function getNeighborhoodWithMembers(slug: string) {
  const adminSupabase = createAdminClient();

  // Get neighborhood
  const { data: neighborhood } = await adminSupabase
    .from("neighborhoods")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!neighborhood) return null;

  // Get members
  const { data: memberships } = await adminSupabase
    .from("memberships")
    .select(`
      id,
      role,
      status,
      created_at,
      user:users(id, name, email, avatar_url)
    `)
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const members: MemberRow[] = (memberships || []).map((m) => {
    const user = m.user as { id: string; name: string | null; email: string; avatar_url: string | null };
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      membership_id: m.id,
      role: m.role,
      status: m.status,
      joined_at: m.created_at,
    };
  });

  // Get counts
  const { count: itemCount } = await adminSupabase
    .from("items")
    .select("*", { count: "exact", head: true })
    .eq("neighborhood_id", neighborhood.id)
    .is("deleted_at", null);

  // Find admin user
  const adminMember = members.find((m) => m.role === "admin" && m.status === "active");

  return {
    neighborhood,
    members,
    itemCount: itemCount || 0,
    adminUserId: adminMember?.id || null,
  };
}

export default async function NeighborhoodDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getNeighborhoodWithMembers(slug);

  if (!data) {
    notFound();
  }

  const { neighborhood, members, itemCount, adminUserId } = data;
  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div>
      <Link href="/staff/neighborhoods" className={styles.backLink}>
        ← Back to Neighborhoods
      </Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>{neighborhood.name}</h2>
          <div className={styles.meta}>
            <span>slug: {neighborhood.slug}</span>
            <span>{activeCount} members</span>
            <span>{itemCount} items</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <ActAsAdminButton
            adminUserId={adminUserId}
            neighborhoodSlug={slug}
          />
          <Link
            href={`/neighborhoods/${slug}/settings`}
            className={styles.settingsLink}
          >
            Settings
          </Link>
        </div>
      </div>

      <MemberList members={members} neighborhoodSlug={slug} />

      <div className={styles.quickLinks}>
        <InviteButton slug={slug} variant="text" />
        <Link href={`/join/${slug}`} className={styles.quickLink} target="_blank">
          View Join Page
        </Link>
      </div>
    </div>
  );
}
```

**Step 5: Create act-as-admin-button.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startImpersonation } from "@/app/actions/impersonation";
import styles from "./detail.module.css";

interface ActAsAdminButtonProps {
  adminUserId: string | null;
  neighborhoodSlug: string;
}

export function ActAsAdminButton({ adminUserId, neighborhoodSlug }: ActAsAdminButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!adminUserId) return;

    setLoading(true);
    const result = await startImpersonation(adminUserId, `/neighborhoods/${neighborhoodSlug}`);
    if (result.success && result.redirectTo) {
      router.push(result.redirectTo);
    } else {
      alert(result.error || "Failed to impersonate admin");
      setLoading(false);
    }
  };

  return (
    <button
      className={styles.actAsAdminButton}
      onClick={handleClick}
      disabled={!adminUserId || loading}
      title={!adminUserId ? "No admin found for this neighborhood" : undefined}
    >
      {loading ? "..." : "Act as Admin"}
    </button>
  );
}
```

**Step 6: Verify and commit**

Run: `npm run dev:web`
Navigate to `/staff/neighborhoods/[any-slug]` - should see detail page with members.

```bash
git add apps/web/src/app/\(protected\)/staff/neighborhoods/\[slug\]/
git commit -m "feat(staff): add neighborhood detail page with member management"
```

---

## Task 6: Create Global User Search Page

**Files:**
- Create: `apps/web/src/app/(protected)/staff/users/page.tsx`
- Create: `apps/web/src/app/(protected)/staff/users/user-search.tsx`
- Create: `apps/web/src/app/(protected)/staff/users/users.module.css`

**Step 1: Create users.module.css**

```css
.container {
  max-width: 800px;
}

.searchBox {
  margin-bottom: var(--space-6);
}

.searchInput {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}

.searchInput:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.hint {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.emptyState {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.results {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.userCard {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.userInfo {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.avatarPlaceholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-surface-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.userDetails {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.userName {
  font-weight: 500;
  font-size: var(--font-size-base);
}

.userEmail {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.neighborhoods {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.neighborhoodBadge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  background: var(--color-surface-secondary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.neighborhoodBadge.admin {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.userActions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-end;
}

.actionButton {
  padding: var(--space-1) var(--space-3);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.actionButton:hover:not(:disabled) {
  border-color: var(--color-border-emphasis);
  color: var(--color-text);
}

.actionButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.viewLink {
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  text-decoration: none;
}

.viewLink:hover {
  text-decoration: underline;
}

.loading {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-secondary);
}
```

**Step 2: Create user-search.tsx**

```tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startImpersonation } from "@/app/actions/impersonation";
import styles from "./users.module.css";

interface UserMembership {
  neighborhood_id: string;
  neighborhood_name: string;
  neighborhood_slug: string;
  role: string;
  status: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  memberships: UserMembership[];
}

export function UserSearch() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  useEffect(() => {
    if (search.length < 2) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);

      try {
        const response = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(search)}`
        );
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch {
        console.error("Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const getInitial = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const handleImpersonate = async (userId: string) => {
    setImpersonatingId(userId);
    const result = await startImpersonation(userId);
    if (result.success && result.redirectTo) {
      router.push(result.redirectTo);
    } else {
      alert(result.error || "Failed to impersonate user");
      setImpersonatingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          autoFocus
        />
        <p className={styles.hint}>
          Search across all neighborhoods to find a user
        </p>
      </div>

      {loading && <div className={styles.loading}>Searching...</div>}

      {!loading && hasSearched && users.length === 0 && (
        <div className={styles.emptyState}>
          No users found matching "{search}"
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className={styles.results}>
          {users.map((user) => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userInfo}>
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.name || "User"}
                    width={48}
                    height={48}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getInitial(user.name)}
                  </div>
                )}
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{user.name || "No name"}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                  <div className={styles.neighborhoods}>
                    {user.memberships
                      .filter((m) => m.status === "active")
                      .map((m) => (
                        <Link
                          key={m.neighborhood_id}
                          href={`/staff/neighborhoods/${m.neighborhood_slug}`}
                          className={`${styles.neighborhoodBadge} ${m.role === "admin" ? styles.admin : ""}`}
                        >
                          {m.neighborhood_name}
                          {m.role === "admin" && " (Admin)"}
                        </Link>
                      ))}
                    {user.memberships.filter((m) => m.status === "active").length === 0 && (
                      <span className={styles.neighborhoodBadge}>No active memberships</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.userActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => handleImpersonate(user.id)}
                  disabled={impersonatingId !== null}
                >
                  {impersonatingId === user.id ? "..." : "Act as User"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !hasSearched && (
        <div className={styles.emptyState}>
          Start typing to search for users
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create page.tsx**

```tsx
import { UserSearch } from "./user-search";

export default function StaffUsersPage() {
  return (
    <div>
      <h2 style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-lg)", fontWeight: 600 }}>
        Find User
      </h2>
      <UserSearch />
    </div>
  );
}
```

**Step 4: Create search API route**

Create: `apps/web/src/app/api/admin/users/search/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const adminSupabase = createAdminClient();

  // Search users
  const { data: users } = await adminSupabase
    .from("users")
    .select("id, name, email, avatar_url")
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  if (!users || users.length === 0) {
    return NextResponse.json({ users: [] });
  }

  // Filter out staff admins
  const nonStaffUsers = users.filter((u) => !isStaffAdmin(u.email));
  const userIds = nonStaffUsers.map((u) => u.id);

  // Get memberships for these users
  const { data: memberships } = await adminSupabase
    .from("memberships")
    .select(`
      user_id,
      neighborhood_id,
      role,
      status,
      neighborhood:neighborhoods(id, name, slug)
    `)
    .in("user_id", userIds.length > 0 ? userIds : [""])
    .is("deleted_at", null);

  // Build membership map
  const membershipMap: Record<string, Array<{
    neighborhood_id: string;
    neighborhood_name: string;
    neighborhood_slug: string;
    role: string;
    status: string;
  }>> = {};

  (memberships || []).forEach((m) => {
    if (!membershipMap[m.user_id]) {
      membershipMap[m.user_id] = [];
    }
    const n = m.neighborhood as { id: string; name: string; slug: string };
    membershipMap[m.user_id].push({
      neighborhood_id: n.id,
      neighborhood_name: n.name,
      neighborhood_slug: n.slug,
      role: m.role,
      status: m.status,
    });
  });

  const enrichedUsers = nonStaffUsers.map((u) => ({
    ...u,
    memberships: membershipMap[u.id] || [],
  }));

  return NextResponse.json({ users: enrichedUsers });
}
```

**Step 5: Verify and commit**

Run: `npm run dev:web`
Navigate to `/staff/users` - search should work.

```bash
git add apps/web/src/app/\(protected\)/staff/users/ \
        apps/web/src/app/api/admin/users/search/
git commit -m "feat(staff): add global user search page"
```

---

## Task 7: Cleanup Old Code

**Files:**
- Delete: `apps/web/src/app/(protected)/staff/staff-client.tsx`
- Delete: `apps/web/src/app/(protected)/staff/staff.module.css`

**Step 1: Verify all new routes work**

Navigate and test:
- `/staff` - Overview with stats
- `/staff/neighborhoods` - List of neighborhoods
- `/staff/neighborhoods/[slug]` - Detail with members
- `/staff/users` - Search works

**Step 2: Delete old files**

```bash
rm apps/web/src/app/\(protected\)/staff/staff-client.tsx
rm apps/web/src/app/\(protected\)/staff/staff.module.css
```

**Step 3: Run linting and type check**

```bash
npm run lint
npm run typecheck
```

**Step 4: Commit cleanup**

```bash
git add -A
git commit -m "chore(staff): remove old monolithic staff client"
```

---

## Task 8: Final Testing & PR

**Step 1: Full test pass**

Test each route:
1. `/staff` - Stats load correctly
2. `/staff/neighborhoods` - Table shows all neighborhoods
3. `/staff/neighborhoods/[slug]` - Members show, filters work, impersonation works
4. `/staff/users` - Search finds users, impersonation works
5. Impersonation lands in correct neighborhood context

**Step 2: Run CI checks**

```bash
npm run lint
npm run typecheck
npm run build:web
```

**Step 3: Create PR**

```bash
git push -u origin lbc-5-staff-admin-overhaul
gh pr create --title "LBC-5: Staff admin page overhaul" --body "$(cat <<'EOF'
## Summary
- Split monolithic `/staff` into focused routes with lazy loading
- `/staff` - Lightweight overview with stats
- `/staff/neighborhoods` - Neighborhood list
- `/staff/neighborhoods/[slug]` - Neighborhood detail with member management
- `/staff/users` - Search-on-demand user lookup
- Impersonation now lands in correct neighborhood context

## Test plan
- [ ] Verify `/staff` shows correct stats
- [ ] Verify `/staff/neighborhoods` lists all neighborhoods
- [ ] Verify neighborhood detail page shows members with roles
- [ ] Test "Act as Admin" impersonation lands in that neighborhood
- [ ] Test "Act as User" impersonation lands in that neighborhood
- [ ] Test member approve/decline/remove actions
- [ ] Test global user search finds users across neighborhoods
- [ ] Verify navigation between pages works correctly

Closes LBC-5

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Extend impersonation action | 1 modified |
| 2 | Staff layout with navigation | 3 created |
| 3 | Overview page | 1 modified |
| 4 | Neighborhoods list page | 3 created |
| 5 | Neighborhood detail page | 5 created |
| 6 | Global user search | 4 created |
| 7 | Cleanup old code | 2 deleted |
| 8 | Testing & PR | - |

Total: ~17 files touched, ~1200 lines of new code
