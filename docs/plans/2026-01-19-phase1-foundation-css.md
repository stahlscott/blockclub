# Phase 1: Foundation CSS Implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update CSS variables to establish the warm, paper-like visual foundation for the Community Bulletin Board design.

**Architecture:** All changes are in `globals.css` CSS variables. Existing components will inherit the new values automatically.

**Tech Stack:** CSS custom properties

---

## Task 1: Update Background and Add Secondary Color

**Files:**
- Modify: `apps/web/src/app/globals.css:32-36`

**Step 1: Update background and add secondary color**

Change the backgrounds section to:

```css
/* Backgrounds */
--color-background: #FFFEF9;  /* Warm cream (was #fafaf9) */
--color-surface: #ffffff;
--color-border: #e7e5e4;      /* Stone-200 (was zinc #e4e4e7) */
--color-border-emphasis: #d6d3d1;  /* Stone-300 - warm neutral (was purple #c4b5fd) */

/* Secondary - Lake Blue (for navigation, headers, structural elements) */
--color-secondary: #5B8A9A;
--color-secondary-light: #E8F1F3;
--color-secondary-hover: #4A7382;
```

**Step 2: Verify change**

Run: `npm run dev:web` and visually confirm:
- Page background is slightly warmer/cream colored
- Borders appear warmer (stone instead of zinc)

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: warm background and add secondary color"
```

---

## Task 2: Warm the Gray Text Colors

**Files:**
- Modify: `apps/web/src/app/globals.css:27-30`

**Step 1: Update text colors to stone tones**

Change:

```css
/* Text */
--color-text: #1c1917;           /* Stone-900 (was zinc #18181b) */
--color-text-secondary: #57534e; /* Stone-600 (was zinc #52525b) */
--color-text-muted: #a8a29e;     /* Stone-400 (was zinc #a1a1aa) */
```

**Step 2: Verify change**

Visually confirm text has a slightly warmer tone (less blue-gray, more warm-gray).

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: warm text colors from zinc to stone"
```

---

## Task 3: Simplify Shadow System

**Files:**
- Modify: `apps/web/src/app/globals.css:109-111`

**Step 1: Update shadows to two-level system**

Change:

```css
/* Shadows - two levels only: resting and elevated */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);           /* Minimal, barely visible */
--shadow-resting: 0 1px 3px rgba(0, 0, 0, 0.08);      /* Cards at rest */
--shadow-elevated: 0 4px 8px rgba(0, 0, 0, 0.12);     /* Hover/focus states */

/* Legacy aliases for backwards compatibility */
--shadow-md: var(--shadow-resting);
--shadow-lg: var(--shadow-elevated);
```

**Step 2: Verify change**

Cards should have slightly softer shadows. Hover states should feel natural.

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: simplify shadow system to resting/elevated"
```

---

## Task 4: Standardize Border Radius

**Files:**
- Modify: `apps/web/src/app/globals.css:104-107`

**Step 1: Update radius values**

Change:

```css
/* Border radius - 6px default for index-card feel */
--radius-sm: 4px;              /* Small elements, tags */
--radius-default: 6px;         /* Standard cards, inputs, buttons */
--radius-md: 6px;              /* Alias for default */
--radius-lg: 8px;              /* Larger containers, modals */
--radius-full: 9999px;         /* Avatars, pills */
```

**Step 2: Verify change**

Cards and inputs should have slightly tighter corners (6px vs 8px).

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: tighten border radius for index-card feel"
```

---

## Task 5: Update Page Container Spacing

**Files:**
- Modify: `apps/web/src/app/globals.css:212-230`

**Step 1: Update page container padding**

The design specifies `space-8` (32px) for page padding. Update:

```css
/* Standard page container with responsive width */
.pageContainer {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);  /* 24px 16px on mobile */
}

@media (min-width: 640px) {
  .pageContainer {
    padding: var(--space-8) var(--space-6);  /* 32px 24px on tablet */
  }
}

@media (min-width: 1024px) {
  .pageContainer {
    padding: var(--space-8);  /* 32px all around on desktop */
  }
}
```

**Step 2: Verify change**

Pages should have generous, consistent margins.

**Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: standardize page container spacing"
```

---

## Task 6: Run Build and Verify

**Step 1: Run typecheck and build**

```bash
npm run typecheck && npm run build:web
```

Expected: No errors (CSS-only changes shouldn't break types or build).

**Step 2: Visual verification**

Start dev server and check:
- [ ] Background is warm cream, not stark white
- [ ] Text has warm-gray tone
- [ ] Card shadows are softer
- [ ] Border radius feels like index cards
- [ ] Page margins are generous

**Step 3: Final commit if any adjustments needed**

---

## Summary of CSS Variable Changes

| Variable | Before | After |
|----------|--------|-------|
| `--color-background` | `#fafaf9` | `#FFFEF9` |
| `--color-border` | `#e4e4e7` (zinc) | `#e7e5e4` (stone) |
| `--color-border-emphasis` | `#c4b5fd` (purple) | `#d6d3d1` (stone) |
| `--color-text` | `#18181b` (zinc) | `#1c1917` (stone) |
| `--color-text-secondary` | `#52525b` (zinc) | `#57534e` (stone) |
| `--color-text-muted` | `#a1a1aa` (zinc) | `#a8a29e` (stone) |
| `--shadow-*` | 3 levels | 2 levels + aliases |
| `--radius-md` | `8px` | `6px` |
| NEW: `--color-secondary` | - | `#5B8A9A` |
| NEW: `--radius-default` | - | `6px` |
