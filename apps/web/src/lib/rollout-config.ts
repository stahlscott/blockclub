import { getImageProfile, type ImageProfile } from "./image-profiles";

export const IMAGE_ENFORCEMENT_ENV = "IMAGE_UPLOAD_ENFORCEMENT";

export function isImageUploadEnforcementEnabled(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): boolean {
  return env[IMAGE_ENFORCEMENT_ENV] === "true";
}

export function assertImageRolloutConfig(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): void {
  const requiredProfiles: ImageProfile[] = ["avatar", "gallery", "post", "item"];
  for (const profile of requiredProfiles) {
    const config = getImageProfile(profile);
    if (!config.maxLongestEdge || config.qualityFloor <= 0 || config.initialQuality < config.qualityFloor || !config.targetBytes) {
      throw new Error(`Image profile ${profile} is incomplete`);
    }
  }
  if (env.NODE_ENV === "production" && env[IMAGE_ENFORCEMENT_ENV] !== "true") {
    throw new Error(`${IMAGE_ENFORCEMENT_ENV}=true is required in production`);
  }
}
