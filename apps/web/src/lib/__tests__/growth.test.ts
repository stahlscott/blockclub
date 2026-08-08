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
