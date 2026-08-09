import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeServerImage } from "../image-server";

describe("server image normalization", () => {
  it("converts jpeg to a canonical webp without upscaling", async () => {
    const input = await sharp({ create: { width: 320, height: 200, channels: 3, background: { r: 220, g: 180, b: 120 } } }).jpeg().toBuffer();
    const normalized = await normalizeServerImage(input, "avatar");
    const metadata = await sharp(normalized.buffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(200);
    expect(normalized.pages).toBe(1);
  });

  it("rejects animated gif input", async () => {
    const input = await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).gif().toBuffer();
    await expect(normalizeServerImage(input, "post")).rejects.toMatchObject({ code: "GIF_REJECTED" });
  });

  it("rejects malformed bytes", async () => {
    await expect(normalizeServerImage(Buffer.from("not an image"), "item")).rejects.toMatchObject({ code: "MALFORMED_IMAGE" });
  });
});
