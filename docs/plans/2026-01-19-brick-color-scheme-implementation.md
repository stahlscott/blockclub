# Brick Color Scheme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace violet primary color with warm rust brick, update accent to sunny yellow, rename kitchen category color to plum, and update all documentation.

**Architecture:** CSS-variable-driven color system. Most changes flow through globals.css automatically. Manual updates needed for hardcoded values and documentation.

**Tech Stack:** CSS custom properties, Next.js, TypeScript

---

## Task 1: Update Core CSS Variables

**Files:**
- Modify: `apps/web/src/app/globals.css:1-60`

**Step 1: Update primary color variables**

Change lines 7-12 from:
```css
/* Primary - Violet (main brand color, warmer tone) */
--color-primary: #8b5cf6;
--color-primary-dark: #7c3aed;
--color-primary-hover: #7c3aed;
--color-primary-active: #6d28d9;
--color-primary-light: #f5f3ff;
```

To:
```css
/* Primary - Warm Rust Brick (neighborhood brick streets) */
--color-primary: #A65D4C;
--color-primary-dark: #8B4D3F;
--color-primary-hover: #8B4D3F;
--color-primary-active: #7A4236;
--color-primary-light: #FDF5F3;
```

**Step 2: Update accent color variables**

Change lines 14-17 from:
```css
/* Accent - Gold (reserved for special moments, celebrations) */
--color-accent: #fbbf24;
--color-accent-hover: #f59e0b;
--color-accent-text: #78350f;
```

To:
```css
/* Accent - Sunny Yellow (celebrations, NEW badges, pinned posts) */
--color-accent: #EAB308;
--color-accent-hover: #CA9A06;
--color-accent-text: #713F12;
```

**Step 3: Rename and recolor brick to kitchen**

Change lines 24-25 from:
```css
--color-brick: #c2410c;
--color-brick-light: #fff7ed;
```

To:
```css
--color-kitchen: #8B4567;
--color-kitchen-light: #F9F0F4;
```

**Step 4: Update info color to Lake Blue**

Change lines 53-55 from:
```css
--color-info: #7c3aed;
--color-info-light: #f3f0ff;
--color-info-border: #c4b5fd;
```

To:
```css
--color-info: #5B8A9A;
--color-info-light: #E8F1F3;
--color-info-border: #A8C5CF;
```

**Step 5: Run typecheck to verify no breakage**

Run: `npm run typecheck`
Expected: All packages pass

**Step 6: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: update color palette to brick primary

