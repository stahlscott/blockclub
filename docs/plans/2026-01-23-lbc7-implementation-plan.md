# LBC-7: Shared Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract shared logic from web app to `@blockclub/shared` and ensure comprehensive test coverage for mobile app readiness.

**Architecture:** Move validation constants, date utilities, and business logic (permissions, loan state machine) to the shared package. The web app's existing query layer (`@/lib/queries/`) is already well-structured and only needs minor additions.

**Tech Stack:** TypeScript, Vitest, `@blockclub/shared` package

---

## Pre-flight Check

Before starting, verify the environment is ready:

```bash
cd /Users/scottstahl/code/blockclub
npm run test -w @blockclub/shared   # Should pass (types.test.ts exists)
npm run typecheck                    # Should pass
```

---

## Task 1: Move Date Utilities to Shared

**Files:**
- Create: `packages/shared/src/date-utils.ts`
- Create: `packages/shared/src/__tests__/date-utils.test.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/lib/date-utils.ts` (re-export from shared)

**Step 1: Create the shared date-utils module**

Copy the date utilities to shared package (excluding seasonal functions which are web-specific):

```typescript
// packages/shared/src/date-utils.ts
/**
 * Date utility functions for consistent date handling across platforms.
 *
 * Key considerations:
 * - Supabase returns dates as ISO strings (UTC)
 * - Date inputs (e.g., due dates) are YYYY-MM-DD strings in local timezone
 * - Display dates should be in user's local timezone
 */

/**
 * Parse a YYYY-MM-DD string as a local date (not UTC).
 */
export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object as YYYY-MM-DD in local timezone.
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format an ISO timestamp string for display (e.g., "Mar 15, 2024").
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a YYYY-MM-DD date string for display (e.g., "Mar 15, 2024").
 */
export function displayDateLocal(dateStr: string): string {
  return parseDateLocal(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format an ISO timestamp as relative time (e.g., "5m ago", "2d ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get today's date at midnight local time.
 */
export function getTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get a date N days from now.
 */
export function getDaysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Check if a due date (YYYY-MM-DD) is overdue.
 */
export function isOverdue(dueDate: string): boolean {
  return parseDateLocal(dueDate) < getTodayLocal();
}

/**
 * Calculate days between two dates.
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
}
```

**Step 2: Create the tests directory and test file**

```bash
mkdir -p packages/shared/src/__tests__
```

```typescript
// packages/shared/src/__tests__/date-utils.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseDateLocal,
  formatDateLocal,
  formatDate,
  displayDateLocal,
  formatRelativeTime,
  getTodayLocal,
  getDaysFromNow,
  isOverdue,
  daysBetween,
} from "../date-utils";

describe("date-utils", () => {
  describe("parseDateLocal", () => {
    it("parses YYYY-MM-DD string as local date", () => {
      const date = parseDateLocal("2024-03-15");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // March is 0-indexed
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(0);
    });

    it("handles single-digit months and days", () => {
      const date = parseDateLocal("2024-01-05");
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(5);
    });

    it("handles end of year", () => {
      const date = parseDateLocal("2024-12-31");
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(31);
    });
  });

  describe("formatDateLocal", () => {
    it("formats Date as YYYY-MM-DD", () => {
      const date = new Date(2024, 2, 15);
      expect(formatDateLocal(date)).toBe("2024-03-15");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2024, 0, 5);
      expect(formatDateLocal(date)).toBe("2024-01-05");
    });
  });

  describe("formatDate", () => {
    it("formats ISO timestamp for display", () => {
      const result = formatDate("2024-03-15T10:30:00Z");
      expect(result).toContain("Mar");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });
  });

  describe("displayDateLocal", () => {
    it("formats YYYY-MM-DD string for display", () => {
      const result = displayDateLocal("2024-03-15");
      expect(result).toContain("Mar");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 'Just now' for times less than a minute ago", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      expect(formatRelativeTime("2024-03-15T11:59:30Z")).toBe("Just now");
    });

    it("returns minutes ago for times less than an hour", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      expect(formatRelativeTime("2024-03-15T11:55:00Z")).toBe("5m ago");
    });

    it("returns hours ago for times less than a day", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      expect(formatRelativeTime("2024-03-15T09:00:00Z")).toBe("3h ago");
    });

    it("returns days ago for times less than a week", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      expect(formatRelativeTime("2024-03-13T12:00:00Z")).toBe("2d ago");
    });

    it("returns formatted date for times more than a week ago", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      const result = formatRelativeTime("2024-03-01T12:00:00Z");
      expect(result).toContain("Mar");
    });
  });

  describe("getTodayLocal", () => {
    it("returns date at midnight local time", () => {
      const today = getTodayLocal();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
    });
  });

  describe("getDaysFromNow", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns date N days from now", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      const result = getDaysFromNow(14);
      expect(result.getDate()).toBe(29);
    });

    it("handles month boundaries", () => {
      vi.setSystemTime(new Date("2024-03-30T12:00:00Z"));
      const result = getDaysFromNow(5);
      expect(result.getMonth()).toBe(3); // April
    });

    it("handles negative days", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      const result = getDaysFromNow(-7);
      expect(result.getDate()).toBe(8);
    });
  });

  describe("isOverdue", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns true for past dates", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      expect(isOverdue("2024-03-14")).toBe(true);
    });

    it("returns false for today", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      expect(isOverdue("2024-03-15")).toBe(false);
    });

    it("returns false for future dates", () => {
      vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
      expect(isOverdue("2024-03-16")).toBe(false);
    });
  });

  describe("daysBetween", () => {
    it("calculates positive difference", () => {
      const date1 = new Date(2024, 2, 10);
      const date2 = new Date(2024, 2, 15);
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it("calculates negative difference", () => {
      const date1 = new Date(2024, 2, 15);
      const date2 = new Date(2024, 2, 10);
      expect(daysBetween(date1, date2)).toBe(-5);
    });

    it("returns zero for same date", () => {
      const date = new Date(2024, 2, 15);
      expect(daysBetween(date, date)).toBe(0);
    });
  });

  describe("roundtrip conversions", () => {
    it("parseDateLocal and formatDateLocal are inverse operations", () => {
      const original = "2024-03-15";
      const date = parseDateLocal(original);
      expect(formatDateLocal(date)).toBe(original);
    });
  });
});
```

