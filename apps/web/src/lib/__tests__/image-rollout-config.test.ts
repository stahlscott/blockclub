import { describe, expect, it } from "vitest";
import { assertImageRolloutConfig, isImageUploadEnforcementEnabled } from "../rollout-config";

describe("image rollout configuration", () => {
  it("fails closed when production enforcement is absent", () => {
    expect(() => assertImageRolloutConfig({ NODE_ENV: "production" })).toThrow("IMAGE_UPLOAD_ENFORCEMENT=true");
  });

  it("accepts complete non-production configuration", () => {
    expect(() => assertImageRolloutConfig({ NODE_ENV: "test" })).not.toThrow();
    expect(isImageUploadEnforcementEnabled({ IMAGE_UPLOAD_ENFORCEMENT: "true" })).toBe(true);
  });
});
