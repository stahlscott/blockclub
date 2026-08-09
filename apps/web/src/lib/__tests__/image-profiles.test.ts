import { describe, expect, it } from "vitest";
import { getImageProfile, getOutputDimensions, getWebpFilename, validateImageInput } from "../image-profiles";
import { getExifOrientationTransform } from "../image-normalization";

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

  it("maps every EXIF orientation to the correct output geometry and matrix", () => {
    const width = 400;
    const height = 300;
    const transforms = Array.from({ length: 8 }, (_, index) => getExifOrientationTransform(index + 1, width, height));

    expect(transforms.map(({ outputWidth, outputHeight }) => [outputWidth, outputHeight])).toEqual([
      [400, 300],
      [400, 300],
      [400, 300],
      [400, 300],
      [300, 400],
      [300, 400],
      [300, 400],
      [300, 400],
    ]);
    expect(transforms.map(({ a, b, c, d, e, f }) => [a, b, c, d, e, f])).toEqual([
      [1, 0, 0, 1, 0, 0],
      [-1, 0, 0, 1, 400, 0],
      [-1, 0, 0, -1, 400, 300],
      [1, 0, 0, -1, 0, 300],
      [0, 1, 1, 0, 0, 0],
      [0, 1, -1, 0, 300, 0],
      [0, -1, -1, 0, 300, 400],
      [0, -1, 1, 0, 0, 400],
    ]);
  });

  it("falls back to the unrotated transform for invalid EXIF orientations", () => {
    expect(getExifOrientationTransform(0, 400, 300)).toEqual(getExifOrientationTransform(1, 400, 300));
    expect(getExifOrientationTransform(9, 400, 300)).toEqual(getExifOrientationTransform(1, 400, 300));
  });
});
