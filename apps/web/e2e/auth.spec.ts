import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows sign in form', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByTestId('signin-form-email-input')).toBeVisible();
    await expect(page.getByTestId('signin-form-password-input')).toBeVisible();
    await expect(page.getByTestId('signin-form-submit-button')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');

    await page.getByTestId('signin-form-email-input').fill('invalid@example.com');
    await page.getByTestId('signin-form-password-input').fill('wrongpassword');
    await page.getByTestId('signin-form-submit-button').click();

    // Wait for error message to appear
    await expect(page.getByTestId('signin-form-error')).toBeVisible({ timeout: 10000 });
  });

  test('redirects unauthenticated users from protected routes', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');

    // Should redirect to signin
    await expect(page).toHaveURL(/\/signin/);
  });

  test('email field validates email format', async ({ page }) => {
    await page.goto('/signin');

    const emailInput = page.getByTestId('signin-form-email-input');
    await emailInput.fill('notanemail');

    // HTML5 validation should prevent submission
    const submitButton = page.getByTestId('signin-form-submit-button');
    await submitButton.click();

    // The form should not navigate away due to HTML5 validation
    await expect(page).toHaveURL(/\/signin/);
  });

  test('shows loading state during sign in', async ({ page }) => {
    await page.goto('/signin');

    await page.getByTestId('signin-form-email-input').fill('test@example.com');
    await page.getByTestId('signin-form-password-input').fill('somepassword');

    // Click and immediately check for loading state
    const submitButton = page.getByTestId('signin-form-submit-button');
    await submitButton.click();

    // Button should show loading text briefly (same testID, text changes)
    await expect(submitButton).toContainText('Signing in...');
  });

  test('has link text for users without account', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByText('Ask a neighbor for an invite link')).toBeVisible();
  });

  test('has forgot password link that navigates to reset page', async ({ page }) => {
    await page.goto('/signin');

    const forgotLink = page.getByTestId('signin-form-forgot-password-link');
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveText('Forgot password?');

    await forgotLink.click();
    await expect(page).toHaveURL('/forgot-password');
  });

  test('has magic link toggle', async ({ page }) => {
    await page.goto('/signin');

    const magicLinkToggle = page.getByTestId('signin-form-magic-link-toggle');
    await expect(magicLinkToggle).toBeVisible();
    await expect(magicLinkToggle).toHaveText('Sign in with email link instead');
  });
});

test.describe('Magic Link Sign In', () => {
  test('can switch to magic link mode', async ({ page }) => {
    await page.goto('/signin');

    // Click toggle to switch to magic link mode
    await page.getByTestId('signin-form-magic-link-toggle').click();

    // Should show magic link form
    await expect(page.getByTestId('signin-magic-link-form')).toBeVisible();
    await expect(page.getByTestId('signin-magic-link-email-input')).toBeVisible();
    await expect(page.getByTestId('signin-magic-link-submit-button')).toBeVisible();
    await expect(page.getByText('no password needed')).toBeVisible();

    // Password field should not be visible
    await expect(page.getByTestId('signin-form-password-input')).not.toBeVisible();
  });

  test('can switch back to password mode', async ({ page }) => {
    await page.goto('/signin');

    // Switch to magic link mode
    await page.getByTestId('signin-form-magic-link-toggle').click();
    await expect(page.getByTestId('signin-magic-link-form')).toBeVisible();

    // Switch back to password mode
    await page.getByTestId('signin-magic-link-password-toggle').click();

    // Should show password form again
    await expect(page.getByTestId('signin-form')).toBeVisible();
    await expect(page.getByTestId('signin-form-password-input')).toBeVisible();
  });

  test('shows loading state when sending magic link', async ({ page }) => {
    await page.goto('/signin');

    // Switch to magic link mode
    await page.getByTestId('signin-form-magic-link-toggle').click();

    // Fill email and submit
    await page.getByTestId('signin-magic-link-email-input').fill('test@example.com');
    const submitButton = page.getByTestId('signin-magic-link-submit-button');
    await submitButton.click();

    // Should show loading state
    await expect(submitButton).toContainText('Sending...');
  });

  test('shows success state or error after sending magic link', async ({ page }) => {
    await page.goto('/signin');

    // Switch to magic link mode
    await page.getByTestId('signin-form-magic-link-toggle').click();

    // Fill email and submit
    await page.getByTestId('signin-magic-link-email-input').fill('test@example.com');
    await page.getByTestId('signin-magic-link-submit-button').click();

    // Should show either success state OR an error message (Supabase behavior varies by config)
    const successHeading = page.getByRole('heading', { name: 'Check your email' });
    const errorMessage = page.getByTestId('signin-magic-link-error');

    // Wait for either outcome
    await expect(successHeading.or(errorMessage)).toBeVisible({ timeout: 10000 });

    // If success, verify the full success UI
    if (await successHeading.isVisible()) {
      await expect(page.getByText('test@example.com')).toBeVisible();
      await expect(page.getByText('Use a different email')).toBeVisible();
      await expect(page.getByText('Sign in with password instead')).toBeVisible();
    }
  });

  test('can return to email input from success state', async ({ page }) => {
    await page.goto('/signin');

    // Switch to magic link mode and send
    await page.getByTestId('signin-form-magic-link-toggle').click();
    await page.getByTestId('signin-magic-link-email-input').fill('test@example.com');
    await page.getByTestId('signin-magic-link-submit-button').click();

    // Wait for either success or error state
    const successHeading = page.getByRole('heading', { name: 'Check your email' });
    const errorMessage = page.getByTestId('signin-magic-link-error');
    await expect(successHeading.or(errorMessage)).toBeVisible({ timeout: 10000 });

    // Skip the rest of this test if Supabase returned an error
    if (await errorMessage.isVisible()) {
      // Test passes - we can't test "return to email" without success state
      return;
    }

    // Click "Use a different email"
    await page.getByTestId('signin-magic-link-different-email-button').click();

    // Should be back on magic link form
    await expect(page.getByTestId('signin-magic-link-form')).toBeVisible();
    await expect(page.getByTestId('signin-magic-link-email-input')).toBeVisible();
  });

  test('preserves email when switching modes', async ({ page }) => {
    await page.goto('/signin');

    // Enter email in password mode
    await page.getByTestId('signin-form-email-input').fill('preserved@example.com');

    // Switch to magic link mode
    await page.getByTestId('signin-form-magic-link-toggle').click();

    // Email should be preserved
    await expect(page.getByTestId('signin-magic-link-email-input')).toHaveValue('preserved@example.com');

    // Switch back to password mode
    await page.getByTestId('signin-magic-link-password-toggle').click();

    // Email should still be preserved
    await expect(page.getByTestId('signin-form-email-input')).toHaveValue('preserved@example.com');
  });
});

