import { describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { recordImageEvent } from "../image-observability";

vi.mock("../logger", () => ({ logger: { info: vi.fn() } }));

describe("image observability", () => {
  it("records safe structured output without image contents or sensitive metadata", () => {
    recordImageEvent({ event: "image_upload_normalized", profile: "post", outputBytes: 100, buffer: "secret" as never, exif: "secret" as never });
    expect(logger.info).toHaveBeenCalledWith("image_upload_normalized", { event: "image_upload_normalized", profile: "post", outputBytes: 100 });
  });
});
