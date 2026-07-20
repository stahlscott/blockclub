# Invite & Growth Mode Design

## Problem

The invite button on mobile is a bare wave emoji with no label — undiscoverable even to the app's builder after a short break. More broadly, the app does little to encourage users to invite neighbors, contributing to stalled activation (10 users signed up, low engagement).

## Goals

1. Make the invite action obvious and accessible on all screen sizes
2. Surface invite prompts at contextually appropriate moments
3. Create a "growth mode" that encourages inviting while the neighborhood is small, then recedes as the community reaches critical mass
4. Use `navigator.share()` for low-friction mobile invites, with QR/copy modal as fallback

## Non-Goals

- Analytics or tracking of invite conversions (future work)
- Referral incentives or gamification beyond a progress indicator
- Changes to the join/signup flow itself

## Design

### 1. Growth Threshold Constants

**File:** `lib/growth.ts`

A single file defining all thresholds for growth-mode UI, with a descriptive comment explaining their purpose and encouraging tuning based on real usage data.

```typescript
export const GROWTH_THRESHOLDS = {
  ACTIVE_MEMBERS: 10,
  LIBRARY_ITEMS: 5,
  POSTS: 5,
  DIRECTORY_MEMBERS: 10,
};
```

Helper functions check a count against the relevant threshold:

```typescript
export function isInGrowthMode(activeMemberCount: number): boolean;
export function shouldShowContentNudge(count: number, section: "library" | "posts" | "directory"): boolean;
```

### 2. InviteButton Refactor

**File:** `components/InviteButton.tsx`, `components/InviteButton.module.css`

#### Mobile label visibility

Remove the CSS media query that hides `.linkText` on mobile (the `display: none` at `max-width: 640px`). The `link` variant always shows its label.

#### Copy update

The `link` variant label changes from "Invite" to "Invite Neighbors" for clarity.

#### Native share integration

Add `navigator.share()` as the primary action on supporting devices:

- **Share payload:**
  - `title`: "Join me on Block Club"
  - `text`: "Join our neighborhood on Block Club"
  - `url`: `{origin}/join/{slug}`
- **Behavior:** On devices where `navigator.share` is available, tapping the button triggers the native share sheet. On devices without support (most desktop browsers), the existing QR/copy modal opens instead.

#### Modal unchanged

The existing QR code + copy link modal stays as-is. It serves as the fallback for desktop and the secondary QR use case.

### 3. Dashboard Growth Card

**Files:** New component `components/GrowthCard.tsx` + `components/GrowthCard.module.css`

**Placement:** Dashboard page, between the welcome section and the stats grid. Only rendered when `isInGrowthMode(activeMemberCount)` returns true.

**Layout (compact with social proof):**

```
┌──────────────────────────────────────────────────┐
│  Invite your neighbors          [Share Invite]   │
│  3 neighbors have joined so far                  │
│──────────────────────────────────────────────────│
│  (S) (M) (J)  Your neighbors on Block Club       │
└──────────────────────────────────────────────────┘
```

- Left: heading + member count subtext
- Right: "Share Invite" button
- Bottom row: avatar stack of current members + label
- The "Share Invite" button opens the same share/QR modal as InviteButton

**Styling:** Follows existing card patterns — white background, warm border, subtle shadow. Uses CSS variables from the design system.

**Data:** The dashboard already fetches member data and stats. The growth card uses `stats.neighborsCount` for the count and `recentMembers` for the avatar stack. No additional queries needed.

### 4. Contextual Invite Nudges

#### True empty states (0 items/posts)

**Files modified:** `library/library-client.tsx`, `posts/posts-client.tsx`, `directory/directory-client.tsx` (or equivalent)

Enhance existing empty-state blocks by adding a secondary invite action below the current create button:

```
  📚
  Nothing here yet, add something your neighbors might need.
  [Share an item]
  or invite neighbors who might share theirs → [Share Invite]
```

The invite action triggers the same share/QR modal. The existing create action remains primary.

Only shown when the neighborhood is in growth mode (`isInGrowthMode` — fewer than 10 active members). If the neighborhood has 50 members and 0 library items, the empty state shows only the create action — nudging to invite is irrelevant when the community is already established.

Note: empty state invite CTAs check *member count* (is the neighborhood small?), while sparse content nudges check *content count* (is this section thin?). Both conditions must be true for sparse nudges — a small neighborhood with 20 library items doesn't need a library nudge.

#### Sparse content states (below threshold, not empty)

**Files:** New component `components/InviteNudge.tsx` + `components/InviteNudge.module.css`

A reusable nudge card placed after existing content when the count is below the section threshold.

**Copy varies by section:**
- Library: "Know someone who'd lend their tools? Share Block Club with them"
- Posts: "A livelier board starts with more neighbors"
- Directory: "The more neighbors who join, the more useful Block Club becomes"

Each nudge includes a "Share Invite" button that opens the share/QR modal.

**Styling:** Subtle — lighter background (primary-light), no heavy shadow. Present but not dominant. Matches the "invitation, not dead end" tone.

### 5. Share/Modal Logic Extraction

The share + fallback-to-modal logic is currently inline in `InviteButton`. Since both `GrowthCard` and `InviteNudge` need the same behavior, extract it:

**Option A:** Extract a `useInvite(slug)` hook that returns `{ handleInvite, modal }` — the handler tries `navigator.share()` and falls back to showing the modal. Components render `{modal}` and wire `handleInvite` to their button's onClick.

**Option B:** Keep `InviteButton` as the source of truth and use its variants. GrowthCard and InviteNudge render an `<InviteButton>` with appropriate variant/styling.

**Recommended: Option A.** The growth card and nudge card have their own layouts and button styles — they don't want to be constrained by InviteButton's variants. A hook shares the logic without coupling the UI.

## Files Changed

| File | Change |
|------|--------|
| `lib/growth.ts` | New — threshold constants and helpers |
| `lib/hooks/useInvite.ts` | New — share/modal logic hook |
| `components/InviteButton.tsx` | Refactor to use `useInvite` hook, update label |
| `components/InviteButton.module.css` | Remove mobile `.linkText` hiding |
| `components/GrowthCard.tsx` | New — dashboard growth card |
| `components/GrowthCard.module.css` | New — growth card styles |
| `components/InviteNudge.tsx` | New — contextual nudge card |
| `components/InviteNudge.module.css` | New — nudge card styles |
| `dashboard/page.tsx` | Add GrowthCard below welcome section |
| `library/library-client.tsx` | Add invite to empty state + InviteNudge for sparse |
| `posts/posts-client.tsx` | Add invite to empty state + InviteNudge for sparse |
| `directory/directory-client.tsx` | Add InviteNudge for sparse |

## Testing

- **Unit tests:** `lib/__tests__/growth.test.ts` — threshold helpers with boundary cases
- **Storybook:** Stories for GrowthCard, InviteNudge, and updated InviteButton variants
- **Manual testing:** Verify `navigator.share()` on mobile Safari/Chrome, verify modal fallback on desktop
- **E2E:** Verify growth card appears/disappears based on member count (may need test fixtures)
