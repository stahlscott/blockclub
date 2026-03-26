import { describe, it, expect } from "vitest";
import { parseInviteInput } from "../parse-invite-input";

describe("parseInviteInput", () => {
  it("extracts slug from full URL with /join/ path", () => {
    expect(parseInviteInput("https://lakewoodblock.club/join/lakewood-heights")).toBe("lakewood-heights");
  });

  it("extracts slug from dev environment URL", () => {
    expect(parseInviteInput("https://blockclub.vercel.app/join/test-neighborhood")).toBe("test-neighborhood");
  });

  it("extracts slug from localhost URL", () => {
    expect(parseInviteInput("http://localhost:3000/join/my-block")).toBe("my-block");
  });

  it("treats bare slug as-is", () => {
    expect(parseInviteInput("lakewood-heights")).toBe("lakewood-heights");
  });

  it("trims whitespace from input", () => {
    expect(parseInviteInput("  lakewood-heights  ")).toBe("lakewood-heights");
  });

  it("handles URL with trailing slash", () => {
    expect(parseInviteInput("https://lakewoodblock.club/join/lakewood-heights/")).toBe("lakewood-heights");
  });

  it("returns null for empty input", () => {
    expect(parseInviteInput("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(parseInviteInput("   ")).toBeNull();
  });

  it("returns null for URL with /join/ but no slug", () => {
    expect(parseInviteInput("https://lakewoodblock.club/join/")).toBeNull();
  });
});
