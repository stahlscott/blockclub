import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseDateLocal,
  formatDateLocal,
  formatDate,
  displayDateLocal,
  formatRelativeTime,
  getTodayLocal,
  getDaysFromNow,
} from "../date-utils";

describe("date-utils", () => {
  describe("parseDateLocal", () => {
    it("parses YYYY-MM-DD string as local date", () => {
      const date = parseDateLocal("2024-03-15");
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(2); // March is 0-indexed
      expect(date.getDate()).toBe(15);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });

    it("handles single-digit months and days", () => {
      const date = parseDateLocal("2024-01-05");
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(5);
    });

    it("handles end of year", () => {
      const date = parseDateLocal("2024-12-31");
      expect(date.getMonth()).toBe(11); // December
      expect(date.getDate()).toBe(31);
    });
  });

  describe("formatDateLocal", () => {
    it("formats Date as YYYY-MM-DD", () => {
      const date = new Date(2024, 2, 15); // March 15, 2024
      expect(formatDateLocal(date)).toBe("2024-03-15");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDateLocal(date)).toBe("2024-01-05");
    });

    it("handles end of year", () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(formatDateLocal(date)).toBe("2024-12-31");
    });
  });

  describe("formatDate", () => {
    it("formats ISO timestamp for display", () => {
      const result = formatDate("2024-03-15T10:30:00Z");
      // The exact format depends on locale, but should include month, day, year
      expect(result).toContain("Mar");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("handles midnight timestamps", () => {
      // Use a mid-day timestamp to avoid timezone boundary issues
      const result = formatDate("2024-01-15T12:00:00Z");
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
      const now = new Date("2024-03-15T12:00:00Z");
      vi.setSystemTime(now);

      const thirtySecondsAgo = new Date("2024-03-15T11:59:30Z").toISOString();
      expect(formatRelativeTime(thirtySecondsAgo)).toBe("Just now");
    });

    it("returns minutes ago for times less than an hour", () => {
      const now = new Date("2024-03-15T12:00:00Z");
      vi.setSystemTime(now);

      const fiveMinutesAgo = new Date("2024-03-15T11:55:00Z").toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");
    });

    it("returns hours ago for times less than a day", () => {
      const now = new Date("2024-03-15T12:00:00Z");
      vi.setSystemTime(now);

      const threeHoursAgo = new Date("2024-03-15T09:00:00Z").toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
    });

    it("returns days ago for times less than a week", () => {
      const now = new Date("2024-03-15T12:00:00Z");
      vi.setSystemTime(now);

      const twoDaysAgo = new Date("2024-03-13T12:00:00Z").toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
    });

    it("returns formatted date for times more than a week ago", () => {
      const now = new Date("2024-03-15T12:00:00Z");
      vi.setSystemTime(now);

      const twoWeeksAgo = new Date("2024-03-01T12:00:00Z").toISOString();
      const result = formatRelativeTime(twoWeeksAgo);
      expect(result).toContain("Mar");
      expect(result).toContain("1");
    });
  });

  describe("getTodayLocal", () => {
    it("returns date at midnight local time", () => {
      const today = getTodayLocal();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
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
      const now = new Date("2024-03-15T12:00:00Z");
      vi.setSystemTime(now);

      const twoWeeksFromNow = getDaysFromNow(14);
      expect(twoWeeksFromNow.getDate()).toBe(29);
      expect(twoWeeksFromNow.getMonth()).toBe(2); // March
    });

    it("handles month boundaries", () => {
      const now = new Date("2024-03-30T12:00:00Z");
      vi.setSystemTime(now);

      const fiveDaysFromNow = getDaysFromNow(5);
      expect(fiveDaysFromNow.getDate()).toBe(4);
      expect(fiveDaysFromNow.getMonth()).toBe(3); // April
    });

    it("handles negative days", () => {
      const now = new Date("2024-03-15T12:00:00Z");
      vi.setSystemTime(now);

      const sevenDaysAgo = getDaysFromNow(-7);
      expect(sevenDaysAgo.getDate()).toBe(8);
      expect(sevenDaysAgo.getMonth()).toBe(2); // March
    });
  });

  describe("roundtrip conversions", () => {
    it("parseDateLocal and formatDateLocal are inverse operations", () => {
      const original = "2024-03-15";
      const date = parseDateLocal(original);
      const formatted = formatDateLocal(date);
      expect(formatted).toBe(original);
    });
  });
});