**Step 3: Update shared package index**

```typescript
// packages/shared/src/index.ts
// Types
export * from "./types";

// Results
export * from "./results";

// Date utilities
export * from "./date-utils";

// Supabase client
export { getSupabaseClient } from "./supabase";
export type { SupabaseClient } from "./supabase";
```

**Step 4: Run tests to verify**

```bash
npm run test:unit -w @blockclub/shared
```

Expected: All tests pass.

**Step 5: Update web app to re-export from shared**

```typescript
// apps/web/src/lib/date-utils.ts
/**
 * Date utility functions for consistent date handling across the app.
 *
 * Core utilities are from @blockclub/shared for mobile compatibility.
 * Web-specific seasonal functions remain here.
 */

// Re-export shared utilities
export {
  parseDateLocal,
  formatDateLocal,
  formatDate,
  displayDateLocal,
  formatRelativeTime,
  getTodayLocal,
  getDaysFromNow,
  isOverdue,
  daysBetween,
} from "@blockclub/shared";

// Web-specific seasonal utilities (not needed on mobile)

export type Season = "winter" | "spring" | "summer" | "fall";

export function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function getSeasonalClosing(): string {
  const season = getCurrentSeason();
  switch (season) {
    case "winter":
      return "Stay warm out there!";
    case "spring":
      return "Enjoy the fresh air!";
    case "summer":
      return "Enjoy the sunshine!";
    case "fall":
      return "Enjoy the crisp weather!";
  }
}
```

**Step 6: Run web tests to verify no regressions**

```bash
npm run test:unit -w @blockclub/web
npm run typecheck
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add packages/shared/src/date-utils.ts packages/shared/src/__tests__/date-utils.test.ts packages/shared/src/index.ts apps/web/src/lib/date-utils.ts
git commit -m "$(cat <<'EOF'
refactor: move date utilities to @blockclub/shared

- Add date-utils.ts to shared package with comprehensive tests
- Add isOverdue() and daysBetween() helpers for loan logic
- Web app re-exports from shared, keeps seasonal functions local
- Prepares date utilities for mobile app consumption

Part of LBC-7 (Shared Infrastructure)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Move Validation to Shared

**Files:**
- Create: `packages/shared/src/validation.ts`
- Create: `packages/shared/src/__tests__/validation.test.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/src/lib/validation.ts` (re-export from shared)

**Step 1: Create the shared validation module**

```typescript
// packages/shared/src/validation.ts
/**
 * Input validation constants and helpers.
 * Shared between web and mobile for consistent validation.
 */

export const MAX_LENGTHS = {
  // User fields
  userName: 100,
  userBio: 500,

  // Neighborhood fields
  neighborhoodName: 100,
  neighborhoodDescription: 500,
  neighborhoodLocation: 200,

  // Item fields
  itemName: 100,
  itemDescription: 1000,

  // Post fields
  postContent: 2000,

  // General
  address: 200,
  phone: 20,
  unit: 20,
  children: 500,
  pets: 500,
} as const;

/**
 * Validate a string field against max length.
 * @returns Error message if invalid, null if valid
 */
