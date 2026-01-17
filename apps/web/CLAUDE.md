# Web App Development Guide

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Public auth routes (signin, signup)
│   ├── (protected)/       # Authenticated routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── neighborhoods/ # Neighborhood-scoped pages
│   │   ├── profile/       # User profile
│   │   └── settings/      # Account settings
│   ├── api/               # API routes (minimal usage)
│   ├── join/              # Public join flow
│   ├── globals.css        # CSS variables and global styles
│   ├── responsive.module.css  # Grid utility classes
│   └── layout.tsx         # Root layout with AuthProvider
├── components/            # Shared React components
│   ├── Header.tsx         # Global navigation
│   ├── AuthProvider.tsx   # Client-side auth context
│   ├── NeighborhoodSwitcher.tsx
│   ├── InviteButton.tsx
│   ├── OptimizedImage.tsx
│   ├── AvatarUpload.tsx
│   └── ItemPhotoUpload.tsx
├── lib/                   # Utilities and services
│   ├── supabase/
│   │   ├── server.ts      # Server component client
│   │   ├── client.ts      # Client component client
│   │   └── middleware.ts  # Auth middleware helpers
│   ├── auth.ts            # Auth helpers (isSuperAdmin)
│   ├── validation.ts      # Input validation constants
│   ├── storage.ts         # File upload utilities
│   ├── logger.ts          # Logging utility
│   └── env.ts             # Environment variable access
└── test/                  # Test utilities
```

## Styling Approach

### When to Use CSS Modules
- Reusable components in `/components`
- Route-specific styles that need responsive behavior
- Complex hover/focus states

```typescript
// Component with CSS Module
import styles from "./Header.module.css";
<nav className={styles.nav}>
```

### When to Use Inline Styles Object
- Page-specific layouts in `page.tsx` files
- One-off styling that won't be reused
- Dynamic styles based on state

```typescript
// Page with inline styles (at bottom of file)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem",
  },
  // ... more styles
};
```

### CSS Variables (globals.css)
```css
/* Primary - Violet (main brand, warmer tone) */
--color-primary: #8b5cf6       /* Primary buttons, links */
--color-primary-hover: #7c3aed /* Hover state */
--color-primary-light: #f5f3ff /* Subtle backgrounds, empty states */

/* Accent - Gold (celebrations, new items, milestones) */
--color-accent: #fbbf24        /* "NEW" badges, celebratory moments */
--color-accent-text: #78350f   /* Text on accent background */

/* Community - Great Lakes & Brick Streets */
--color-lake: #0891b2          /* Outdoor, travel categories */
--color-park: #059669          /* Tools, sports categories */
--color-brick: #c2410c         /* Kitchen category */

/* Text */
--color-text: #18181b          /* Body text */
--color-text-secondary: #52525b /* Labels, metadata */
--color-text-muted: #a1a1aa    /* Placeholder, disabled */

/* Backgrounds & Borders */
--color-background: #fafaf9    /* Page background */
--color-surface: #ffffff       /* Card backgrounds */
--color-border: #e4e4e7        /* Standard borders */
--color-border-emphasis: #c4b5fd /* Purple-tinted (outlined buttons, pills) */

/* Transitions */
--transition-fast: 150ms ease  /* Hover states, micro-interactions */
--transition-normal: 250ms ease /* Content transitions */
```

### Button Styling Patterns
```css
/* Primary button - solid purple */
background: var(--color-primary);
color: white;

/* Secondary/Outlined button - purple border */
background: white;
border: 1px solid var(--color-border-emphasis);
color: var(--color-primary);

/* Accent button - gold (use sparingly for celebrations) */
background: var(--color-accent);
color: var(--color-accent-text);
```

### Responsive Grid Utilities (responsive.module.css)
```typescript
import responsive from "@/app/responsive.module.css";

