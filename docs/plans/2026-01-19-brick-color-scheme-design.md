# Block Club Color Scheme Update: Brick Street Identity

**Date:** 2026-01-19
**Status:** Proposed

## Overview

Update Block Club's color scheme from violet-primary to brick-primary, reflecting the neighborhood's distinctive brick streets and brick houses. This grounds the app's identity in the physical character of the community.

## Rationale

The original violet primary was chosen as the local high school color, but brick better represents what makes this neighborhood distinctive:
- Rare brick-paved streets
- Many brick houses in the area
- Warm, neighborly, established feel

## Color Palette

### Primary - Warm Rust Brick

Inspired by the sun-baked, orange-toned brick found on the street and local houses.

```css
--color-primary: #A65D4C;        /* Buttons, links, interactive elements */
--color-primary-dark: #8B4D3F;   /* Hover state */
--color-primary-hover: #8B4D3F;  /* Alias */
--color-primary-active: #7A4236; /* Pressed/active state */
--color-primary-light: #FDF5F3;  /* Subtle backgrounds, empty states */
```

**Usage:** All interactive elements - buttons, links, focus rings, form actions.

### Secondary - Lake Blue (unchanged)

Maintains the Great Lakes regional connection and provides cool contrast to warm brick.

```css
--color-secondary: #5B8A9A;      /* Navigation, headers, structural elements */
--color-secondary-light: #E8F1F3;
--color-secondary-hover: #4A7382;
```

**Usage:** Navigation, headers, structural elements, info states.

### Accent - Sunny Yellow

Cheerful, celebratory - like sunshine on a brick street.

```css
--color-accent: #EAB308;         /* NEW badges, pinned posts, celebrations */
--color-accent-hover: #CA9A06;
--color-accent-text: #713F12;    /* Text on accent backgrounds */
```

**Usage:** Celebration moments only - NEW badges, pinned post borders, milestones. Use sparingly. Never for primary actions.

### Category Colors

For library item type indicators (4px top border on cards).

```css
--color-lake: #0891b2;           /* Outdoor, travel items - unchanged */
--color-lake-light: #ecfeff;

--color-park: #059669;           /* Tools, sports items - unchanged */
--color-park-light: #ecfdf5;

--color-kitchen: #8B4567;        /* Kitchen items - NEW (was brick orange) */
--color-kitchen-light: #F9F0F4;
```

**Note:** Renamed from `--color-brick` to `--color-kitchen` since "brick" now refers to the primary brand color. The plum tone evokes wine, jam, and kitchen warmth.

### Semantic Colors

Status colors remain unchanged for consistency and accessibility:

```css
--color-error: #dc2626;          /* Errors */
--color-success: #16a34a;        /* Success */
--color-warning: #f59e0b;        /* Warnings */
```

Info state now uses Lake Blue (was violet):

```css
--color-info: #5B8A9A;           /* Tooltips, info notices, highlights */
--color-info-light: #E8F1F3;
--color-info-border: #A8C5CF;
```

---

## UI Element Mapping

### Buttons

| Element | Old | New |
|---------|-----|-----|
| Primary background | Violet `#8b5cf6` | Brick `#A65D4C` |
| Primary hover | `#7c3aed` | `#8B4D3F` |
| Hover shadow | `rgba(139, 92, 246, 0.25)` | `rgba(166, 93, 76, 0.25)` |
| Outlined border/text | Violet | Brick |

### Links

- Default: Brick `#A65D4C`
- Hover: `#8B4D3F`

### Focus States

- Focus ring: `outline: 2px solid var(--color-primary)` (now brick)

### Posts

- Regular posts: Brick left border (4px)
- Pinned posts: Yellow left border (accent)

### Header/Navigation

- Remains Lake Blue - no change

### Empty States

- Gradient from `--color-primary-light` (#FDF5F3) to white
- Icon containers use brick-tinted background

### Badges

- "NEW" badge: Yellow background, dark brown text
- Status badges: Unchanged semantic colors

---

## Implementation Changes

### globals.css Updates

```css
/* Primary - Warm Rust Brick (was Violet) */
--color-primary: #A65D4C;
--color-primary-dark: #8B4D3F;
--color-primary-hover: #8B4D3F;
--color-primary-active: #7A4236;
--color-primary-light: #FDF5F3;

/* Accent - Sunny Yellow (was Gold, slightly adjusted) */
--color-accent: #EAB308;
--color-accent-hover: #CA9A06;
--color-accent-text: #713F12;

/* Rename brick to kitchen, new plum color */
--color-kitchen: #8B4567;
--color-kitchen-light: #F9F0F4;
/* Remove --color-brick and --color-brick-light */

/* Info state - now Lake Blue */
--color-info: #5B8A9A;
--color-info-light: #E8F1F3;
--color-info-border: #A8C5CF;
```

### Component Updates Required

1. **Any file referencing `--color-brick`** → rename to `--color-kitchen`
2. **Button hover shadows** → update rgba values from violet to brick
3. **Focus ring color** → automatically updates via CSS variable

### Search for affected files

```bash
# Find references to old brick color variable
grep -r "color-brick" apps/web/src/

# Find hardcoded violet shadows
grep -r "139, 92, 246" apps/web/src/
```

---

## Design Considerations

### Warm/Cool Balance

The palette maintains balance:
- **Warm:** Brick primary, yellow accent, kitchen plum (partial)
- **Cool:** Lake Blue secondary, lake cyan, park green

### Accessibility

- Brick `#A65D4C` on white: 4.5:1 contrast ratio (AA compliant)
- All semantic colors unchanged, already accessible
- Focus states remain high contrast

### Continuity

- Lake Blue secondary unchanged - maintains regional identity
- Category system intact - only kitchen color changes
- Semantic colors unchanged - familiar status indicators

---

## Future Tasks

After implementing the color scheme:

1. Review any illustrations or decorative elements that may use old violet
2. Update any documentation screenshots
3. Consider if CLAUDE.md design section needs updates to reflect new colors
