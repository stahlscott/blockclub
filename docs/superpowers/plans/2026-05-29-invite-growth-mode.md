# Invite & Growth Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the invite action obvious on all devices, add native share support, and surface contextual invite nudges when a neighborhood is below critical mass.

**Architecture:** A `lib/growth.ts` constants file drives all threshold decisions. A `useInvite` hook extracts shared share/modal logic consumed by three components: the refactored `InviteButton`, a new `GrowthCard` for the dashboard, and a new `InviteNudge` for sparse content sections. Server pages pass member/content counts down so client components can check thresholds.

**Tech Stack:** React 19, Next.js 16 (App Router), CSS Modules, Vitest, Storybook

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/growth.ts` | Threshold constants and helper functions |
| `src/lib/__tests__/growth.test.ts` | Unit tests for threshold helpers |
| `src/lib/hooks/useInvite.ts` | Shared share/modal logic hook |
| `src/components/InviteButton.tsx` | Refactored to use `useInvite` hook |
| `src/components/InviteButton.module.css` | Remove mobile label hiding |
| `src/components/InviteButton.stories.tsx` | Update stories for new behavior |
| `src/components/GrowthCard.tsx` | Dashboard growth card with social proof |
| `src/components/GrowthCard.module.css` | Growth card styles |
| `src/components/GrowthCard.stories.tsx` | Growth card stories |
| `src/components/InviteNudge.tsx` | Contextual nudge for sparse sections |
| `src/components/InviteNudge.module.css` | Nudge card styles |
| `src/components/InviteNudge.stories.tsx` | Nudge card stories |
| `src/app/(protected)/dashboard/page.tsx` | Wire up GrowthCard |
| `src/app/(protected)/neighborhoods/[slug]/library/page.tsx` | Pass member count |
| `src/app/(protected)/neighborhoods/[slug]/library/library-client.tsx` | Add invite to empty + nudge for sparse |
| `src/app/(protected)/neighborhoods/[slug]/posts/page.tsx` | Pass member count |
| `src/app/(protected)/neighborhoods/[slug]/posts/posts-client.tsx` | Add invite to empty + nudge for sparse |
| `src/app/(protected)/neighborhoods/[slug]/directory/page.tsx` | Pass member count |
| `src/app/(protected)/neighborhoods/[slug]/directory/directory-client.tsx` | Add nudge for sparse |

All paths are relative to `apps/web/`.

---

### Task 1: Growth Threshold Constants

**Files:**
- Create: `src/lib/growth.ts`
- Test: `src/lib/__tests__/growth.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/growth.test.ts
import { describe, it, expect } from "vitest";
import {
  GROWTH_THRESHOLDS,
  isInGrowthMode,
  shouldShowContentNudge,
} from "../growth";

