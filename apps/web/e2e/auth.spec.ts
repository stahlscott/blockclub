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
});