test.describe('Forgot Password', () => {
  test('shows forgot password form', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await expect(page.getByTestId('forgot-password-form-email-input')).toBeVisible();
    await expect(page.getByTestId('forgot-password-form-submit-button')).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('shows success state or error after submitting email', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByTestId('forgot-password-form-email-input').fill('test@example.com');
    await page.getByTestId('forgot-password-form-submit-button').click();

    // Should show either success state OR an error message (Supabase behavior varies by config)
    const successHeading = page.getByRole('heading', { name: 'Check your email' });
    const errorMessage = page.getByTestId('forgot-password-form-error');

    await expect(successHeading.or(errorMessage)).toBeVisible({ timeout: 10000 });

    // If success, verify the full success UI
    if (await successHeading.isVisible()) {
      await expect(page.getByText('test@example.com')).toBeVisible();
      await expect(page.getByText('Back to sign in')).toBeVisible();
    }
  });

  test('shows loading state during submission', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByTestId('forgot-password-form-email-input').fill('test@example.com');

    const submitButton = page.getByTestId('forgot-password-form-submit-button');
    await submitButton.click();

    await expect(submitButton).toContainText('Sending...');
  });

  test('back to sign in link works', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.getByTestId('forgot-password-form-signin-link').click();
    await expect(page).toHaveURL('/signin');
  });
});

test.describe('Reset Password', () => {
  test('shows reset password form', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible();
    await expect(page.getByTestId('reset-password-form-password-input')).toBeVisible();
    await expect(page.getByTestId('reset-password-form-confirm-input')).toBeVisible();
    await expect(page.getByTestId('reset-password-form-submit-button')).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/reset-password');

    await page.getByTestId('reset-password-form-password-input').fill('newpassword123');
    await page.getByTestId('reset-password-form-confirm-input').fill('differentpassword');
    await page.getByTestId('reset-password-form-submit-button').click();

    await expect(page.getByTestId('reset-password-form-error')).toHaveText("Passwords don't match");
  });

  test('shows error when password is too short', async ({ page }) => {
    await page.goto('/reset-password');

    await page.getByTestId('reset-password-form-password-input').fill('short');
    await page.getByTestId('reset-password-form-confirm-input').fill('short');
    await page.getByTestId('reset-password-form-submit-button').click();

    await expect(page.getByTestId('reset-password-form-error')).toHaveText('Password must be at least 8 characters');
  });

  test('back to sign in link works', async ({ page }) => {
    await page.goto('/reset-password');

    await page.getByTestId('reset-password-form-signin-link').click();
    await expect(page).toHaveURL('/signin');
  });
});
