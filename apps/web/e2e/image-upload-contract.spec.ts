import { expect, test } from "@playwright/test";

const requiredProjects = ["desktop-chromium", "mobile-chromium", "mobile-webkit"];

test.describe("image upload browser infrastructure", () => {
  test("runs in a required named project", async ({}, testInfo) => {
    expect(requiredProjects).toContain(testInfo.project.name);
  });

  test("required fixture and upload contract are configured", async ({ page }) => {
    await page.route("**/api/uploads/images", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { url: "https://example.supabase.co/storage/v1/object/public/posts/user/image.webp", path: "user/image.webp", format: "image/webp", width: 1920, height: 1080, bytes: 1000 } }) });
        return;
      }
      await route.continue();
    });
    await page.goto("/signin");
    expect(await page.evaluate(() => typeof window.Worker === "function")).toBe(true);
  });
});
