import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { TEST_USER, AUTH_FILE } from './fixtures/auth.fixture';

// Ensure auth directory exists
import fs from 'fs';
const authDir = path.dirname(AUTH_FILE);
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

setup('authenticate', async ({ page }) => {
  // Skip setup if no test user credentials are provided
  if (!process.env.E2E_TEST_USER_EMAIL || !process.env.E2E_TEST_USER_PASSWORD) {
    console.log('Skipping auth setup: E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD not set');
    return;
  }

  await page.goto('/signin');

  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE });
});
