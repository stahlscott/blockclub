import { test as base, expect } from '@playwright/test';
import path from 'path';

// Test user credentials (from environment or defaults for local testing)
export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL || 'e2e-test@blockclub.test',
  password: process.env.E2E_TEST_USER_PASSWORD || 'test-password-123',
};

// Path to store authentication state
export const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

// Extend base test with authentication fixture
export const test = base.extend<{ authenticatedPage: typeof base }>({
  authenticatedPage: async ({ page }, use) => {
    // Sign in before test
    await page.goto('/signin');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    await use(page as any);
  },
});

export { expect };
