import { expect } from "@playwright/test";
import { test as authenticatedTest } from "./fixtures/auth.fixture";

const adminNeighborhoodSlug = process.env.E2E_ADMIN_NEIGHBORHOOD_SLUG;

authenticatedTest.skip(
  !adminNeighborhoodSlug,
  "Set E2E_ADMIN_NEIGHBORHOOD_SLUG to run the authenticated neighborhood-admin fixture check",
);

authenticatedTest(
  "neighborhood admin invite actions preserve hierarchy and responsive layout",
  async ({ authenticatedPage }) => {
    const page = authenticatedPage as unknown as import("@playwright/test").Page;
    await page.goto(`/neighborhoods/${adminNeighborhoodSlug}/settings`);
    const section = page.getByTestId("neighborhood-admin-actions");
    const actions = section.locator("div").filter({ has: page.getByTestId("neighborhood-admin-share-button") }).last();
    const share = page.getByTestId("neighborhood-admin-share-button");
    const qr = page.getByTestId("neighborhood-admin-qr-button");

    await expect(section).toBeVisible();
    await expect(share).toHaveClass(/invitePrimary/);
    await expect(qr).toHaveClass(/inviteSecondary/);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect.poll(async () => actions.evaluate((element) => getComputedStyle(element).flexDirection)).toBe("row");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => actions.evaluate((element) => getComputedStyle(element).flexDirection)).toBe("column");

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  },
);
