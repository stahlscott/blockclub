import { test, expect } from '@playwright/test';

/**
 * E2E tests for staff impersonation flow.
 *
 * These tests verify that staff admins can:
 * - Access the staff admin page
 * - Impersonate regular users
 * - Exit impersonation and return to staff view
 *
 * Requirements:
 * - E2E_STAFF_ADMIN_EMAIL: Email of a staff admin (must be in STAFF_ADMIN_EMAILS)
 * - E2E_STAFF_ADMIN_PASSWORD: Password for the staff admin account
 * - At least one regular (non-staff) user must exist in the database
 */

const STAFF_ADMIN = {
  email: process.env.E2E_STAFF_ADMIN_EMAIL || '',
  password: process.env.E2E_STAFF_ADMIN_PASSWORD || '',
};

test.describe('Staff Impersonation', () => {
  test.skip(
    !STAFF_ADMIN.email || !STAFF_ADMIN.password,
    'Skipping: E2E_STAFF_ADMIN_EMAIL and E2E_STAFF_ADMIN_PASSWORD must be set'
  );

  test.beforeEach(async ({ page }) => {
    // Sign in as staff admin before each test
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    // Wait for form fields to be ready before filling
    const emailInput = page.getByTestId('signin-form-email-input');
    const passwordInput = page.getByTestId('signin-form-password-input');
    await emailInput.waitFor({ state: 'visible' });

    await emailInput.fill(STAFF_ADMIN.email);
    await passwordInput.fill(STAFF_ADMIN.password);
    await page.getByTestId('signin-form-submit-button').click();

    // Wait for redirect to dashboard and page to fully stabilize
    await page.waitForURL('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('can access staff page as staff admin', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'networkidle' });

    // Should see the staff admin page
    await expect(page.getByRole('heading', { name: 'Staff Admin' })).toBeVisible();

    // Should see the tabs
    await expect(page.getByTestId('staff-tab-overview')).toBeVisible();
    await expect(page.getByTestId('staff-tab-neighborhoods')).toBeVisible();
    await expect(page.getByTestId('staff-tab-users')).toBeVisible();
  });

  test('can impersonate a user and exit without errors', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'networkidle' });

    // Switch to Users tab
    await page.getByTestId('staff-tab-users').click();

    // Wait for users list to load - find the first impersonate button
    const impersonateButton = page.locator('[data-testid^="staff-impersonate-button-"]').first();
    await expect(impersonateButton).toBeVisible({ timeout: 10000 });

    // Click to impersonate
    await impersonateButton.click();

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Impersonation banner should be visible
    const banner = page.getByTestId('impersonation-banner');
    await expect(banner).toBeVisible();

    // Banner should show "Viewing as:" text
    await expect(banner.getByText('Viewing as:')).toBeVisible();

    // Exit button should be visible
    const exitButton = page.getByTestId('impersonation-exit-button');
    await expect(exitButton).toBeVisible();

    // Click exit to stop impersonation
    await exitButton.click();

    // Should redirect back to staff page
    await page.waitForURL('/staff', { timeout: 10000 });

    // Impersonation banner should no longer be visible
    await expect(page.getByTestId('impersonation-banner')).not.toBeVisible();

    // Should still be on staff page without errors
    await expect(page.getByRole('heading', { name: 'Staff Admin' })).toBeVisible();
  });

  test('can navigate to staff panel while impersonating', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'networkidle' });

    // Switch to Users tab
    await page.getByTestId('staff-tab-users').click();

    // Impersonate the first user
    const impersonateButton = page.locator('[data-testid^="staff-impersonate-button-"]').first();
    await expect(impersonateButton).toBeVisible({ timeout: 10000 });
    await impersonateButton.click();

    // Wait for dashboard and banner
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.getByTestId('impersonation-banner')).toBeVisible();

    // Click the "Staff Panel" link in the banner
    await page.getByTestId('impersonation-staff-link').click();

    // Should navigate to staff page
    await page.waitForURL('/staff', { timeout: 10000 });

    // Banner should still be visible (still impersonating)
    await expect(page.getByTestId('impersonation-banner')).toBeVisible();

    // Staff page should load correctly
    await expect(page.getByRole('heading', { name: 'Staff Admin' })).toBeVisible();
  });

  test('impersonation persists across page navigation', async ({ page }) => {
    await page.goto('/staff', { waitUntil: 'networkidle' });

    // Switch to Users tab and impersonate
    await page.getByTestId('staff-tab-users').click();
    const impersonateButton = page.locator('[data-testid^="staff-impersonate-button-"]').first();
    await expect(impersonateButton).toBeVisible({ timeout: 10000 });
    await impersonateButton.click();

    // Wait for dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.getByTestId('impersonation-banner')).toBeVisible();

    // Navigate to another page (e.g., profile)
    await page.goto('/profile', { waitUntil: 'networkidle' });

    // Banner should still be visible
    await expect(page.getByTestId('impersonation-banner')).toBeVisible();

    // Exit impersonation from profile page
    await page.getByTestId('impersonation-exit-button').click();

    // Should redirect to staff
    await page.waitForURL('/staff', { timeout: 10000 });
    await expect(page.getByTestId('impersonation-banner')).not.toBeVisible();
  });
});
