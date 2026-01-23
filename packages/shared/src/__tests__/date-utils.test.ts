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
      // Use noon to avoid DST edge cases
      const date1 = new Date(2024, 2, 10, 12, 0, 0);
      const date2 = new Date(2024, 2, 15, 12, 0, 0);
      expect(daysBetween(date1, date2)).toBe(5);
    });

    it("calculates negative difference", () => {
      const date1 = new Date(2024, 2, 15, 12, 0, 0);
      const date2 = new Date(2024, 2, 10, 12, 0, 0);
      expect(daysBetween(date1, date2)).toBe(-5);
    });

    it("returns zero for same date", () => {
      const date = new Date(2024, 2, 15, 12, 0, 0);
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
