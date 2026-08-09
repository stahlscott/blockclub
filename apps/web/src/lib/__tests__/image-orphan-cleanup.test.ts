import { describe, expect, it } from "vitest";
import { isCanonicalImagePath } from "../image-reference-safety";

describe("image orphan cleanup invariants", () => {
  it("only permits canonical objects into the cleanup path", () => {
    expect(isCanonicalImagePath("user/image.webp", "posts")).toBe(true);
    expect(isCanonicalImagePath("user/image.jpg", "posts")).toBe(false);
    expect(isCanonicalImagePath("user/nested/image.webp", "posts")).toBe(false);
  });

  it("keeps legacy objects outside new-upload cleanup", () => {
    expect(isCanonicalImagePath("user/legacy.gif", "avatars")).toBe(false);
  });
});