describe("growth thresholds", () => {
  describe("GROWTH_THRESHOLDS", () => {
    it("exports expected threshold values", () => {
      expect(GROWTH_THRESHOLDS.ACTIVE_MEMBERS).toBe(10);
      expect(GROWTH_THRESHOLDS.LIBRARY_ITEMS).toBe(5);
      expect(GROWTH_THRESHOLDS.POSTS).toBe(5);
      expect(GROWTH_THRESHOLDS.DIRECTORY_MEMBERS).toBe(10);
    });
  });

  describe("isInGrowthMode", () => {
    it("returns true when member count is below threshold", () => {
      expect(isInGrowthMode(0)).toBe(true);
      expect(isInGrowthMode(5)).toBe(true);
      expect(isInGrowthMode(9)).toBe(true);
    });

    it("returns false when member count meets or exceeds threshold", () => {
      expect(isInGrowthMode(10)).toBe(false);
      expect(isInGrowthMode(50)).toBe(false);
    });
  });

  describe("shouldShowContentNudge", () => {
    it("returns true when library item count is below threshold", () => {
      expect(shouldShowContentNudge(2, "library")).toBe(true);
    });

    it("returns false when library item count meets threshold", () => {
      expect(shouldShowContentNudge(5, "library")).toBe(false);
    });

    it("returns true when posts count is below threshold", () => {
      expect(shouldShowContentNudge(3, "posts")).toBe(true);
    });

    it("returns false when posts count meets threshold", () => {
      expect(shouldShowContentNudge(5, "posts")).toBe(false);
    });

    it("returns true when directory count is below threshold", () => {
      expect(shouldShowContentNudge(7, "directory")).toBe(true);
    });

    it("returns false when directory count meets threshold", () => {
      expect(shouldShowContentNudge(10, "directory")).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -w @blockclub/web -- --reporter=verbose src/lib/__tests__/growth.test.ts`
Expected: FAIL — module `../growth` not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/growth.ts

// Thresholds for "growth mode" UI — tune these based on real usage data.
// When a neighborhood is below these counts, the app surfaces invite nudges
// to encourage community growth. Once thresholds are met, nudges disappear.
export const GROWTH_THRESHOLDS = {
  ACTIVE_MEMBERS: 10,
  LIBRARY_ITEMS: 5,
  POSTS: 5,
  DIRECTORY_MEMBERS: 10,
} as const;

export function isInGrowthMode(activeMemberCount: number): boolean {
  return activeMemberCount < GROWTH_THRESHOLDS.ACTIVE_MEMBERS;
}

const SECTION_THRESHOLDS: Record<"library" | "posts" | "directory", number> = {
  library: GROWTH_THRESHOLDS.LIBRARY_ITEMS,
  posts: GROWTH_THRESHOLDS.POSTS,
  directory: GROWTH_THRESHOLDS.DIRECTORY_MEMBERS,
};

export function shouldShowContentNudge(
  count: number,
  section: "library" | "posts" | "directory"
): boolean {
  return count < SECTION_THRESHOLDS[section];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -w @blockclub/web -- --reporter=verbose src/lib/__tests__/growth.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/growth.ts apps/web/src/lib/__tests__/growth.test.ts
git commit -m "feat: add growth threshold constants and helpers"
```

---

### Task 2: Extract useInvite Hook

**Files:**
- Create: `src/lib/hooks/useInvite.ts`
- Reference: `src/components/InviteButton.tsx` (existing share/modal logic to extract)

- [ ] **Step 1: Create the hooks directory and useInvite hook**

Extract all share + modal logic from `InviteButton.tsx` into a reusable hook. The hook returns everything a consumer needs: the invite URL, a click handler (tries `navigator.share`, falls back to modal), modal state, copy handler, QR download handler, and the modal JSX element.

```typescript
// src/lib/hooks/useInvite.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import styles from "@/components/InviteButton.module.css";

interface UseInviteReturn {
  url: string;
  handleInvite: () => Promise<void>;
  modal: React.ReactNode;
}

export function useInvite(slug: string): UseInviteReturn {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${slug}`
      : `/join/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-HTTPS contexts or if permissions denied
    }
  };

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleDownloadQR = () => {
    const canvas = document.getElementById(
      "invite-qr-canvas"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `invite-${slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Canvas export can fail in rare cases
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
      }
    },
    [handleCloseModal]
  );

  useEffect(() => {
    if (showModal) {
      document.addEventListener("keydown", handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal, handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleInvite = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Block Club",
          text: "Join our neighborhood on Block Club",
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // Share failed or was cancelled — fall through to modal
      }
    }
    setShowModal(true);
  };

  const modal = showModal ? (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Backdrop click is supplementary; keyboard users use Escape or close button
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Invite QR code"
      data-testid="invite-modal"
    >
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Invite to Neighborhood</h2>
        <div className={styles.qrContainer}>
          <QRCodeCanvas
            value={url}
            size={300}
            level="M"
            marginSize={2}
            id="invite-qr-canvas"
          />
        </div>
        <div className={styles.qrUrl}>{url}</div>
        <div className={styles.qrActions}>
          <button
            onClick={handleCopy}
            className={styles.qrButton}
            type="button"
            data-testid="invite-modal-copy-button"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={handleDownloadQR}
            className={styles.qrButtonOutlined}
            type="button"
            data-testid="invite-modal-download-button"
          >
            Download QR
          </button>
        </div>
      </div>
      <button
        className={styles.closeButton}
        onClick={handleCloseModal}
        aria-label="Close"
        type="button"
        data-testid="invite-modal-close-button"
      >
        &times;
      </button>
      <span className={styles.hint}>Press Esc to close</span>
    </div>
  ) : null;

  return { url, handleInvite, modal };
}
```

- [ ] **Step 2: Verify the hook compiles**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No errors related to `useInvite.ts` (there may be pre-existing errors in other files)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/hooks/useInvite.ts
git commit -m "feat: extract useInvite hook for shared share/modal logic"
```

---

### Task 3: Refactor InviteButton to Use Hook

**Files:**
- Modify: `src/components/InviteButton.tsx`
- Modify: `src/components/InviteButton.module.css` (lines 66-78)
- Modify: `src/components/InviteButton.stories.tsx`

- [ ] **Step 1: Rewrite InviteButton to consume useInvite**

Replace the entire component body with the hook. The component becomes a thin wrapper that chooses the right button UI based on variant.

```typescript
// src/components/InviteButton.tsx
"use client";

import { useInvite } from "@/lib/hooks/useInvite";
import styles from "./InviteButton.module.css";

interface InviteButtonProps {
  slug: string;
  variant?: "card" | "link" | "text";
}

export function InviteButton({ slug, variant = "card" }: InviteButtonProps) {
  const { handleInvite, modal } = useInvite(slug);

  if (variant === "text") {
    return (
      <>
        <button onClick={handleInvite} className={styles.textButton} data-testid="invite-button">
          Invite
        </button>
        {modal}
      </>
    );
  }

  if (variant === "link") {
    return (
      <>
        <button onClick={handleInvite} className={styles.linkButton} data-testid="invite-button">
          <span className={styles.linkIcon}>👋</span>
          <span className={styles.linkText}>Invite Neighbors</span>
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <button onClick={handleInvite} className={styles.button} data-testid="invite-button">
        <span className={styles.icon}>🔗</span>
        <span>Invite</span>
      </button>
      {modal}
    </>
  );
}
```

- [ ] **Step 2: Remove mobile label hiding from CSS**

In `src/components/InviteButton.module.css`, remove these lines (inside the `@media (max-width: 640px)` block):

```css
  .linkText {
    display: none;
  }
```

Keep the rest of the mobile media query (the `.linkButton` padding adjustment).

The `@media (max-width: 640px)` block should become:

```css
@media (max-width: 640px) {
  .linkButton {
    padding: var(--space-2) var(--space-3);
  }
}
```

- [ ] **Step 3: Update Storybook stories**

Update the description for the Link story to reflect the new behavior:

```typescript
// src/components/InviteButton.stories.tsx
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
          "Button that triggers native share (on supported devices) or opens a modal with invite link and QR code. " +
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
        story:
          'Link-style variant with wave emoji and "Invite Neighbors" label. ' +
          "Used in dashboard welcome section. Label always visible on mobile.",
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

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/InviteButton.tsx apps/web/src/components/InviteButton.module.css apps/web/src/components/InviteButton.stories.tsx
git commit -m "refactor: InviteButton uses useInvite hook, always shows label on mobile"
```

---

### Task 4: Dashboard Growth Card

**Files:**
- Create: `src/components/GrowthCard.tsx`
- Create: `src/components/GrowthCard.module.css`
- Create: `src/components/GrowthCard.stories.tsx`
- Modify: `src/app/(protected)/dashboard/page.tsx` (lines 208-220)

- [ ] **Step 1: Create GrowthCard component**

```typescript
// src/components/GrowthCard.tsx
"use client";

import { useInvite } from "@/lib/hooks/useInvite";
import styles from "./GrowthCard.module.css";

interface Member {
  id: string;
  user?: {
    name: string | null;
    avatar_url: string | null;
  };
}

interface GrowthCardProps {
  slug: string;
  memberCount: number;
  members: Member[];
}

const AVATAR_COLORS = [
  "#C89B8C",
  "#D4A5A5",
  "#8BAAA8",
  "#E8B4B8",
  "#8B9EAA",
  "#A89B8C",
];

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  return name.replace(/^the\s+/i, "").charAt(0).toUpperCase() || "?";
}

export function GrowthCard({ slug, memberCount, members }: GrowthCardProps) {
  const { handleInvite, modal } = useInvite(slug);

  return (
    <>
      <div className={styles.card} data-testid="growth-card">
        <div className={styles.main}>
          <div className={styles.info}>
            <h2 className={styles.heading}>Invite your neighbors</h2>
            <p className={styles.subtext}>
              {memberCount} neighbor{memberCount !== 1 ? "s" : ""} ha
              {memberCount === 1 ? "s" : "ve"} joined so far
            </p>
          </div>
          <button
            onClick={handleInvite}
            className={styles.shareButton}
            type="button"
            data-testid="growth-card-share-button"
          >
            Share Invite
          </button>
        </div>
        {members.length > 0 && (
          <div className={styles.socialProof}>
            <div className={styles.avatarStack}>
              {members.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className={styles.avatar}
                  style={{ backgroundColor: getAvatarColor(member.user?.name) }}
                  title={member.user?.name || "Neighbor"}
                >
                  {member.user?.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt=""
                      className={styles.avatarImage}
                    />
                  ) : (
                    getInitial(member.user?.name)
                  )}
                </div>
              ))}
            </div>
            <span className={styles.socialProofText}>
              Your neighbors on Block Club
            </span>
          </div>
        )}
      </div>
      {modal}
    </>
  );
}
```

- [ ] **Step 2: Create GrowthCard styles**

```css
/* src/components/GrowthCard.module.css */
.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-warm-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.main {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.info {
  flex: 1;
}

.heading {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin: 0 0 var(--space-1) 0;
}

.subtext {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.shareButton {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);
  white-space: nowrap;
}

.shareButton:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(166, 93, 76, 0.25);
}

.socialProof {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.avatarStack {
  display: flex;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: white;
  font-weight: var(--font-weight-semibold);
  overflow: hidden;
}

.avatar + .avatar {
  margin-left: -8px;
}

.avatarImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.socialProofText {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .main {
    flex-direction: column;
    align-items: stretch;
  }

  .shareButton {
    width: 100%;
    text-align: center;
  }
}
```

- [ ] **Step 3: Create GrowthCard stories**

```typescript
// src/components/GrowthCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { GrowthCard } from "./GrowthCard";

const meta: Meta<typeof GrowthCard> = {
  title: "Components/GrowthCard",
  component: GrowthCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Dashboard card encouraging users to invite neighbors. " +
          "Shows member count, avatar stack, and share invite action. " +
          "Appears when neighborhood is below the growth threshold.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof GrowthCard>;

export const FewMembers: Story = {
  args: {
    slug: "lakewood-heights",
    memberCount: 3,
    members: [
      { id: "1", user: { name: "Sarah", avatar_url: null } },
      { id: "2", user: { name: "Mike", avatar_url: null } },
      { id: "3", user: { name: "Jordan", avatar_url: null } },
    ],
  },
};

export const SingleMember: Story = {
  args: {
    slug: "lakewood-heights",
    memberCount: 1,
    members: [
      { id: "1", user: { name: "Sarah", avatar_url: null } },
    ],
  },
};

export const NoMembers: Story = {
  args: {
    slug: "lakewood-heights",
    memberCount: 0,
    members: [],
  },
};
```

- [ ] **Step 4: Wire GrowthCard into dashboard page**

In `src/app/(protected)/dashboard/page.tsx`, add the import at the top (with the other component imports):

```typescript
import { GrowthCard } from "@/components/GrowthCard";
import { isInGrowthMode } from "@/lib/growth";
```

Then insert the GrowthCard between the welcome section and stats grid. Replace lines 208-220 (the welcome section and opening of stats grid) with:

```tsx
      {primaryNeighborhood && (
        <div className={dashboardStyles.welcomeSection} data-testid="dashboard-welcome-section">
          <div>
            <h1 className={dashboardStyles.welcome}>
              <Greeting />
            </h1>
            <p className={dashboardStyles.neighborhoodName}>{primaryNeighborhood.name}</p>
          </div>
          <InviteButton slug={primaryNeighborhood.slug} variant="link" />
        </div>
      )}

      {primaryNeighborhood && isInGrowthMode(stats.neighborsCount) && (
        <GrowthCard
          slug={primaryNeighborhood.slug}
          memberCount={stats.neighborsCount}
          members={recentMembers}
        />
      )}
```

Note: the stats grid section that follows (line 222 onward) remains unchanged.

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/GrowthCard.tsx apps/web/src/components/GrowthCard.module.css apps/web/src/components/GrowthCard.stories.tsx apps/web/src/app/\(protected\)/dashboard/page.tsx
git commit -m "feat: add GrowthCard to dashboard for neighborhoods below growth threshold"
```

---

### Task 5: InviteNudge Component

**Files:**
- Create: `src/components/InviteNudge.tsx`
- Create: `src/components/InviteNudge.module.css`
- Create: `src/components/InviteNudge.stories.tsx`

- [ ] **Step 1: Create InviteNudge component**

```typescript
// src/components/InviteNudge.tsx
"use client";

import { useInvite } from "@/lib/hooks/useInvite";
import styles from "./InviteNudge.module.css";

type NudgeSection = "library" | "posts" | "directory";

const NUDGE_COPY: Record<NudgeSection, string> = {
  library: "Know someone who\u2019d lend their tools? Share Block Club with them",
  posts: "A livelier board starts with more neighbors",
  directory: "The more neighbors who join, the more useful Block Club becomes",
};

interface InviteNudgeProps {
  slug: string;
  section: NudgeSection;
}

export function InviteNudge({ slug, section }: InviteNudgeProps) {
  const { handleInvite, modal } = useInvite(slug);

  return (
    <>
      <div className={styles.nudge} data-testid={`invite-nudge-${section}`}>
        <p className={styles.text}>{NUDGE_COPY[section]}</p>
        <button
          onClick={handleInvite}
          className={styles.button}
          type="button"
          data-testid={`invite-nudge-${section}-button`}
        >
          Share Invite
        </button>
      </div>
      {modal}
    </>
  );
}
```

- [ ] **Step 2: Create InviteNudge styles**

```css
/* src/components/InviteNudge.module.css */
.nudge {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background-color: var(--color-primary-light);
  border-radius: var(--radius-lg);
  margin-top: var(--space-5);
}

.text {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.button {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);
  white-space: nowrap;
}

.button:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(166, 93, 76, 0.25);
}

@media (max-width: 640px) {
  .nudge {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .button {
    width: 100%;
    text-align: center;
  }
}
```

- [ ] **Step 3: Create InviteNudge stories**

```typescript
// src/components/InviteNudge.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { InviteNudge } from "./InviteNudge";

const meta: Meta<typeof InviteNudge> = {
  title: "Components/InviteNudge",
  component: InviteNudge,
  tags: ["autodocs"],
  args: {
    slug: "lakewood-heights",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Subtle nudge card placed below sparse content sections to encourage inviting neighbors. " +
          "Copy varies by section. Appears when content count is below the growth threshold.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof InviteNudge>;

export const Library: Story = {
  args: { section: "library" },
};

export const Posts: Story = {
  args: { section: "posts" },
};

export const Directory: Story = {
  args: { section: "directory" },
};
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/InviteNudge.tsx apps/web/src/components/InviteNudge.module.css apps/web/src/components/InviteNudge.stories.tsx
git commit -m "feat: add InviteNudge component for sparse content sections"
```

---

### Task 6: Library Page — Empty State Invite + Sparse Nudge

**Files:**
- Modify: `src/app/(protected)/neighborhoods/[slug]/library/page.tsx` (lines 83-89)
- Modify: `src/app/(protected)/neighborhoods/[slug]/library/library-client.tsx` (lines 1-4, 26-31, 147-162)

The library page is a server component that passes data to `LibraryClient`. We need to:
1. Fetch the active member count in the server page
2. Pass `memberCount` and `totalItemCount` to the client component
3. Add invite CTA to the empty state and InviteNudge after sparse content

- [ ] **Step 1: Add member count fetch to library server page**

In `src/app/(protected)/neighborhoods/[slug]/library/page.tsx`, add the member count query. Modify the function body to fetch it in parallel with the existing items query.

Replace the data fetching section (lines 31-41) with:

```typescript
  const { user, neighborhood, supabase } = await getNeighborhoodAccess(slug);

  // Fetch items and member count in parallel
  const [{ data: allItems }, { count: memberCount }] = await Promise.all([
    supabase
      .from("items")
      .select("*, owner:users!items_owner_id_fkey(id, name, avatar_url)")
      .eq("neighborhood_id", neighborhood.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "active"),
  ]);
```

Then update the `LibraryClient` usage (around line 83) to pass the new props:

```tsx
      <LibraryClient
        items={items}
        slug={slug}
        userId={user.id}
        category={category}
        memberCount={memberCount || 0}
        totalItemCount={allItems?.length || 0}
      />
```

- [ ] **Step 2: Update LibraryClient to accept and use new props**

In `src/app/(protected)/neighborhoods/[slug]/library/library-client.tsx`:

Add imports at the top (after existing imports):

```typescript
import { InviteNudge } from "@/components/InviteNudge";
import { isInGrowthMode, shouldShowContentNudge } from "@/lib/growth";
import { useInvite } from "@/lib/hooks/useInvite";
```

Update the Props interface to include the new fields:

```typescript
interface Props {
  items: Item[];
  slug: string;
  userId: string;
  category?: string;
  memberCount: number;
  totalItemCount: number;
}
```

Update the component destructuring:

```typescript
export function LibraryClient({ items, slug, userId, category, memberCount, totalItemCount }: Props) {
```

Add the `useInvite` hook call inside the component (after the existing useState/useEffect/useMemo calls, before the return):

```typescript
  const { handleInvite, modal: inviteModal } = useInvite(slug);
  const growthMode = isInGrowthMode(memberCount);
```

Replace the empty state block (the `else` branch around lines 147-162) with:

```tsx
        <div className={libraryStyles.empty}>
          <div className={libraryStyles.emptyIllustration}>📚</div>
          <p className={libraryStyles.emptyText}>
            {searchQuery || category
              ? "No items match your search."
              : "Nothing here yet, add something your neighbors might need."}
          </p>
          <Link
            href={`/neighborhoods/${slug}/library/new`}
            className={libraryStyles.emptyButton}
          >
            Share an item
          </Link>
          {!searchQuery && !category && growthMode && (
            <p className={libraryStyles.emptyInvite}>
              or{" "}
              <button
                onClick={handleInvite}
                className={libraryStyles.emptyInviteButton}
                type="button"
              >
                invite neighbors
              </button>
              {" "}who might share theirs
            </p>
          )}
        </div>
```

After the items grid (after the closing `</div>` of `responsive.gridAuto`, before the ternary's `:` for empty state), add the sparse nudge:

```tsx
          {growthMode && shouldShowContentNudge(totalItemCount, "library") && (
            <InviteNudge slug={slug} section="library" />
          )}
```

At the end of the return, add `{inviteModal}` so the modal renders when triggered from the empty state button:

The full return structure should be:

```tsx
    <>
      {/* ... existing search/filter UI ... */}

      {filteredItems.length > 0 ? (
        <>
          <div className={responsive.gridAuto}>
            {/* ... existing item cards ... */}
          </div>
          {growthMode && shouldShowContentNudge(totalItemCount, "library") && (
            <InviteNudge slug={slug} section="library" />
          )}
        </>
      ) : (
        <div className={libraryStyles.empty}>
          {/* ... empty state with invite CTA ... */}
        </div>
      )}
      {inviteModal}
    </>
```

- [ ] **Step 3: Add empty state invite button styles**

Add these styles to the library's CSS module. Check which CSS file the `libraryStyles.empty` class is defined in:

Run: `grep -n "\.empty\b" apps/web/src/app/\(protected\)/neighborhoods/\[slug\]/library/library.module.css | head -5`

Add to that CSS file:

```css
.emptyInvite {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--space-2) 0 0 0;
}

.emptyInviteButton {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.emptyInviteButton:hover {
  color: var(--color-primary-hover);
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/neighborhoods/\[slug\]/library/
git commit -m "feat: add invite nudges to library page empty and sparse states"
```

---

### Task 7: Posts Page — Empty State Invite + Sparse Nudge

**Files:**
- Modify: `src/app/(protected)/neighborhoods/[slug]/posts/page.tsx`
- Modify: `src/app/(protected)/neighborhoods/[slug]/posts/posts-client.tsx`
- Modify: `src/app/(protected)/neighborhoods/[slug]/posts/posts.module.css` (add empty invite styles)

Same pattern as the library page. The posts server page fetches member count, passes it down, and the client component adds invite CTAs.

- [ ] **Step 1: Add member count fetch to posts server page**

In `src/app/(protected)/neighborhoods/[slug]/posts/page.tsx`, add a parallel member count query.

Add import at top:

```typescript
import { isInGrowthMode } from "@/lib/growth";
```

Replace the data fetching (lines 17-31) to add a parallel member count query:

```typescript
  // Fetch posts and member count in parallel
  const [{ data: posts }, { count: memberCount }] = await Promise.all([
    supabase
      .from("posts")
      .select(
        `
        *,
        author:users!author_id(id, name, avatar_url),
        editor:users!edited_by(id, name)
      `
      )
      .eq("neighborhood_id", neighborhood.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "active"),
  ]);
```

Update the `PostsClient` usage to pass new props:

```tsx
      <PostsClient
        posts={postsWithReactions}
        currentUserId={user.id}
        isAdmin={isNeighborhoodAdmin}
        slug={slug}
        neighborhoodId={neighborhood.id}
        memberCount={memberCount || 0}
      />
```

- [ ] **Step 2: Update PostsClient to accept and use new props**

In `src/app/(protected)/neighborhoods/[slug]/posts/posts-client.tsx`:

Add imports:

```typescript
import { InviteNudge } from "@/components/InviteNudge";
import { isInGrowthMode, shouldShowContentNudge } from "@/lib/growth";
import { useInvite } from "@/lib/hooks/useInvite";
```

Add `memberCount` to the Props interface:

```typescript
interface Props {
  posts: Post[];
  currentUserId: string;
  isAdmin: boolean;
  slug: string;
  neighborhoodId: string;
  memberCount: number;
}
```

Update the component destructuring and add hook calls:

```typescript
export function PostsClient({
  posts,
  currentUserId,
  isAdmin,
  slug,
  memberCount,
}: Props) {
  // ... existing state ...
  const { handleInvite, modal: inviteModal } = useInvite(slug);
  const growthMode = isInGrowthMode(memberCount);
```

Update the empty state (around lines 151-162) to add invite CTA:

```tsx
  if (posts.length === 0) {
    return (
      <>
        <div className={styles.empty}>
          <div className={styles.emptyIllustration}>📌</div>
          <p className={styles.emptyText}>
            The board is empty, pin something up for your neighbors!
          </p>
          <Link href={`/neighborhoods/${slug}/posts/new`} className={styles.emptyButton}>
            Post something
          </Link>
          {growthMode && (
            <p className={styles.emptyInvite}>
              or{" "}
              <button
                onClick={handleInvite}
                className={styles.emptyInviteButton}
                type="button"
              >
                invite neighbors
              </button>
              {" "}to start the conversation
            </p>
          )}
        </div>
        {inviteModal}
      </>
    );
  }
```

At the end of the main return (after all the post cards render), add the sparse nudge and invite modal. Wrap the existing return content in a fragment and add:

```tsx
      {growthMode && shouldShowContentNudge(posts.length, "posts") && (
        <InviteNudge slug={slug} section="posts" />
      )}
      {inviteModal}
```

- [ ] **Step 3: Add empty state invite styles to posts CSS**

Add to `src/app/(protected)/neighborhoods/[slug]/posts/posts.module.css`:

```css
.emptyInvite {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--space-2) 0 0 0;
}

.emptyInviteButton {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.emptyInviteButton:hover {
  color: var(--color-primary-hover);
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/neighborhoods/\[slug\]/posts/
git commit -m "feat: add invite nudges to posts page empty and sparse states"
```

---

### Task 8: Directory Page — Sparse Nudge

**Files:**
- Modify: `src/app/(protected)/neighborhoods/[slug]/directory/page.tsx`
- Modify: `src/app/(protected)/neighborhoods/[slug]/directory/directory-client.tsx`

The directory is different from library/posts: the member list *is* the content, so the empty state already says "Be the first to invite neighbors!" We just need the sparse nudge for small-but-not-empty directories.

- [ ] **Step 1: Pass member count to DirectoryClient**

In `src/app/(protected)/neighborhoods/[slug]/directory/page.tsx`, the member count is already available as `filteredMembers.length`. Pass it as a prop:

```tsx
    <DirectoryClient
      slug={slug}
      neighborhoodName={neighborhood.name}
      members={filteredMembers}
      memberCount={filteredMembers.length}
    />
```

- [ ] **Step 2: Update DirectoryClient to show sparse nudge**

In `src/app/(protected)/neighborhoods/[slug]/directory/directory-client.tsx`:

Add imports:

```typescript
import { InviteNudge } from "@/components/InviteNudge";
import { isInGrowthMode, shouldShowContentNudge } from "@/lib/growth";
```

Add `memberCount` to the Props interface:

```typescript
interface Props {
  slug: string;
  neighborhoodName: string;
  members: Member[];
  memberCount: number;
}
```

Update the component destructuring and add growth mode check:

```typescript
export function DirectoryClient({ slug, neighborhoodName, members, memberCount }: Props) {
```

After the member grid's closing `</div>` (around line 331, before the empty state ternary), and inside the branch where `filteredMembers.length > 0`, add the nudge:

Find the section where the member cards are rendered (the `filteredMembers.length > 0` branch). After the closing `</div>` of the member grid (around line 331), add:

```tsx
          {isInGrowthMode(memberCount) && shouldShowContentNudge(memberCount, "directory") && (
            <InviteNudge slug={slug} section="directory" />
          )}
```

Also update the existing empty state text (line 338) to include a share invite action. Replace:

```tsx
        <div className={styles.emptyState}>
          <p>No members yet. Be the first to invite neighbors!</p>
        </div>
```

With a version that includes an actionable invite button. However, since this is a client component and we'd need the `useInvite` hook, add it:

```typescript
  const { handleInvite, modal: inviteModal } = useInvite(slug);
```

Then update the empty state:

```tsx
        <div className={styles.emptyState}>
          <p>No members yet.</p>
          <button
            onClick={handleInvite}
            className={styles.inviteButton}
            type="button"
          >
            Invite your neighbors
          </button>
        </div>
```

And add `{inviteModal}` before the closing `</div>` of the component's return.

- [ ] **Step 3: Add invite button style to directory CSS**

Add to `src/app/(protected)/neighborhoods/[slug]/directory/directory.module.css`:

```css
.inviteButton {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.inviteButton:hover {
  background: var(--color-primary-hover);
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(protected\)/neighborhoods/\[slug\]/directory/
git commit -m "feat: add invite nudge to directory page sparse state"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npm run test:unit -w @blockclub/web -- --reporter=verbose`
Expected: All tests pass, including the new `growth.test.ts`

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: No new warnings or errors

- [ ] **Step 4: Manual smoke test**

Start the dev server: `npm run dev:web`

Verify:
1. Dashboard shows GrowthCard when neighborhood has < 10 members
2. GrowthCard "Share Invite" button opens QR/copy modal on desktop
3. InviteButton in header shows "👋 Invite Neighbors" label on mobile viewport
4. Library empty state shows "invite neighbors" link when in growth mode
5. Library with < 5 items shows InviteNudge below the grid
6. Posts empty state shows "invite neighbors" link when in growth mode
7. Posts with < 5 posts shows InviteNudge below the posts
8. Directory with < 10 members shows InviteNudge below the member grid

- [ ] **Step 5: Commit any fixes from smoke test**

If any issues found during smoke test, fix and commit.