// Available classes:
// responsive.grid2    - 2 columns, stacks on mobile
// responsive.grid3    - 3 columns, stacks on mobile
// responsive.grid4    - 4 columns, 2 on tablet, 1 on mobile
// responsive.gridAuto - Auto-fill with minmax
// responsive.statsRow - Flex row for statistics
// responsive.card     - White card with padding and shadow
// responsive.container - Max-width container
// responsive.pageHeader - Title + action layout
// responsive.actionRow - Button row that stacks on mobile
```

## Design System

### Design Philosophy
Block Club's visual design reflects its community context: a progressive Cleveland streetcar suburb with brick streets, parks, and Great Lakes proximity. The design aims for warmth and approachability over corporate polish.

- **Warm violet primary** instead of cold purple - feels more inviting
- **Community palette** (lake cyan, park green, brick orange) - connects to local character
- **Gold accents for celebration** - new members, new items, milestones
- **Subtle animations** - hover lifts and transitions add life without distraction

### Color Usage Guidelines

| Color | When to Use |
|-------|-------------|
| Primary (violet) | Buttons, links, active states, section title indicators |
| Accent (gold) | "NEW" badges, celebration moments, pinned post borders |
| Lake (cyan) | Outdoor/travel categories, water-related imagery |
| Park (green) | Tools/sports categories, nature-related imagery |
| Brick (orange) | Kitchen category, warmth accents |

### Visual Patterns

**Card Hover Effect**
Cards lift slightly on hover with enhanced shadow:
```css
transition: transform var(--transition-fast), box-shadow var(--transition-fast);
/* on hover: */
transform: translateY(-2px);
box-shadow: var(--shadow-lg);
```

**Button Hover Effect**
Primary buttons lift with a colored shadow:
```css
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
```

**Section Titles**
Include a colored bar indicator:
```css
.sectionTitle::before {
  content: "";
  width: 4px;
  height: 1em;
  background: var(--color-primary);
  border-radius: 2px;
}
```

**Empty States**
Use gradient backgrounds with illustrated icons:
- Gradient from `--color-primary-light` to `--color-surface`
- Circular icon container with shadow and emoji
- Encouraging, community-focused copy

**Content-Type Borders**
- Posts: left border (`border-left: 4px solid var(--color-primary)`)
- Pinned posts: gold left border (`--color-accent`)
- Library items: top border colored by category

### Typography Hierarchy

| Element | Size | Weight | Extra |
|---------|------|--------|-------|
| Page welcome | `--font-size-2xl` | bold | `letter-spacing: -0.02em` |
| Page title | `--font-size-2xl` | bold | `letter-spacing: -0.02em` |
| Section title | `--font-size-xl` | semibold | Has `::before` bar indicator |
| Card title | `--font-size-base` | medium | |
| Body text | `--font-size-sm` | normal | |
| Metadata | `--font-size-xs` | normal | `--color-text-secondary` |

### Accessibility

- All animations respect `prefers-reduced-motion`
- Focus states use `outline: 2px solid var(--color-primary)`
- Minimum touch targets of 44px on mobile
- Color contrast meets WCAG AA standards

## Component Patterns

### Server Components (default)
```typescript
// No "use client" - fetches data server-side
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("*");
  return <div>{/* render data */}</div>;
}
```

### Client Components
Add `"use client"` only when you need:
- `useState`, `useEffect`, `useRef`
- Event handlers (onClick, onChange)
- Browser APIs (localStorage, window)
- Third-party client libraries

```typescript
"use client";
import { useState } from "react";

export function InteractiveComponent() {
  const [isOpen, setIsOpen] = useState(false);
  // ...
}
```

### Context Provider Pattern
```typescript
// AuthProvider wraps app in layout.tsx
import { useAuth } from "@/components/AuthProvider";

// In client component:
const { user, signOut, loading } = useAuth();
```

## Supabase Usage

### Server Components
```typescript
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Data fetch
  const { data, error } = await supabase
    .from("items")
    .select("*, owner:users(id, name)")
    .eq("neighborhood_id", neighborhoodId);
}
```

### Client Components
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";

function MyComponent() {
  const supabase = createClient();

  async function handleSubmit() {
    const { error } = await supabase
      .from("items")
      .insert({ name, neighborhood_id });
  }
}
```

### Join Patterns
```typescript
// Fetch with related data
const { data } = await supabase
  .from("memberships")
  .select(`
    *,
    user:users(id, name, email, avatar_url),
    neighborhood:neighborhoods(*)
  `)
  .eq("user_id", userId);
```

## Form Handling

### Server Actions (preferred)
```typescript
// In page.tsx or separate actions file
async function createItem(formData: FormData) {
  "use server";
  const supabase = await createClient();
  // ... insert data
  redirect(`/neighborhoods/${slug}/library`);
}

// In component
<form action={createItem}>
  <input name="name" required />
  <button type="submit">Create</button>
</form>
```

### Client-Side with State
```typescript
"use client";
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);

  const { error } = await supabase.from("items").insert({...});

  if (error) {
    setError(error.message);
    setLoading(false);
  } else {
    router.push("/success");
  }
}
```

### Validation
```typescript
import { MAX_LENGTHS, validateLength } from "@/lib/validation";

// In form
<input maxLength={MAX_LENGTHS.itemName} />
<textarea maxLength={MAX_LENGTHS.itemDescription} />

// In handler
const error = validateLength(name, "Name", MAX_LENGTHS.itemName);
if (error) setError(error);
```

## Error Handling

### Supabase Queries
```typescript
import { logger } from "@/lib/logger";

const { data, error } = await supabase.from("items").select("*");

if (error) {
  logger.error("Failed to fetch items", error, { neighborhoodId });
  // Handle gracefully - show empty state or error message
}
```

### User Feedback
- Show inline error messages near forms
- Use semantic colors: `--color-error` for errors, `--color-success` for success
- Avoid alert() dialogs - use inline UI instead

## Image Handling

### Uploads
```typescript
import { uploadImage, deleteImage, MAX_FILE_SIZE } from "@/lib/storage";

// Upload
const url = await uploadImage(file, bucket, userId);

// Delete
await deleteImage(url, bucket);
```

### Display
```typescript
import { OptimizedImage } from "@/components/OptimizedImage";

<OptimizedImage
  src={item.photo_urls[0]}
  alt={item.name}
  width={200}
  height={200}
  fallback={<div>No image</div>}
/>
```

## Testing

### Unit Tests (lib/__tests__/)
```typescript
import { describe, it, expect } from "vitest";
import { validateLength, MAX_LENGTHS } from "../validation";

describe("validateLength", () => {
  it("returns null for valid input", () => {
    expect(validateLength("test", "Name", 100)).toBeNull();
  });
});
```

### Run Commands
```bash
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests (needs test env)
npm run test:e2e          # Playwright E2E tests
npm run test:coverage     # Coverage report
```
