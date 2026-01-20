# Staff Admin Page Overhaul Design

**Ticket:** LBC-5
**Date:** 2026-01-20
**Status:** Design approved

## Problem

The current staff admin page (`/staff`) loads all users, neighborhoods, and memberships in a single query, then uses client-side tabs to switch views. This approach:

- Doesn't scale as the platform grows
- Crams ~575 lines into one client component with 3+ modals
- Makes it hard to deep-link to specific neighborhoods
- Impersonation lands on generic dashboard, not neighborhood context

## Goals

1. Neighborhood-centric navigation (primary workflow)
2. Lazy loading - each route fetches only its data
3. Improved impersonation that lands in correct neighborhood context
4. Cleaner code organization with focused components

## Route Structure

| Route | Purpose | Data Loaded |
|-------|---------|-------------|
| `/staff` | Overview dashboard | Aggregate counts only |
| `/staff/neighborhoods` | Neighborhood list | Neighborhoods + member/item counts |
| `/staff/neighborhoods/[slug]` | Neighborhood detail | Single neighborhood + its members |
| `/staff/users` | Global user search | Users loaded on search (not upfront) |

### File Structure

```
app/(protected)/staff/
├── page.tsx                          # Overview
├── layout.tsx                        # Shared layout (optional)
├── neighborhoods/
│   ├── page.tsx                      # Neighborhood list
│   └── [slug]/
│       └── page.tsx                  # Neighborhood detail
└── users/
    └── page.tsx                      # Global user search
```

## Page Designs

### Overview (`/staff`)

Lightweight landing with stats and navigation.

- **Stats cards:** Neighborhood count, user count, total items (aggregate queries)
- **Quick actions:** Links to Neighborhoods, Find User, New Neighborhood
- No user/neighborhood data loaded beyond counts

### Neighborhoods List (`/staff/neighborhoods`)

Sortable table of all neighborhoods.

| Column | Sortable |
|--------|----------|
| Name | Yes |
| Slug | No |
| Members | Yes |
| Items | Yes |
| Created | Yes |

- Click row or "View" button to go to detail page
- "New Neighborhood" button in header
- Delete moved to detail page (less prominent)

### Neighborhood Detail (`/staff/neighborhoods/[slug]`)

The primary workspace for staff admin tasks.

**Header:**
- Neighborhood name and stats (members, items)
- "Act as Admin" button - impersonates the neighborhood admin
- Quick links: Settings, Invite Link

**Member List:**
- Columns: Avatar, Name, Email, Role badge (Admin), Join date, Actions
- Sortable by name, join date
- Filterable by status: All, Active, Pending
- Search within neighborhood

**Member Actions:**
- Active members: "Act as User", "Remove"
- Pending members: "Approve", "Decline" (inline, no modal)

**Admin identification:**
- Query memberships where `role = 'admin'` for this neighborhood
- Display "(Admin)" badge next to name
- "Act as Admin" in header uses this user

### Global User Search (`/staff/users`)

Search-on-demand pattern for finding users across neighborhoods.

- Empty state until user types (no data loaded upfront)
- Search triggers after 2-3 characters (debounced)
- Searches by name and email across all users
- Results show all neighborhoods user belongs to
- Actions: "Act as User", "View in Neighborhood" (links to detail page)

## Impersonation Changes

### Current Behavior

- `startImpersonation(userId)` sets cookie, redirects to `/dashboard`
- User may land in wrong neighborhood context

### New Behavior

| Action | Impersonates | Redirects To |
|--------|-------------|--------------|
| "Act as Admin" (neighborhood header) | Neighborhood's admin user | `/neighborhoods/[slug]` |
| "Act as User" (member row) | Clicked user | `/neighborhoods/[slug]` |
| "Act as User" (global search) | Clicked user | `/dashboard` (or their primary neighborhood) |

### Implementation

1. Extend `startImpersonation` to accept optional `redirectTo` parameter
2. Neighborhood detail page passes `/neighborhoods/[slug]` as redirect
3. Fall back to `/dashboard` if user has no membership (edge case)

### Banner Enhancement

Update `ImpersonationBanner` to show neighborhood context:
> "Viewing as Jane Smith in **Lakewood Heights**" [Stop]

## Data Queries

### Overview Stats

```sql
-- Three simple count queries
SELECT COUNT(*) FROM neighborhoods;
SELECT COUNT(*) FROM users WHERE NOT is_staff_admin(email);
SELECT COUNT(*) FROM items;
```

### Neighborhoods List

```sql
SELECT
  n.*,
  (SELECT COUNT(*) FROM memberships m WHERE m.neighborhood_id = n.id AND m.status = 'active') as member_count,
  (SELECT COUNT(*) FROM items i WHERE i.neighborhood_id = n.id) as item_count
FROM neighborhoods n
ORDER BY n.name;
```

### Neighborhood Detail

```sql
-- Neighborhood info
SELECT * FROM neighborhoods WHERE slug = $1;

-- Members with role
SELECT
  u.id, u.name, u.email, u.avatar_url,
  m.id as membership_id, m.role, m.status, m.created_at as joined_at
FROM memberships m
JOIN users u ON u.id = m.user_id
WHERE m.neighborhood_id = $1
  AND m.deleted_at IS NULL
ORDER BY m.created_at DESC;
```

### User Search

```sql
-- Only runs when search submitted
SELECT
  u.*,
  array_agg(json_build_object(
    'neighborhood_id', m.neighborhood_id,
    'neighborhood_name', n.name,
    'neighborhood_slug', n.slug,
    'role', m.role,
    'status', m.status
  )) as memberships
FROM users u
LEFT JOIN memberships m ON m.user_id = u.id AND m.deleted_at IS NULL
LEFT JOIN neighborhoods n ON n.id = m.neighborhood_id
WHERE (u.name ILIKE $1 OR u.email ILIKE $1)
  AND NOT is_staff_admin(u.email)
GROUP BY u.id
LIMIT 50;
```

## Migration Path

1. Create new route files alongside existing `/staff/page.tsx`
2. Build and test each new route independently
3. Update `/staff/page.tsx` to be the new overview (remove tabs)
4. Delete `staff-client.tsx` and `staff.module.css` once migration complete

## Out of Scope

- Activity metrics (last active, items listed, loans made) - can add later
- Bulk actions on members
- Audit logging of admin actions
- Dark mode for admin pages

## Open Questions

None - design approved through brainstorming session.
