/**
 * Date utility functions for consistent date handling across the app.
 *
 * Key considerations:
 * - Supabase returns dates as ISO strings (UTC)
 * - Date inputs (e.g., due dates) are YYYY-MM-DD strings in local timezone
 * - Display dates should be in user's local timezone
 */

/**
 * Parse a YYYY-MM-DD string as a local date (not UTC).
 *
 * Use this for dates that represent "local calendar days" like due dates,
 * where "2024-03-15" means March 15th in the user's timezone.
 *
 * @example
 * ```typescript
 * const dueDate = parseDateLocal("2024-03-15");
 * // Returns Date object for March 15, 2024 at midnight local time
 * ```
 */
export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object as YYYY-MM-DD in local timezone.
 *
 * Use this for formatting dates for input fields or storage
 * when the date represents a local calendar day.
 *
 * @example
 * ```typescript
 * const today = new Date();
 * const formatted = formatDateLocal(today);
 * // Returns "2024-03-15" (in local timezone)
 * ```
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format an ISO timestamp string for display (e.g., "Mar 15, 2024").
 *
 * Use this for displaying timestamps like created_at, updated_at.
 *
 * @example
 * ```typescript
 * const display = formatDate("2024-03-15T10:30:00Z");
 * // Returns "Mar 15, 2024"
 * ```
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
 *
 * Use this for displaying local date strings like due dates.
 *
 * @example
 * ```typescript
 * const display = displayDateLocal("2024-03-15");
 * // Returns "Mar 15, 2024"
 * ```
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
 *
 * Use this for displaying recent activity like post timestamps.
 *
 * Rules:
 * - Less than 1 minute: "Just now"
 * - Less than 60 minutes: "Xm ago"
 * - Less than 24 hours: "Xh ago"
 * - Less than 7 days: "Xd ago"
 * - Otherwise: "Mon DD" format
 *
 * @example
 * ```typescript
 * const relative = formatRelativeTime("2024-03-15T10:30:00Z");
 * // Returns "5m ago" (if 5 minutes have passed)
 * ```
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
 *
 * Useful for date comparisons like checking if something is overdue.
 *
 * @example
 * ```typescript
 * const today = getTodayLocal();
 * const dueDate = parseDateLocal("2024-03-15");
 * const isOverdue = dueDate < today;
 * ```
 */
export function getTodayLocal(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get a date N days from now.
 *
 * @example
 * ```typescript
 * const twoWeeksFromNow = getDaysFromNow(14);
 * const defaultDueDate = formatDateLocal(twoWeeksFromNow);
 * ```
 */
export function getDaysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
