# Design Tokens Reference

This document describes the CSS custom properties (design tokens) defined in `globals.css`.

## Colors

### Primary Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | #2563eb | Primary buttons, links, focus rings |
| `--color-primary-dark` | #1d4ed8 | Darker variant (deprecated, use hover) |
| `--color-primary-hover` | #1d4ed8 | Hover state for primary elements |
| `--color-primary-active` | #1e40af | Active/pressed state |

### Text Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-text` | #111 | Primary body text, headings |
| `--color-text-secondary` | #666 | Labels, metadata, less emphasis |
| `--color-text-muted` | #999 | Placeholders, disabled text, timestamps |

### Background Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | #f5f5f5 | Page background |
| `--color-surface` | #fff | Cards, modals, elevated surfaces |
| `--color-border` | #e5e5e5 | Borders, dividers |

### Semantic Colors (Status)
Each status has a main color, light background, and border variant:

| Status | Main | Light (background) | Border |
|--------|------|-------------------|--------|
| Error | `--color-error` #dc2626 | `--color-error-light` | `--color-error-border` |
| Success | `--color-success` #16a34a | `--color-success-light` | `--color-success-border` |
| Warning | `--color-warning` #f59e0b | `--color-warning-light` | `--color-warning-border` |
| Info | `--color-info` #2563eb | `--color-info-light` | `--color-info-border` |

**Usage example (banner):**
```css
.errorBanner {
  background-color: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  color: var(--color-error);
}
```

### Item Availability Colors
| Token | Usage |
|-------|-------|
| `--color-available` / `--color-available-text` | Available items (green) |
| `--color-borrowed` / `--color-borrowed-text` | Borrowed items (amber) |
| `--color-unavailable` / `--color-unavailable-text` | Unavailable items (red) |

---

## Spacing

Based on a 4px grid system. Use for padding, margin, and gap.

| Token | Value | Common Uses |
|-------|-------|-------------|
| `--space-1` | 4px | Inline element gaps, tight spacing |
| `--space-2` | 8px | Icon-text gaps, compact padding |
| `--space-3` | 12px | Small internal padding |
| `--space-4` | 16px | Default component padding, form gaps |
| `--space-5` | 20px | Medium spacing |
| `--space-6` | 24px | Section spacing, card padding |
| `--space-8` | 32px | Large gaps, section margins |
| `--space-10` | 40px | Page section spacing |
| `--space-12` | 48px | Major layout spacing |

**Guidelines:**
- `--space-2` to `--space-3`: Tight, within components
- `--space-4` to `--space-6`: Standard component padding
- `--space-8` to `--space-12`: Between sections

---

## Typography

### Font Family
| Token | Value |
|-------|-------|
| `--font-sans` | system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif |

### Font Sizes
| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | 12px | Badges, fine print |
| `--font-size-sm` | 14px | Secondary text, labels, metadata |
| `--font-size-base` | 16px | Body text (default) |
| `--font-size-lg` | 18px | Slightly emphasized text |
| `--font-size-xl` | 20px | Section headings |
| `--font-size-2xl` | 24px | Page headings |
| `--font-size-3xl` | 28px | Large page titles |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `--font-weight-normal` | 400 | Body text |
| `--font-weight-medium` | 500 | Subtle emphasis, buttons |
| `--font-weight-semibold` | 600 | Headings, strong emphasis |
| `--font-weight-bold` | 700 | Extra emphasis, stats |

### Line Heights
| Token | Value | Usage |
|-------|-------|-------|
| `--line-height-tight` | 1.25 | Headings, single-line text |
| `--line-height-normal` | 1.5 | Body text (default) |
| `--line-height-relaxed` | 1.625 | Long-form content |

---

## Borders & Shadows

### Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements, buttons, inputs |
| `--radius-md` | 6px | Small cards, dropdowns |
| `--radius-lg` | 8px | Cards, modals |
| `--radius-full` | 9999px | Pills, avatars, circular buttons |

### Box Shadows
| Token | Usage |
|-------|-------|
| `--shadow-sm` | Subtle elevation (inputs, small cards) |
| `--shadow-md` | Standard cards, dropdowns |
| `--shadow-lg` | Elevated elements, modals |

---

## When to Use Tokens vs Hardcoded Values

### Always Use Tokens For:
- Colors (all of them)
- Border radius
- Box shadows
- Spacing in CSS Modules

### Acceptable to Hardcode:
- One-off pixel values in inline styles
- Responsive breakpoints (use established values: 480px, 640px, 768px, 1024px)
- Specific layout measurements (max-width: 1200px)

### In Inline Styles
CSS variables work in inline styles:
```typescript
const styles = {
  container: {
    padding: "var(--space-6)",
    borderRadius: "var(--radius-lg)",
  }
};
```

However, for one-off values in inline styles, hardcoding is acceptable:
```typescript
// Acceptable in inline styles
padding: "1.5rem"  // equivalent to --space-6

// Preferred in CSS Modules
padding: var(--space-6);
```

---

## Responsive Utilities

See `responsive.module.css` for pre-built responsive classes:
- `.grid2`, `.grid3`, `.grid4` - Responsive grids
- `.container` - Max-width container
- `.card` - Styled card
- `.pageHeader` - Title + action layout
- `.actionRow` - Button row that stacks on mobile