- Primary: violet -> warm rust brick (#A65D4C)
- Accent: gold -> sunny yellow (#EAB308)
- Kitchen category: brick orange -> plum (#8B4567)
- Info states: violet -> lake blue (#5B8A9A)"
```

---

## Task 2: Update Library Category CSS

**Files:**
- Modify: `apps/web/src/app/(protected)/neighborhoods/[slug]/library/library.module.css:204`

**Step 1: Rename color-brick to color-kitchen**

Change line 204 from:
```css
.cardKitchen { border-top-color: var(--color-brick); }
```

To:
```css
.cardKitchen { border-top-color: var(--color-kitchen); }
```

**Step 2: Run dev server and visually verify**

Run: `npm run dev:web`
Navigate to: Library page with kitchen items
Expected: Kitchen items show plum top border

**Step 3: Commit**

```bash
git add apps/web/src/app/(protected)/neighborhoods/[slug]/library/library.module.css
git commit -m "style: update kitchen category to use --color-kitchen"
```

---

## Task 3: Update Global Error Page

**Files:**
- Modify: `apps/web/src/app/global-error.tsx:101`

**Step 1: Update hardcoded violet to brick**

Change line 101 from:
```typescript
backgroundColor: "#7c3aed",
```

To:
```typescript
backgroundColor: "#A65D4C",
```

**Step 2: Commit**

```bash
git add apps/web/src/app/global-error.tsx
git commit -m "style: update error page button to brick color"
```

---

## Task 4: Update Design Preview Page

**Files:**
- Modify: `apps/web/src/app/design-preview/page.tsx:40-41`

**Step 1: Update hardcoded color values**

Change lines 40-41 from:
```typescript
primary: "#7c3aed",
primaryLight: "#f3f0ff",
```

To:
```typescript
primary: "#A65D4C",
primaryLight: "#FDF5F3",
```

**Step 2: Commit**

```bash
git add apps/web/src/app/design-preview/page.tsx
git commit -m "style: update design preview to brick colors"
```

---

## Task 5: Update Root CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (Design System section)

**Step 1: Update Color Usage table**

Find the Color Usage table and change:
```markdown
| Color | Purpose |
|-------|---------|
| Violet (`--color-primary`) | Actions: buttons, links, interactive elements |
```

To:
```markdown
| Color | Purpose |
|-------|---------|
| Brick (`--color-primary`) | Actions: buttons, links, interactive elements |
| Sunny Yellow (`--color-accent`) | Celebrations: NEW badges, pinned posts, milestones |
```

**Step 2: Update any violet references in the Design System section**

Search for "violet" and "purple" in the Design System section and update to reference "brick" and "warm" tones instead.

**Step 3: Update the design document reference**

Add reference to the new color scheme design doc alongside the existing one.

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for brick color scheme"
```

---

## Task 6: Update Web App CLAUDE.md

**Files:**
- Modify: `apps/web/CLAUDE.md` (CSS Variables and Design System sections)

**Step 1: Update CSS Variables section**

Find the CSS Variables comment block and update all violet/gold references to brick/yellow:

```css
/* Primary - Warm Rust Brick (neighborhood identity) */
--color-primary: #A65D4C       /* Primary buttons, links */
--color-primary-hover: #8B4D3F /* Hover state */
--color-primary-light: #FDF5F3 /* Subtle backgrounds, empty states */

/* Accent - Sunny Yellow (celebrations, NEW badges) */
--color-accent: #EAB308        /* "NEW" badges, celebratory moments */
--color-accent-text: #713F12   /* Text on accent background */

/* Community - Great Lakes & Neighborhood */
--color-lake: #0891b2          /* Outdoor, travel categories */
--color-park: #059669          /* Tools, sports categories */
--color-kitchen: #8B4567       /* Kitchen category (plum) */
```

**Step 2: Update Color Usage Guidelines table**

Change from violet/gold to brick/yellow descriptions.

**Step 3: Update Button Hover Effect section**

Change:
```css
box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
```

To:
```css
box-shadow: 0 4px 12px rgba(166, 93, 76, 0.25);
```

**Step 4: Update Design Philosophy paragraph**

Change "Warm violet primary" to "Warm brick primary".

**Step 5: Commit**

```bash
git add apps/web/CLAUDE.md
git commit -m "docs: update web CLAUDE.md for brick color scheme"
```

---

## Task 7: Run Full Verification

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: All packages pass

**Step 2: Run unit tests**

Run: `npm run test:unit -w @blockclub/web`
Expected: All 123 tests pass

**Step 3: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 4: Visual verification**

Run: `npm run dev:web`
Check these pages:
- Dashboard (primary buttons should be brick)
- Library (category colors: cyan, green, plum)
- Posts (pinned posts should have yellow border)
- Any page with NEW badges (should be yellow)

**Step 5: Final commit if any fixes needed**

---

## Task 8: Merge Back to Main

**Step 1: Ensure all commits are clean**

Run: `git log --oneline -10`

**Step 2: Switch to main and merge**

```bash
cd /Users/scottstahl/code/blockclub
git checkout main
git merge feature/brick-color-scheme --no-ff -m "feat: implement brick color scheme

Replaces violet primary with warm rust brick to reflect
neighborhood's distinctive brick streets and houses.

Changes:
- Primary: #8b5cf6 -> #A65D4C (brick)
- Accent: #fbbf24 -> #EAB308 (sunny yellow)
- Kitchen category: #c2410c -> #8B4567 (plum)
- Info states: #7c3aed -> #5B8A9A (lake blue)

Design doc: docs/plans/2026-01-19-brick-color-scheme-design.md"
```

**Step 3: Clean up worktree**

```bash
git worktree remove .worktrees/brick-color-scheme
git branch -d feature/brick-color-scheme
```
