import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows sign in form', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/signin');

    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for error message to appear
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 10000 });
  });

  test('redirects unauthenticated users from protected routes', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');

    // Should redirect to signin
    await expect(page).toHaveURL(/\/signin/);
  });

  test('email field validates email format', async ({ page }) => {
    await page.goto('/signin');

    const emailInput = page.getByLabel('Email');
    await emailInput.fill('notanemail');

    // HTML5 validation should prevent submission
    const submitButton = page.getByRole('button', { name: 'Sign in' });
    await submitButton.click();

    // The form should not navigate away due to HTML5 validation
    await expect(page).toHaveURL(/\/signin/);
  });

  test('shows loading state during sign in', async ({ page }) => {
    await page.goto('/signin');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('somepassword');

    // Click and immediately check for loading state
    const submitButton = page.getByRole('button', { name: 'Sign in' });
    await submitButton.click();

    // Button should show loading text briefly
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
  });

  test('has link text for users without account', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByText('Ask a neighbor for an invite link')).toBeVisible();
  });
});
