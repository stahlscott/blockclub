import { describe, expect, it } from "vitest";
import { isCanonicalImagePath } from "../image-reference-safety";

describe("canonical image paths", () => {
  it("accepts only owner-scoped webp paths", () => {
    expect(isCanonicalImagePath("user-1/image.webp", "avatars", "user-1")).toBe(true);
    expect(isCanonicalImagePath("user-1/image.jpg", "avatars", "user-1")).toBe(false);
    expect(isCanonicalImagePath("user-2/image.webp", "avatars", "user-1")).toBe(false);
    expect(isCanonicalImagePath("user-1/nested/image.webp", "avatars")).toBe(false);
  });
});
