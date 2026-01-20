# Storybook Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Storybook with a11y addon and document three context-free components (Footer, Greeting, InviteButton).

**Architecture:** Storybook 8 with Next.js framework integration. Stories colocated with components. Global CSS loaded via preview.ts. A11y checks run automatically per story.

**Tech Stack:** @storybook/nextjs, @storybook/addon-essentials, @storybook/addon-a11y

---

## Task 1: Create Feature Branch

**Step 1: Create and checkout branch**

```bash
git checkout -b feature/storybook-setup
```

**Step 2: Verify branch**

```bash
git branch --show-current
```

Expected: `feature/storybook-setup`

---

## Task 2: Install Storybook Dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install Storybook packages**

```bash
cd apps/web && npm install -D storybook @storybook/nextjs @storybook/addon-essentials @storybook/addon-a11y @storybook/test
```

**Step 2: Verify installation**

```bash
cat apps/web/package.json | grep storybook
```

Expected: Multiple storybook packages listed in devDependencies

---

## Task 3: Add Storybook Scripts to package.json

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Add scripts**

In `apps/web/package.json`, add to the `"scripts"` section:

```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

**Step 2: Verify scripts exist**

```bash
cd apps/web && npm run storybook --help 2>&1 | head -5
```

Expected: Should show storybook help or attempt to run

---

## Task 4: Create Storybook Configuration

**Files:**
- Create: `apps/web/.storybook/main.ts`

**Step 1: Create .storybook directory**

```bash
mkdir -p apps/web/.storybook
```

**Step 2: Create main.ts**

```typescript
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
};

export default config;
```

---

## Task 5: Create Storybook Preview Configuration

**Files:**
- Create: `apps/web/.storybook/preview.ts`

**Step 1: Create preview.ts**

```typescript
import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
        ],
      },
    },
  },
};

export default preview;
```

---

## Task 6: Verify Storybook Starts

**Step 1: Start Storybook**

```bash
cd apps/web && npm run storybook
```

Expected: Storybook launches at http://localhost:6006 with "No stories found" message

**Step 2: Stop Storybook**

Press `Ctrl+C` to stop.

**Step 3: Commit configuration**

```bash
git add apps/web/.storybook apps/web/package.json apps/web/package-lock.json
git commit -m "chore: add Storybook configuration with a11y addon"
```

---

## Task 7: Create Footer Story

**Files:**
- Create: `apps/web/src/components/Footer.stories.tsx`

**Step 1: Create the story file**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { Footer } from "./Footer";

const meta: Meta<typeof Footer> = {
  title: "Components/Footer",
  component: Footer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Default: Story = {};
```

**Step 2: Verify in Storybook**

```bash
cd apps/web && npm run storybook
```

Expected: Footer appears under Components/Footer in sidebar. A11y panel shows no violations.

**Step 3: Stop and commit**

```bash
git add apps/web/src/components/Footer.stories.tsx
git commit -m "feat: add Footer story"
```

---

## Task 8: Create Greeting Story

**Files:**
- Create: `apps/web/src/components/Greeting.stories.tsx`

The Greeting component is time-based and has no props. We'll document its behavior.

**Step 1: Create the story file**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { Greeting } from "./Greeting";

const meta: Meta<typeof Greeting> = {
  title: "Components/Greeting",
  component: Greeting,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Displays a time-based greeting (Good morning/afternoon/evening). " +
          "Renders 'Welcome' on server, then updates to time-based greeting on client.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Greeting>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows the greeting based on current local time.",
      },
    },
  },
};
```

**Step 2: Verify in Storybook**

Navigate to Components/Greeting. Should show current time-based greeting.

**Step 3: Commit**

```bash
git add apps/web/src/components/Greeting.stories.tsx
git commit -m "feat: add Greeting story"
```

---

## Task 9: Create InviteButton Stories

**Files:**
- Create: `apps/web/src/components/InviteButton.stories.tsx`

InviteButton has a `slug` prop and a `variant` prop with three options.

**Step 1: Create the story file**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { InviteButton } from "./InviteButton";

const meta: Meta<typeof InviteButton> = {
  title: "Components/InviteButton",
  component: InviteButton,
  tags: ["autodocs"],
  args: {
    slug: "lakewood-heights",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["card", "link", "text"],
      description: "Visual style of the button",
    },
    slug: {
      control: "text",
      description: "Neighborhood slug for the invite URL",
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Button that opens a modal with invite link and QR code. " +
          "Supports copy-to-clipboard and QR download.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof InviteButton>;

export const Card: Story = {
  args: {
    variant: "card",
  },
  parameters: {
    docs: {
      description: {
        story: "Default card variant with icon. Used in dashboard cards.",
      },
    },
  },
};

export const Link: Story = {
  args: {
    variant: "link",
  },
  parameters: {
    docs: {
      description: {
        story: "Link-style variant with wave emoji. Used in navigation.",
      },
    },
  },
};

export const Text: Story = {
  args: {
    variant: "text",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal text button. Used inline in sentences.",
      },
    },
  },
};
```

**Step 2: Verify in Storybook**

- Navigate to Components/InviteButton
- Check all three variants render correctly
- Click button to verify modal opens
- Check a11y panel for any violations

**Step 3: Commit**

```bash
git add apps/web/src/components/InviteButton.stories.tsx
git commit -m "feat: add InviteButton stories with all variants"
```

---

## Task 10: Add Accessibility Section to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (root)

**Step 1: Find the Component Guidelines section**

The new Accessibility section should go after "## Component Guidelines" (around line 260).

**Step 2: Add the Accessibility section**

After the Component Guidelines section, add:

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

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add accessibility guidelines to CLAUDE.md"
```

---

## Task 11: Add a11y Audit to TODO.md

**Files:**
- Modify: `TODO.md`

**Step 1: Add to Tech Debt section**

In the Tech Debt section (around line 72), add:

```markdown
- [ ] **Accessibility audit of existing components** - Run axe-core or Lighthouse on key pages. Prioritize: signin, dashboard, library. Add missing labels, fix contrast issues, ensure keyboard navigation.
```

**Step 2: Update Developer Experience section**

Change the Storybook line from:
```markdown
- [ ] Storybook component library
```

To:
```markdown
- [x] Storybook component library
```

**Step 3: Commit**

```bash
git add TODO.md
git commit -m "docs: add a11y audit task, mark Storybook complete"
```

---

## Task 12: Final Verification and Merge

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors

**Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors (or only pre-existing warnings)

**Step 3: Start Storybook and verify all stories**

```bash
cd apps/web && npm run storybook
```

Verify:
- [ ] Footer renders with email link
- [ ] Greeting shows time-based text
- [ ] InviteButton shows all 3 variants
- [ ] Modal opens when clicking any InviteButton
- [ ] A11y panel shows no critical violations

**Step 4: Merge to main**

```bash
git checkout main
git merge feature/storybook-setup
git push
```

---

## Summary

After completing all tasks:

| What | Where |
|------|-------|
| Storybook config | `apps/web/.storybook/` |
| Footer story | `apps/web/src/components/Footer.stories.tsx` |
| Greeting story | `apps/web/src/components/Greeting.stories.tsx` |
| InviteButton story | `apps/web/src/components/InviteButton.stories.tsx` |
| A11y guidelines | `CLAUDE.md` |
| A11y audit task | `TODO.md` |

**Commands:**
- `npm run storybook` - Start Storybook dev server
- `npm run build-storybook` - Build static Storybook