export function validateLength(
  value: string,
  fieldName: string,
  maxLength: number
): string | null {
  if (value.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less (currently ${value.length})`;
  }
  return null;
}

/**
 * Validate that a required field is not empty.
 * @returns Error message if empty, null if valid
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string
): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Phone number regex - expects 10 digits.
 */
export const PHONE_REGEX = /^\d{10}$/;

/**
 * Basic email regex for client-side validation.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a phone number (10 digits).
 */
export function validatePhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

/**
 * Validate an email address.
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Format a 10-digit phone for display.
 * "2165551234" -> "(216) 555-1234"
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Normalize a phone number to just digits.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
```

**Step 2: Create the test file**

```typescript
// packages/shared/src/__tests__/validation.test.ts
import { describe, it, expect } from "vitest";
import {
  MAX_LENGTHS,
  validateLength,
  validateRequired,
  validatePhone,
  validateEmail,
  formatPhoneDisplay,
  normalizePhone,
  PHONE_REGEX,
  EMAIL_REGEX,
} from "../validation";

describe("validation", () => {
  describe("validateLength", () => {
    it("returns null for valid length", () => {
      expect(validateLength("hello", "Name", 10)).toBeNull();
    });

    it("returns null for exact max length", () => {
      expect(validateLength("hello", "Name", 5)).toBeNull();
    });

    it("returns error message for exceeding length", () => {
      const result = validateLength("hello world", "Name", 5);
      expect(result).toBe("Name must be 5 characters or less (currently 11)");
    });

    it("handles empty string", () => {
      expect(validateLength("", "Name", 10)).toBeNull();
    });

    it("includes field name in error message", () => {
      const result = validateLength("too long", "Bio", 5);
      expect(result).toContain("Bio");
    });
  });

  describe("validateRequired", () => {
    it("returns null for non-empty string", () => {
      expect(validateRequired("hello", "Name")).toBeNull();
    });

    it("returns error for empty string", () => {
      expect(validateRequired("", "Name")).toBe("Name is required");
    });

    it("returns error for whitespace-only string", () => {
      expect(validateRequired("   ", "Name")).toBe("Name is required");
    });

    it("returns error for null", () => {
      expect(validateRequired(null, "Name")).toBe("Name is required");
    });

    it("returns error for undefined", () => {
      expect(validateRequired(undefined, "Name")).toBe("Name is required");
    });
  });

  describe("validatePhone", () => {
    it("returns true for valid 10-digit phone", () => {
      expect(validatePhone("2165551234")).toBe(true);
    });

    it("returns false for phone with formatting", () => {
      expect(validatePhone("(216) 555-1234")).toBe(false);
    });

    it("returns false for short number", () => {
      expect(validatePhone("216555")).toBe(false);
    });

    it("returns false for long number", () => {
      expect(validatePhone("12165551234")).toBe(false);
    });

    it("returns false for letters", () => {
      expect(validatePhone("216555ABCD")).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("returns true for valid email", () => {
      expect(validateEmail("user@example.com")).toBe(true);
    });

    it("returns true for email with subdomain", () => {
      expect(validateEmail("user@mail.example.com")).toBe(true);
    });

    it("returns false for missing @", () => {
      expect(validateEmail("userexample.com")).toBe(false);
    });

    it("returns false for missing domain", () => {
      expect(validateEmail("user@")).toBe(false);
    });

    it("returns false for spaces", () => {
      expect(validateEmail("user @example.com")).toBe(false);
    });
  });

  describe("formatPhoneDisplay", () => {
    it("formats 10-digit phone", () => {
      expect(formatPhoneDisplay("2165551234")).toBe("(216) 555-1234");
    });

    it("returns original if not 10 digits", () => {
      expect(formatPhoneDisplay("12345")).toBe("12345");
    });

    it("strips non-digits before formatting", () => {
      expect(formatPhoneDisplay("(216) 555-1234")).toBe("(216) 555-1234");
    });
  });

  describe("normalizePhone", () => {
    it("removes formatting", () => {
      expect(normalizePhone("(216) 555-1234")).toBe("2165551234");
    });

    it("returns unchanged if already digits", () => {
      expect(normalizePhone("2165551234")).toBe("2165551234");
    });

    it("handles various formats", () => {
      expect(normalizePhone("216.555.1234")).toBe("2165551234");
      expect(normalizePhone("216-555-1234")).toBe("2165551234");
    });
  });

  describe("MAX_LENGTHS", () => {
    it("has expected user field limits", () => {
      expect(MAX_LENGTHS.userName).toBe(100);
      expect(MAX_LENGTHS.userBio).toBe(500);
    });

    it("has expected item field limits", () => {
      expect(MAX_LENGTHS.itemName).toBe(100);
      expect(MAX_LENGTHS.itemDescription).toBe(1000);
    });

    it("has expected post field limits", () => {
      expect(MAX_LENGTHS.postContent).toBe(2000);
    });
  });

  describe("regex patterns", () => {
    it("PHONE_REGEX matches 10 digits", () => {
      expect(PHONE_REGEX.test("1234567890")).toBe(true);
      expect(PHONE_REGEX.test("123456789")).toBe(false);
    });

    it("EMAIL_REGEX matches basic emails", () => {
      expect(EMAIL_REGEX.test("a@b.c")).toBe(true);
      expect(EMAIL_REGEX.test("invalid")).toBe(false);
    });
  });
});
```

**Step 3: Update shared package index**

```typescript
// packages/shared/src/index.ts
// Types
export * from "./types";

// Results
export * from "./results";

// Date utilities
export * from "./date-utils";

// Validation
export * from "./validation";

// Supabase client
export { getSupabaseClient } from "./supabase";
export type { SupabaseClient } from "./supabase";
```

**Step 4: Run tests**

```bash
npm run test:unit -w @blockclub/shared
```

Expected: All tests pass.

**Step 5: Update web app to re-export from shared**

```typescript
// apps/web/src/lib/validation.ts
/**
 * Input validation constants and helpers.
 * Re-exports from @blockclub/shared for mobile compatibility.
 */

export {
  MAX_LENGTHS,
  validateLength,
  validateRequired,
  validatePhone,
  validateEmail,
  formatPhoneDisplay,
  normalizePhone,
  PHONE_REGEX,
  EMAIL_REGEX,
} from "@blockclub/shared";
```

**Step 6: Run web tests**

```bash
npm run test:unit -w @blockclub/web
npm run typecheck
```

Expected: All tests pass.

**Step 7: Commit**

```bash
git add packages/shared/src/validation.ts packages/shared/src/__tests__/validation.test.ts packages/shared/src/index.ts apps/web/src/lib/validation.ts
git commit -m "$(cat <<'EOF'
refactor: move validation to @blockclub/shared

- Add validation.ts with MAX_LENGTHS, validators, and formatters
- Add validateRequired(), validatePhone(), validateEmail() helpers
- Add formatPhoneDisplay() and normalizePhone() utilities
- Comprehensive test coverage
- Web app re-exports from shared

Part of LBC-7 (Shared Infrastructure)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create Loan Business Logic Module

**Files:**
- Create: `packages/shared/src/loans.ts`
- Create: `packages/shared/src/__tests__/loans.test.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1: Create the loan business logic module**

```typescript
// packages/shared/src/loans.ts
/**
 * Loan business logic and state machine.
 * Defines valid transitions and display helpers.
 */

import type { LoanStatus } from "./types";

/**
 * Human-readable display text for loan status.
 */
export function getLoanStatusDisplay(status: LoanStatus): string {
  const displays: Record<LoanStatus, string> = {
    requested: "Requested",
    approved: "Approved",
    active: "Borrowed",
    returned: "Returned",
    cancelled: "Cancelled",
  };
  return displays[status];
}

/**
 * Semantic color key for loan status.
 * Maps to CSS variables or design tokens.
 */
export function getLoanStatusColor(
  status: LoanStatus
): "warning" | "info" | "success" | "neutral" {
  const colors: Record<LoanStatus, "warning" | "info" | "success" | "neutral"> =
    {
      requested: "warning",
      approved: "info",
      active: "info",
      returned: "success",
      cancelled: "neutral",
    };
  return colors[status];
}

/**
 * Actions that can be taken on a loan.
 */
export type LoanAction =
  | "approve"
  | "decline"
  | "cancel"
  | "pickup"
  | "return";

/**
 * Valid status transitions based on action.
 */
const TRANSITIONS: Record<LoanStatus, Partial<Record<LoanAction, LoanStatus>>> =
  {
    requested: {
      approve: "approved",
      decline: "cancelled",
      cancel: "cancelled",
    },
    approved: {
      pickup: "active",
      cancel: "cancelled",
    },
    active: {
      return: "returned",
    },
    returned: {},
    cancelled: {},
  };

/**
 * Check if a loan can transition via the given action.
 */
export function canTransitionLoan(
  currentStatus: LoanStatus,
  action: LoanAction
): boolean {
  return TRANSITIONS[currentStatus][action] !== undefined;
}

/**
 * Get the resulting status after an action.
 * Returns null if the transition is invalid.
 */
export function getNextLoanStatus(
  currentStatus: LoanStatus,
  action: LoanAction
): LoanStatus | null {
  return TRANSITIONS[currentStatus][action] ?? null;
}

/**
 * Get available actions for a loan based on current status and role.
 */
export function getAvailableLoanActions(
  status: LoanStatus,
  isOwner: boolean,
  isBorrower: boolean
): LoanAction[] {
  const actions: LoanAction[] = [];

  if (status === "requested") {
    if (isOwner) {
      actions.push("approve", "decline");
    }
    if (isBorrower) {
      actions.push("cancel");
    }
  }

  if (status === "approved") {
    if (isOwner) {
      actions.push("pickup"); // Owner confirms borrower picked up
    }
    if (isBorrower) {
      actions.push("cancel");
    }
  }

  if (status === "active") {
    if (isOwner) {
      actions.push("return"); // Owner confirms item returned
    }
  }

  return actions;
}

/**
 * Check if a loan is in a "pending" state requiring action.
 */
export function isLoanPending(status: LoanStatus): boolean {
  return status === "requested" || status === "approved";
}

/**
 * Check if a loan is complete (returned or cancelled).
 */
export function isLoanComplete(status: LoanStatus): boolean {
  return status === "returned" || status === "cancelled";
}
```

**Step 2: Create the test file**

```typescript
// packages/shared/src/__tests__/loans.test.ts
import { describe, it, expect } from "vitest";
import {
  getLoanStatusDisplay,
  getLoanStatusColor,
  canTransitionLoan,
  getNextLoanStatus,
  getAvailableLoanActions,
  isLoanPending,
  isLoanComplete,
} from "../loans";
import type { LoanStatus } from "../types";

describe("loans", () => {
  describe("getLoanStatusDisplay", () => {
    it("returns display text for each status", () => {
      expect(getLoanStatusDisplay("requested")).toBe("Requested");
      expect(getLoanStatusDisplay("approved")).toBe("Approved");
      expect(getLoanStatusDisplay("active")).toBe("Borrowed");
      expect(getLoanStatusDisplay("returned")).toBe("Returned");
      expect(getLoanStatusDisplay("cancelled")).toBe("Cancelled");
    });
  });

  describe("getLoanStatusColor", () => {
    it("returns warning for requested", () => {
      expect(getLoanStatusColor("requested")).toBe("warning");
    });

    it("returns info for approved and active", () => {
      expect(getLoanStatusColor("approved")).toBe("info");
      expect(getLoanStatusColor("active")).toBe("info");
    });

    it("returns success for returned", () => {
      expect(getLoanStatusColor("returned")).toBe("success");
    });

    it("returns neutral for cancelled", () => {
      expect(getLoanStatusColor("cancelled")).toBe("neutral");
    });
  });

  describe("canTransitionLoan", () => {
    describe("from requested", () => {
      it("can approve", () => {
        expect(canTransitionLoan("requested", "approve")).toBe(true);
      });

      it("can decline", () => {
        expect(canTransitionLoan("requested", "decline")).toBe(true);
      });

      it("can cancel", () => {
        expect(canTransitionLoan("requested", "cancel")).toBe(true);
      });

      it("cannot pickup or return", () => {
        expect(canTransitionLoan("requested", "pickup")).toBe(false);
        expect(canTransitionLoan("requested", "return")).toBe(false);
      });
    });

    describe("from approved", () => {
      it("can pickup", () => {
        expect(canTransitionLoan("approved", "pickup")).toBe(true);
      });

      it("can cancel", () => {
        expect(canTransitionLoan("approved", "cancel")).toBe(true);
      });

      it("cannot approve, decline, or return", () => {
        expect(canTransitionLoan("approved", "approve")).toBe(false);
        expect(canTransitionLoan("approved", "decline")).toBe(false);
        expect(canTransitionLoan("approved", "return")).toBe(false);
      });
    });

    describe("from active", () => {
      it("can return", () => {
        expect(canTransitionLoan("active", "return")).toBe(true);
      });

      it("cannot do anything else", () => {
        expect(canTransitionLoan("active", "approve")).toBe(false);
        expect(canTransitionLoan("active", "decline")).toBe(false);
        expect(canTransitionLoan("active", "cancel")).toBe(false);
        expect(canTransitionLoan("active", "pickup")).toBe(false);
      });
    });

    describe("from terminal states", () => {
      it("cannot transition from returned", () => {
        expect(canTransitionLoan("returned", "approve")).toBe(false);
        expect(canTransitionLoan("returned", "return")).toBe(false);
      });

      it("cannot transition from cancelled", () => {
        expect(canTransitionLoan("cancelled", "approve")).toBe(false);
        expect(canTransitionLoan("cancelled", "cancel")).toBe(false);
      });
    });
  });

  describe("getNextLoanStatus", () => {
    it("returns correct next status for valid transitions", () => {
      expect(getNextLoanStatus("requested", "approve")).toBe("approved");
      expect(getNextLoanStatus("requested", "decline")).toBe("cancelled");
      expect(getNextLoanStatus("approved", "pickup")).toBe("active");
      expect(getNextLoanStatus("active", "return")).toBe("returned");
    });

    it("returns null for invalid transitions", () => {
      expect(getNextLoanStatus("requested", "return")).toBeNull();
      expect(getNextLoanStatus("returned", "approve")).toBeNull();
    });
  });

  describe("getAvailableLoanActions", () => {
    describe("for requested status", () => {
      it("owner can approve or decline", () => {
        const actions = getAvailableLoanActions("requested", true, false);
        expect(actions).toContain("approve");
        expect(actions).toContain("decline");
        expect(actions).not.toContain("cancel");
      });

      it("borrower can cancel", () => {
        const actions = getAvailableLoanActions("requested", false, true);
        expect(actions).toContain("cancel");
        expect(actions).not.toContain("approve");
      });

      it("neither owner nor borrower gets empty array", () => {
        const actions = getAvailableLoanActions("requested", false, false);
        expect(actions).toHaveLength(0);
      });
    });

    describe("for approved status", () => {
      it("owner can confirm pickup", () => {
        const actions = getAvailableLoanActions("approved", true, false);
        expect(actions).toContain("pickup");
      });

      it("borrower can cancel", () => {
        const actions = getAvailableLoanActions("approved", false, true);
        expect(actions).toContain("cancel");
      });
    });

    describe("for active status", () => {
      it("owner can mark returned", () => {
        const actions = getAvailableLoanActions("active", true, false);
        expect(actions).toContain("return");
      });

      it("borrower has no actions", () => {
        const actions = getAvailableLoanActions("active", false, true);
        expect(actions).toHaveLength(0);
      });
    });

    describe("for terminal states", () => {
      it("no actions for returned", () => {
        expect(getAvailableLoanActions("returned", true, false)).toHaveLength(0);
        expect(getAvailableLoanActions("returned", false, true)).toHaveLength(0);
      });

      it("no actions for cancelled", () => {
        expect(getAvailableLoanActions("cancelled", true, false)).toHaveLength(0);
        expect(getAvailableLoanActions("cancelled", false, true)).toHaveLength(0);
      });
    });
  });

  describe("isLoanPending", () => {
    it("returns true for requested and approved", () => {
      expect(isLoanPending("requested")).toBe(true);
      expect(isLoanPending("approved")).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(isLoanPending("active")).toBe(false);
      expect(isLoanPending("returned")).toBe(false);
      expect(isLoanPending("cancelled")).toBe(false);
    });
  });

  describe("isLoanComplete", () => {
    it("returns true for returned and cancelled", () => {
      expect(isLoanComplete("returned")).toBe(true);
      expect(isLoanComplete("cancelled")).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(isLoanComplete("requested")).toBe(false);
      expect(isLoanComplete("approved")).toBe(false);
      expect(isLoanComplete("active")).toBe(false);
    });
  });
});
```

**Step 3: Update shared package index**

```typescript
// packages/shared/src/index.ts
// Types
export * from "./types";

// Results
export * from "./results";

// Date utilities
export * from "./date-utils";

// Validation
export * from "./validation";

// Loan business logic
export * from "./loans";

// Supabase client
export { getSupabaseClient } from "./supabase";
export type { SupabaseClient } from "./supabase";
```

**Step 4: Run tests**

```bash
npm run test:unit -w @blockclub/shared
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/shared/src/loans.ts packages/shared/src/__tests__/loans.test.ts packages/shared/src/index.ts
git commit -m "$(cat <<'EOF'
feat: add loan business logic to @blockclub/shared

- Add loan state machine with valid transitions
- Add getLoanStatusDisplay() and getLoanStatusColor() helpers
- Add getAvailableLoanActions() for role-based action filtering
- Add isLoanPending() and isLoanComplete() convenience functions
- Comprehensive test coverage for all transitions

Part of LBC-7 (Shared Infrastructure)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create Permissions Module

**Files:**
- Create: `packages/shared/src/permissions.ts`
- Create: `packages/shared/src/__tests__/permissions.test.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1: Create the permissions module**

```typescript
// packages/shared/src/permissions.ts
/**
 * Permission checking helpers.
 * Pure functions that check if a user can perform actions.
 */

import type { Membership, Item, Post, Loan } from "./types";

// ============================================================================
// Membership Permissions
// ============================================================================

/**
 * Check if membership grants admin privileges.
 */
export function isAdmin(membership: Membership | null | undefined): boolean {
  return membership?.role === "admin" && membership?.status === "active";
}

/**
 * Check if membership is active (regardless of role).
 */
export function isActiveMember(
  membership: Membership | null | undefined
): boolean {
  return membership?.status === "active";
}

/**
 * Check if user can manage neighborhood members (approve, remove, etc.).
 */
export function canManageMembers(
  membership: Membership | null | undefined
): boolean {
  return isAdmin(membership);
}

/**
 * Check if user can moderate posts (pin, delete any post).
 */
export function canModeratePosts(
  membership: Membership | null | undefined
): boolean {
  return isAdmin(membership);
}

// ============================================================================
// Item Permissions
// ============================================================================

/**
 * Check if user owns an item.
 */
export function isItemOwner(userId: string, item: Item): boolean {
  return item.owner_id === userId;
}

/**
 * Check if user can edit an item (only owner can edit).
 */
export function canEditItem(userId: string, item: Item): boolean {
  return isItemOwner(userId, item);
}

/**
 * Check if user can delete an item (owner or admin).
 */
export function canDeleteItem(
  userId: string,
  item: Item,
  membership: Membership | null | undefined
): boolean {
  return isItemOwner(userId, item) || isAdmin(membership);
}

/**
 * Check if user can request to borrow an item.
 * Cannot borrow own items.
 */
export function canRequestLoan(userId: string, item: Item): boolean {
  return !isItemOwner(userId, item) && item.availability === "available";
}

// ============================================================================
// Loan Permissions
// ============================================================================

/**
 * Check if user can approve/decline a loan request.
 * Only item owner can do this.
 */
export function canManageLoanRequest(
  userId: string,
  loan: Loan,
  item: Item
): boolean {
  return isItemOwner(userId, item) && loan.status === "requested";
}

/**
 * Check if user can cancel a loan.
 * Borrower can cancel their own pending loans.
 */
export function canCancelLoan(userId: string, loan: Loan): boolean {
  return (
    loan.borrower_id === userId &&
    (loan.status === "requested" || loan.status === "approved")
  );
}

/**
 * Check if user can mark a loan as returned.
 * Only item owner can confirm return.
 */
export function canMarkLoanReturned(
  userId: string,
  loan: Loan,
  item: Item
): boolean {
  return isItemOwner(userId, item) && loan.status === "active";
}

// ============================================================================
// Post Permissions
// ============================================================================

/**
 * Check if user is the author of a post.
 */
export function isPostAuthor(userId: string, post: Post): boolean {
  return post.author_id === userId;
}

/**
 * Check if user can edit a post (only author can edit).
 */
export function canEditPost(userId: string, post: Post): boolean {
  return isPostAuthor(userId, post);
}

/**
 * Check if user can delete a post (author or admin).
 */
export function canDeletePost(
  userId: string,
  post: Post,
  membership: Membership | null | undefined
): boolean {
  return isPostAuthor(userId, post) || isAdmin(membership);
}

/**
 * Check if user can pin/unpin posts (admin only).
 */
export function canPinPost(
  membership: Membership | null | undefined
): boolean {
  return isAdmin(membership);
}
```

**Step 2: Create the test file**

```typescript
// packages/shared/src/__tests__/permissions.test.ts
import { describe, it, expect } from "vitest";
import {
  isAdmin,
  isActiveMember,
  canManageMembers,
  canModeratePosts,
  isItemOwner,
  canEditItem,
  canDeleteItem,
  canRequestLoan,
  canManageLoanRequest,
  canCancelLoan,
  canMarkLoanReturned,
  isPostAuthor,
  canEditPost,
  canDeletePost,
  canPinPost,
} from "../permissions";
import type { Membership, Item, Loan, Post } from "../types";

// Test fixtures
const adminMembership: Membership = {
  id: "m1",
  user_id: "u1",
  neighborhood_id: "n1",
  role: "admin",
  status: "active",
  joined_at: "2024-01-01",
  deleted_at: null,
};

const memberMembership: Membership = {
  id: "m2",
  user_id: "u2",
  neighborhood_id: "n1",
  role: "member",
  status: "active",
  joined_at: "2024-01-01",
  deleted_at: null,
};

const pendingMembership: Membership = {
  id: "m3",
  user_id: "u3",
  neighborhood_id: "n1",
  role: "member",
  status: "pending",
  joined_at: "2024-01-01",
  deleted_at: null,
};

const item: Item = {
  id: "i1",
  neighborhood_id: "n1",
  owner_id: "owner123",
  name: "Drill",
  description: null,
  category: "tools",
  photo_urls: [],
  availability: "available",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  deleted_at: null,
};

const borrowedItem: Item = {
  ...item,
  availability: "borrowed",
};

const requestedLoan: Loan = {
  id: "l1",
  item_id: "i1",
  borrower_id: "borrower123",
  status: "requested",
  requested_at: "2024-01-01",
  start_date: null,
  due_date: null,
  returned_at: null,
  notes: null,
  deleted_at: null,
};

const activeLoan: Loan = {
  ...requestedLoan,
  status: "active",
};

const approvedLoan: Loan = {
  ...requestedLoan,
  status: "approved",
};

const post: Post = {
  id: "p1",
  neighborhood_id: "n1",
  author_id: "author123",
  content: "Hello neighbors!",
  image_url: null,
  is_pinned: false,
  expires_at: null,
  edited_at: null,
  edited_by: null,
  created_at: "2024-01-01",
  deleted_at: null,
};

describe("permissions", () => {
  describe("membership permissions", () => {
    describe("isAdmin", () => {
      it("returns true for active admin", () => {
        expect(isAdmin(adminMembership)).toBe(true);
      });

      it("returns false for active member", () => {
        expect(isAdmin(memberMembership)).toBe(false);
      });

      it("returns false for pending admin", () => {
        const pendingAdmin = { ...adminMembership, status: "pending" as const };
        expect(isAdmin(pendingAdmin)).toBe(false);
      });

      it("returns false for null/undefined", () => {
        expect(isAdmin(null)).toBe(false);
        expect(isAdmin(undefined)).toBe(false);
      });
    });

    describe("isActiveMember", () => {
      it("returns true for active members", () => {
        expect(isActiveMember(adminMembership)).toBe(true);
        expect(isActiveMember(memberMembership)).toBe(true);
      });

      it("returns false for pending members", () => {
        expect(isActiveMember(pendingMembership)).toBe(false);
      });

      it("returns false for null/undefined", () => {
        expect(isActiveMember(null)).toBe(false);
        expect(isActiveMember(undefined)).toBe(false);
      });
    });

    describe("canManageMembers", () => {
      it("returns true for admin", () => {
        expect(canManageMembers(adminMembership)).toBe(true);
      });

      it("returns false for member", () => {
        expect(canManageMembers(memberMembership)).toBe(false);
      });
    });

    describe("canModeratePosts", () => {
      it("returns true for admin", () => {
        expect(canModeratePosts(adminMembership)).toBe(true);
      });

      it("returns false for member", () => {
        expect(canModeratePosts(memberMembership)).toBe(false);
      });
    });
  });

  describe("item permissions", () => {
    describe("isItemOwner", () => {
      it("returns true for owner", () => {
        expect(isItemOwner("owner123", item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(isItemOwner("other", item)).toBe(false);
      });
    });

    describe("canEditItem", () => {
      it("returns true for owner", () => {
        expect(canEditItem("owner123", item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(canEditItem("other", item)).toBe(false);
      });

      it("returns false for admin who is not owner", () => {
        expect(canEditItem("admin", item)).toBe(false);
      });
    });

    describe("canDeleteItem", () => {
      it("returns true for owner", () => {
        expect(canDeleteItem("owner123", item, memberMembership)).toBe(true);
      });

      it("returns true for admin", () => {
        expect(canDeleteItem("admin", item, adminMembership)).toBe(true);
      });

      it("returns false for non-owner non-admin", () => {
        expect(canDeleteItem("other", item, memberMembership)).toBe(false);
      });
    });

    describe("canRequestLoan", () => {
      it("returns true for non-owner on available item", () => {
        expect(canRequestLoan("other", item)).toBe(true);
      });

      it("returns false for owner", () => {
        expect(canRequestLoan("owner123", item)).toBe(false);
      });

      it("returns false for borrowed item", () => {
        expect(canRequestLoan("other", borrowedItem)).toBe(false);
      });
    });
  });

  describe("loan permissions", () => {
    describe("canManageLoanRequest", () => {
      it("returns true for owner on requested loan", () => {
        expect(canManageLoanRequest("owner123", requestedLoan, item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(canManageLoanRequest("other", requestedLoan, item)).toBe(false);
      });

      it("returns false for active loan", () => {
        expect(canManageLoanRequest("owner123", activeLoan, item)).toBe(false);
      });
    });

    describe("canCancelLoan", () => {
      it("returns true for borrower on requested loan", () => {
        expect(canCancelLoan("borrower123", requestedLoan)).toBe(true);
      });

      it("returns true for borrower on approved loan", () => {
        expect(canCancelLoan("borrower123", approvedLoan)).toBe(true);
      });

      it("returns false for non-borrower", () => {
        expect(canCancelLoan("other", requestedLoan)).toBe(false);
      });

      it("returns false for active loan", () => {
        expect(canCancelLoan("borrower123", activeLoan)).toBe(false);
      });
    });

    describe("canMarkLoanReturned", () => {
      it("returns true for owner on active loan", () => {
        expect(canMarkLoanReturned("owner123", activeLoan, item)).toBe(true);
      });

      it("returns false for non-owner", () => {
        expect(canMarkLoanReturned("other", activeLoan, item)).toBe(false);
      });

      it("returns false for non-active loan", () => {
        expect(canMarkLoanReturned("owner123", requestedLoan, item)).toBe(false);
      });
    });
  });

  describe("post permissions", () => {
    describe("isPostAuthor", () => {
      it("returns true for author", () => {
        expect(isPostAuthor("author123", post)).toBe(true);
      });

      it("returns false for non-author", () => {
        expect(isPostAuthor("other", post)).toBe(false);
      });
    });

    describe("canEditPost", () => {
      it("returns true for author", () => {
        expect(canEditPost("author123", post)).toBe(true);
      });

      it("returns false for non-author", () => {
        expect(canEditPost("other", post)).toBe(false);
      });
    });

    describe("canDeletePost", () => {
      it("returns true for author", () => {
        expect(canDeletePost("author123", post, memberMembership)).toBe(true);
      });

      it("returns true for admin", () => {
        expect(canDeletePost("admin", post, adminMembership)).toBe(true);
      });

      it("returns false for non-author non-admin", () => {
        expect(canDeletePost("other", post, memberMembership)).toBe(false);
      });
    });

    describe("canPinPost", () => {
      it("returns true for admin", () => {
        expect(canPinPost(adminMembership)).toBe(true);
      });

      it("returns false for member", () => {
        expect(canPinPost(memberMembership)).toBe(false);
      });
    });
  });
});
```

**Step 3: Update shared package index**

```typescript
// packages/shared/src/index.ts
// Types
export * from "./types";

// Results
export * from "./results";

// Date utilities
export * from "./date-utils";

// Validation
export * from "./validation";

// Loan business logic
export * from "./loans";

// Permissions
export * from "./permissions";

// Supabase client
export { getSupabaseClient } from "./supabase";
export type { SupabaseClient } from "./supabase";
```

**Step 4: Run tests**

```bash
npm run test:unit -w @blockclub/shared
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/shared/src/permissions.ts packages/shared/src/__tests__/permissions.test.ts packages/shared/src/index.ts
git commit -m "$(cat <<'EOF'
feat: add permissions module to @blockclub/shared

- Add membership permission helpers (isAdmin, canManageMembers, etc.)
- Add item permission helpers (canEditItem, canDeleteItem, canRequestLoan)
- Add loan permission helpers (canManageLoanRequest, canCancelLoan, etc.)
- Add post permission helpers (canEditPost, canDeletePost, canPinPost)
- Comprehensive test coverage with fixtures

Part of LBC-7 (Shared Infrastructure)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add Users Query Module

**Files:**
- Create: `apps/web/src/lib/queries/users.ts`
- Modify: `apps/web/src/lib/queries/index.ts`

**Step 1: Create the users query module**

```typescript
// apps/web/src/lib/queries/users.ts
/**
 * Centralized queries for the users table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, User } from "@blockclub/shared";

type Client = SupabaseClient<Database>;

/**
 * Get a user by ID.
 */
export async function getUserById(client: Client, userId: string) {
  const result = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  return result as { data: User | null; error: typeof result.error };
}

/**
 * Get a user by email.
 */
export async function getUserByEmail(client: Client, email: string) {
  const result = await client
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  return result as { data: User | null; error: typeof result.error };
}
```

**Step 2: Update queries index**

```typescript
// apps/web/src/lib/queries/index.ts
/**
 * Centralized query layer for Supabase.
 *
 * Import query functions from here instead of writing inline queries.
 * All queries handle soft deletes, standard joins, and default ordering.
 *
 * Usage:
 *   import { getItemsByNeighborhood } from "@/lib/queries";
 *   const { data, error } = await getItemsByNeighborhood(supabase, neighborhoodId);
 */

export * from "./types";
export * from "./items";
export * from "./memberships";
export * from "./posts";
export * from "./loans";
export * from "./neighborhoods";
export * from "./users";
```

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors.

**Step 4: Commit**

```bash
git add apps/web/src/lib/queries/users.ts apps/web/src/lib/queries/index.ts
git commit -m "$(cat <<'EOF'
feat: add users query module

- Add getUserById() and getUserByEmail() functions
- Export from queries index

Part of LBC-7 (Shared Infrastructure)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update TODO.md and Final Verification

**Files:**
- Modify: `TODO.md`

**Step 1: Run full test suite**

```bash
npm run test:unit -w @blockclub/shared
npm run test:unit -w @blockclub/web
npm run typecheck
npm run lint
```

Expected: All pass.

**Step 2: Update TODO.md**

Mark LBC-7 tasks as complete:

```markdown
### LBC-7: Shared Infrastructure ✓
High priority (prerequisite for LBC-2)
Extract shared logic and centralize queries to prepare for mobile app development.

- [x] **1A: Centralize Supabase Queries** - Create `@/lib/queries/` with typed domain functions
- [x] **1B: Extract Shared Logic** - Move validation, date-utils, permissions, loan logic to `@blockclub/shared`
- [x] **Testing** - Unit tests for all shared logic with >90% coverage

See `docs/plans/2026-01-23-shared-infrastructure-design.md` for full design.
```

**Step 3: Commit**

```bash
git add TODO.md
git commit -m "$(cat <<'EOF'
docs: mark LBC-7 (Shared Infrastructure) as complete

All shared logic extracted with comprehensive test coverage:
- Date utilities
- Validation constants and helpers
- Loan business logic and state machine
- Permission checking helpers
- Users query module

Ready for LBC-2 (Mobile App) development.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

**Tasks completed:**
1. Date utilities moved to shared with tests
2. Validation moved to shared with tests
3. Loan business logic created with state machine and tests
4. Permissions module created with comprehensive tests
5. Users query module added
6. TODO.md updated

**Test coverage added:**
- `packages/shared/src/__tests__/date-utils.test.ts`
- `packages/shared/src/__tests__/validation.test.ts`
- `packages/shared/src/__tests__/loans.test.ts`
- `packages/shared/src/__tests__/permissions.test.ts`

**Shared package now exports:**
- All database types (existing)
- Date utilities
- Validation constants and helpers
- Loan state machine and helpers
- Permission checking functions

The mobile app can now import all shared logic from `@blockclub/shared`.
