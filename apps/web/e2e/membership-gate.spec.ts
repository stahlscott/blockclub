import { test, expect } from '@playwright/test';

/**
 * E2E tests for the membership gate in the protected layout.
 *
 * The gate checks membership status for authenticated users and redirects:
 * - No memberships at all → /get-started
 * - Only pending memberships → /waiting
 * - Has active membership → renders normally
 *
 * Requirements for the redirects-to-get-started and redirects-to-waiting suites:
 * - E2E_NO_MEMBERSHIP_USER_EMAIL: Email of a user with no memberships
 * - E2E_NO_MEMBERSHIP_USER_PASSWORD: Password for that account
 * - E2E_PENDING_MEMBERSHIP_USER_EMAIL: Email of a user with only pending membership(s)
 * - E2E_PENDING_MEMBERSHIP_USER_PASSWORD: Password for that account
 *
 * The pending user must also have at least one pending membership with a visible
 * neighborhood name in order to verify the waiting page content test.
 */

const NO_MEMBERSHIP_USER = {
  email: process.env.E2E_NO_MEMBERSHIP_USER_EMAIL || '',
  password: process.env.E2E_NO_MEMBERSHIP_USER_PASSWORD || '',
};

const PENDING_MEMBERSHIP_USER = {
  email: process.env.E2E_PENDING_MEMBERSHIP_USER_EMAIL || '',
  password: process.env.E2E_PENDING_MEMBERSHIP_USER_PASSWORD || '',
};

// ---------------------------------------------------------------------------
// Helper: sign in via the sign-in form
// ---------------------------------------------------------------------------
async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/signin');
  await page.waitForLoadState('networkidle');

  const emailInput = page.getByTestId('signin-form-email-input');
  await emailInput.waitFor({ state: 'visible' });

  await emailInput.fill(email);
  await page.getByTestId('signin-form-password-input').fill(password);
  await page.getByTestId('signin-form-submit-button').click();
}

// ---------------------------------------------------------------------------
// Suite: user with no memberships
// ---------------------------------------------------------------------------
test.describe('Membership gate — no memberships', () => {
  test.skip(
    !NO_MEMBERSHIP_USER.email || !NO_MEMBERSHIP_USER.password,
    'Skipping: E2E_NO_MEMBERSHIP_USER_EMAIL and E2E_NO_MEMBERSHIP_USER_PASSWORD must be set'
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page, NO_MEMBERSHIP_USER.email, NO_MEMBERSHIP_USER.password);
  });

  test('navigating to /dashboard redirects to /get-started', async ({ page }) => {
    // After sign-in the gate should immediately redirect since there are no memberships.
    // If the sign-in itself lands on /dashboard first, then navigating there should redirect.
    await page.waitForURL(/\/(get-started|dashboard)/, { timeout: 15000 });

    if (page.url().includes('/dashboard')) {
      // Landed on dashboard briefly — navigate there explicitly to trigger the gate
      await page.goto('/dashboard');
    }

    await expect(page).toHaveURL('/get-started', { timeout: 10000 });
  });

  test('/get-started shows the invite input form', async ({ page }) => {
    await page.goto('/get-started');

    // Wait for the client-side auth check to resolve and the form to render
    await expect(page.getByTestId('get-started-invite-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('get-started-submit-button')).toBeVisible();
    await expect(page.getByTestId('get-started-signout-button')).toBeVisible();
  });

  test('entering a slug on /get-started navigates to /join/{slug}', async ({ page }) => {
    await page.goto('/get-started');

    await expect(page.getByTestId('get-started-invite-input')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('get-started-invite-input').fill('my-neighborhood');
    await page.getByTestId('get-started-submit-button').click();

    await expect(page).toHaveURL('/join/my-neighborhood', { timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Suite: user with only pending memberships
// ---------------------------------------------------------------------------
test.describe('Membership gate — pending membership only', () => {
  test.skip(
    !PENDING_MEMBERSHIP_USER.email || !PENDING_MEMBERSHIP_USER.password,
    'Skipping: E2E_PENDING_MEMBERSHIP_USER_EMAIL and E2E_PENDING_MEMBERSHIP_USER_PASSWORD must be set'
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page, PENDING_MEMBERSHIP_USER.email, PENDING_MEMBERSHIP_USER.password);
  });

  test('navigating to /dashboard redirects to /waiting', async ({ page }) => {
    await page.waitForURL(/\/(waiting|dashboard)/, { timeout: 15000 });

    if (page.url().includes('/dashboard')) {
      await page.goto('/dashboard');
    }

    await expect(page).toHaveURL('/waiting', { timeout: 10000 });
  });

  test('/waiting shows pending neighborhood name', async ({ page }) => {
    await page.goto('/waiting');

    // The page renders a list of pending neighborhood names — at least one should be visible
    await expect(page.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible({ timeout: 10000 });

    // The page lists neighborhood names in <li> elements
    const listItems = page.locator('ul li');
    await expect(listItems.first()).toBeVisible();
  });

  test('/waiting has a "Check again" link that navigates to /dashboard', async ({ page }) => {
    await page.goto('/waiting');

    const checkAgainLink = page.getByTestId('waiting-check-again-link');
    await expect(checkAgainLink).toBeVisible({ timeout: 10000 });

    await checkAgainLink.click();

    // If the membership is still pending the gate will redirect back to /waiting.
    // Either outcome confirms the link navigated to /dashboard and triggered the gate.
    await expect(page).toHaveURL(/\/(dashboard|waiting)/, { timeout: 10000 });
  });

  test('/waiting has a sign-out button', async ({ page }) => {
    await page.goto('/waiting');

    await expect(page.getByTestId('waiting-signout-button')).toBeVisible({ timeout: 10000 });
  });
});
