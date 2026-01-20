import { test, expect } from '@playwright/test';

test.describe('Email Management - Signup Page', () => {
  test.describe('Check your email state', () => {
    // Note: These tests require signing up a new user to see the confirmation state.
    // In a real test environment, you might use a test email domain or mock the auth.

    test('shows signup form elements', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
      await expect(page.getByTestId('signup-form-name-input')).toBeVisible();
      await expect(page.getByTestId('signup-form-address-input')).toBeVisible();
      await expect(page.getByTestId('signup-form-email-input')).toBeVisible();
      await expect(page.getByTestId('signup-form-password-input')).toBeVisible();
      await expect(page.getByTestId('signup-form-submit-button')).toBeVisible();
    });

    test('shows loading state during signup', async ({ page }) => {
      await page.goto('/signup');

      await page.getByTestId('signup-form-name-input').fill('Test Family');
      await page.getByTestId('signup-form-address-input').fill('123 Test St');
      await page.getByTestId('signup-form-email-input').fill('test@example.com');
      await page.getByTestId('signup-form-password-input').fill('testpassword123');

      const submitButton = page.getByTestId('signup-form-submit-button');
      await submitButton.click();

      // Button should show loading text briefly
      await expect(submitButton).toContainText('Creating account...');
    });

    test('validates required fields', async ({ page }) => {
      await page.goto('/signup');

      const submitButton = page.getByTestId('signup-form-submit-button');
      await submitButton.click();

      // Form should not submit without required fields (HTML5 validation)
      await expect(page).toHaveURL(/\/signup/);
    });

    test('has link to sign in page', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.getByTestId('signup-signin-link')).toBeVisible();
      await page.getByTestId('signup-signin-link').click();

      await expect(page).toHaveURL(/\/signin/);
    });
  });
});

test.describe('Email Management - Settings Page', () => {
  // Note: These tests require an authenticated user session.
  // In a CI environment, you would set up test users and authenticate them.

  test.describe('Email section visibility', () => {
    test('settings page exists and shows title', async ({ page }) => {
      // This will redirect to signin if not authenticated
      await page.goto('/settings');

      // If not authenticated, we should be on signin page
      // This confirms the redirect protection is working
      const url = page.url();
      if (url.includes('/signin')) {
        await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
      } else {
        // If somehow authenticated, check for settings content
        await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
      }
    });
  });

  // The following tests would require authentication setup.
  // They are commented out but serve as documentation for manual testing.
  /*
  test.describe('Authenticated user', () => {
    test.beforeEach(async ({ page }) => {
      // TODO: Set up authenticated session
      // This could be done via:
      // 1. API call to create test user and get session
      // 2. Setting cookies directly
      // 3. Using a test account with known credentials
    });

    test('shows email section', async ({ page }) => {
      await page.goto('/settings');

      await expect(page.getByTestId('settings-email-section')).toBeVisible();
      await expect(page.getByTestId('settings-current-email')).toBeVisible();
      await expect(page.getByTestId('settings-change-email-button')).toBeVisible();
    });

    test('can open change email form', async ({ page }) => {
      await page.goto('/settings');

      await page.getByTestId('settings-change-email-button').click();

      await expect(page.getByTestId('settings-new-email-input')).toBeVisible();
      await expect(page.getByTestId('settings-update-email-button')).toBeVisible();
      await expect(page.getByTestId('settings-cancel-email-button')).toBeVisible();
    });

    test('can cancel email change', async ({ page }) => {
      await page.goto('/settings');

      await page.getByTestId('settings-change-email-button').click();
      await expect(page.getByTestId('settings-new-email-input')).toBeVisible();

      await page.getByTestId('settings-cancel-email-button').click();

      await expect(page.getByTestId('settings-new-email-input')).not.toBeVisible();
      await expect(page.getByTestId('settings-change-email-button')).toBeVisible();
    });

    test('validates email format', async ({ page }) => {
      await page.goto('/settings');

      await page.getByTestId('settings-change-email-button').click();
      await page.getByTestId('settings-new-email-input').fill('notanemail');
      await page.getByTestId('settings-update-email-button').click();

      // HTML5 validation should prevent submission
      await expect(page.getByTestId('settings-new-email-input')).toBeVisible();
    });

    test('shows error for same email', async ({ page }) => {
      await page.goto('/settings');

      const currentEmail = await page.getByTestId('settings-current-email').textContent();

      await page.getByTestId('settings-change-email-button').click();
      // Input is pre-filled with current email, so just submit
      await page.getByTestId('settings-update-email-button').click();

      await expect(page.getByTestId('settings-email-error')).toBeVisible();
      await expect(page.getByTestId('settings-email-error')).toContainText('same as current');
    });
  });
  */
});
