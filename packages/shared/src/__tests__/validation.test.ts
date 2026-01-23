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
