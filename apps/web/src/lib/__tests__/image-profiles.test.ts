import { describe, expect, it } from "vitest";
import { getImageProfile, getOutputDimensions, getWebpFilename, validateImageInput } from "../image-profiles";

describe("image profiles", () => {
  it("keeps explicit bounded profiles", () => {
    expect(getImageProfile("avatar")).toMatchObject({ maxLongestEdge: 512, initialQuality: 0.88, qualityFloor: 0.76, targetBytes: 409600 });
    expect(getImageProfile("post")).toMatchObject({ maxLongestEdge: 1920, targetBytes: 2048000 });
  });

  it("does not upscale smaller images", () => {
    expect(getOutputDimensions(320, 200, 512)).toEqual({ width: 320, height: 200 });
  });

  it("caps the longest edge while preserving aspect ratio", () => {
    expect(getOutputDimensions(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 });
  });

  it("normalizes names to webp", () => {
    expect(getWebpFilename("family photo!.jpeg")).toBe("family-photo--normalized.webp");
  });

  it("rejects GIF and unsupported inputs", () => {
    expect(validateImageInput({ type: "image/gif", size: 10 }, "post")).toBe("GIF images are not supported for new uploads.");
    expect(validateImageInput({ type: "image/svg+xml", size: 10 }, "post")).toBe("Please select a JPEG, PNG, or WebP image.");
  });
});
