# Storybook Setup Design

**Date:** 2026-01-20
**Status:** Approved
**Goal:** Set up Storybook for component documentation and isolated development, with accessibility checks integrated into the workflow.

---

## Overview

Storybook will serve as a visual component catalog and development sandbox. Priorities (in order):

1. Component documentation - visual catalog of what exists
2. Isolated development - build/iterate without navigating full app
3. Accessibility checks - catch a11y issues during development
4. Visual regression testing - deferred for later

---

## Project Structure

```
apps/web/
├── .storybook/
│   ├── main.ts          # Storybook config (addons, framework)
│   └── preview.ts       # Global decorators, parameters
├── src/
│   └── components/
│       ├── Footer.tsx
│       ├── Footer.module.css
│       ├── Footer.stories.tsx   # Stories colocated with components
│       └── ...
```

**Key decisions:**
- Stories live next to components (`ComponentName.stories.tsx`)
- TypeScript for stories (matches codebase, enables autocomplete)
- CSS Modules handled automatically by Storybook's webpack config

---

## Configuration

### main.ts

```typescript
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",  // Controls, Actions, Viewport, Backgrounds
    "@storybook/addon-a11y",        // Accessibility checks per story
  ],
  framework: {
    name: "@storybook/nextjs",      // Handles Next.js specifics (Image, fonts, etc.)
    options: {},
  },
  staticDirs: ["../public"],        // Serve public assets
};

export default config;
```

### preview.ts

```typescript
import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    a11y: {
      config: { rules: [{ id: "color-contrast", enabled: true }] },
    },
  },
};

export default preview;
```

---

## Dependencies

```bash
npm install -D @storybook/nextjs @storybook/addon-essentials @storybook/addon-a11y storybook
```

---

## Package.json Scripts

```json
{
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

---

## Initial Stories

### Phase 1: Context-free components

1. **Footer** - Simplest component, validates setup works
2. **Greeting** - Props-based, demonstrates controls
3. **InviteButton** - Interactive, demonstrates actions

### Story Template

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { Footer } from "./Footer";

const meta: Meta<typeof Footer> = {
  title: "Components/Footer",
  component: Footer,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Default: Story = {};
```

### Story with Props

```typescript
export const Default: Story = {
  args: { name: "Sarah" },
};

export const LongName: Story = {
  args: { name: "Alexandria" },
};
```

### Naming Conventions

- `title: "Components/ComponentName"` - Groups under Components folder
- Export names describe variants: `Default`, `Loading`, `WithError`, `Empty`

---

## Phase 2: Context-dependent components (Deferred)

Components that need auth or neighborhood context:
- Header
- UserMenu
- NeighborhoodSwitcher
- ImpersonationBanner

Will require mock providers or story-level decorators. Address when needed.

---

## Accessibility Guidelines

### Addition to CLAUDE.md

New section after "Component Guidelines":

```markdown
## Accessibility (a11y)

### Core Principles
- **Semantic HTML first** - Use `<button>`, `<nav>`, `<main>`, `<article>` over generic `<div>`
- **Interactive elements are focusable** - Buttons, links, inputs must be keyboard accessible
- **Color is not the only indicator** - Pair color with icons, text, or patterns
- **Images have alt text** - Decorative images use `alt=""`

### Development Workflow
- **Storybook a11y addon** - Check the Accessibility panel for each story. Fix violations before merging.
- **Keyboard testing** - Tab through interactive components. Focus states must be visible.
- **Minimum contrast** - 4.5:1 for normal text, 3:1 for large text (18px+)

### Common Patterns
- Form inputs: Always pair with `<label>` using `htmlFor`
- Icon buttons: Include `aria-label` describing the action
- Loading states: Use `aria-busy="true"` on containers
- Error messages: Connect to inputs via `aria-describedby`
```

### Addition to TODO.md

```markdown
- [ ] **Accessibility audit of existing components** - Run axe-core or Lighthouse on key pages. Prioritize: signin, dashboard, library. Add missing labels, fix contrast issues, ensure keyboard navigation.
```

---

## Implementation Checklist

- [ ] Install Storybook dependencies
- [ ] Create `.storybook/main.ts`
- [ ] Create `.storybook/preview.ts`
- [ ] Add scripts to `package.json`
- [ ] Create `Footer.stories.tsx`
- [ ] Create `Greeting.stories.tsx`
- [ ] Create `InviteButton.stories.tsx`
- [ ] Add Accessibility section to `CLAUDE.md`
- [ ] Add a11y audit task to `TODO.md`
- [ ] Verify `npm run storybook` works

---

## Not Included (Deferred)

- Visual regression testing (Chromatic, Percy)
- Design system documentation
- Mock providers for context-dependent components
- CI integration for Storybook builds
