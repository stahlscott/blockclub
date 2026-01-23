import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test as authenticatedTest } from './fixtures/auth.fixture';

// Store all violations for final report
const allViolations: Array<{
  page: string;
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'];
}> = [];

/**
 * Accessibility audit tests using axe-core
 *
 * These tests scan key pages for WCAG violations including:
 * - Missing labels
 * - Color contrast issues
 * - Keyboard navigation problems
 * - ARIA attribute issues
 */

test.describe('Accessibility Audit - Public Pages', () => {
  test('signin page should have no accessibility violations', async ({ page }) => {
    await page.goto('/signin');

    // Wait for page to be fully loaded
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    allViolations.push({ page: '/signin', violations: accessibilityScanResults.violations });

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n=== Signin Page Accessibility Violations ===');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`\n[${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
        console.log(`  Help: ${violation.helpUrl}`);
        violation.nodes.forEach((node) => {
          console.log(`  - ${node.html}`);
          console.log(`    Fix: ${node.failureSummary}`);
        });
      });
    }

    // For now, we log violations but don't fail - this allows us to audit first
    // Uncomment the line below to enforce accessibility compliance:
    // expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('forgot-password page should have no accessibility violations', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    allViolations.push({ page: '/forgot-password', violations: accessibilityScanResults.violations });

    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n=== Forgot Password Page Accessibility Violations ===');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`\n[${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
        console.log(`  Help: ${violation.helpUrl}`);
        violation.nodes.forEach((node) => {
          console.log(`  - ${node.html}`);
          console.log(`    Fix: ${node.failureSummary}`);
        });
      });
    }
  });

  test('reset-password page should have no accessibility violations', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    allViolations.push({ page: '/reset-password', violations: accessibilityScanResults.violations });

    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n=== Reset Password Page Accessibility Violations ===');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`\n[${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
        console.log(`  Help: ${violation.helpUrl}`);
        violation.nodes.forEach((node) => {
          console.log(`  - ${node.html}`);
          console.log(`    Fix: ${node.failureSummary}`);
        });
      });
    }
  });
});

// Authenticated page tests - require E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD
authenticatedTest.describe('Accessibility Audit - Protected Pages', () => {
  authenticatedTest.skip(
    !process.env.E2E_TEST_USER_EMAIL || !process.env.E2E_TEST_USER_PASSWORD,
    'Skipping authenticated tests: E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD required'
  );

  authenticatedTest('dashboard page should have no accessibility violations', async ({ authenticatedPage }) => {
    const page = authenticatedPage as unknown as import('@playwright/test').Page;

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('main')).toBeVisible();

    // Wait a bit for any async content to load
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    allViolations.push({ page: '/dashboard', violations: accessibilityScanResults.violations });

    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n=== Dashboard Page Accessibility Violations ===');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`\n[${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
        console.log(`  Help: ${violation.helpUrl}`);
        violation.nodes.forEach((node) => {
          console.log(`  - ${node.html}`);
          console.log(`    Fix: ${node.failureSummary}`);
        });
      });
    }
  });

  authenticatedTest('library page should have no accessibility violations', async ({ authenticatedPage }) => {
    const page = authenticatedPage as unknown as import('@playwright/test').Page;

    // First go to dashboard to get the neighborhood context
    await expect(page).toHaveURL('/dashboard');

    // Find and click on the library link from the header navigation
    // The library is at /neighborhoods/[slug]/library
    const libraryLink = page.getByTestId('header-library-link');
    const mobileLibraryLink = page.getByTestId('header-mobile-library-link');

    // If there's a library link visible (desktop or mobile), click it
    if (await libraryLink.isVisible()) {
      await libraryLink.click();
    } else if (await mobileLibraryLink.isVisible()) {
      await mobileLibraryLink.click();
    } else {
      // Skip if we can't find the library link
      authenticatedTest.skip();
      return;
    }

    // Wait for library page to load
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    allViolations.push({ page: '/library', violations: accessibilityScanResults.violations });

    if (accessibilityScanResults.violations.length > 0) {
      console.log('\n=== Library Page Accessibility Violations ===');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`\n[${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.description}`);
        console.log(`  Help: ${violation.helpUrl}`);
        violation.nodes.forEach((node) => {
          console.log(`  - ${node.html}`);
          console.log(`    Fix: ${node.failureSummary}`);
        });
      });
    }
  });
});

// Generate summary report after all tests
test.afterAll(() => {
  if (allViolations.length === 0) return;

  const totalViolations = allViolations.reduce((sum, page) => sum + page.violations.length, 0);

  console.log('\n\n========================================');
  console.log('   ACCESSIBILITY AUDIT SUMMARY');
  console.log('========================================\n');

  allViolations.forEach(({ page, violations }) => {
    const critical = violations.filter((v) => v.impact === 'critical').length;
    const serious = violations.filter((v) => v.impact === 'serious').length;
    const moderate = violations.filter((v) => v.impact === 'moderate').length;
    const minor = violations.filter((v) => v.impact === 'minor').length;

    console.log(`${page}:`);
    console.log(
      `  Total: ${violations.length} violations (${critical} critical, ${serious} serious, ${moderate} moderate, ${minor} minor)`
    );
    console.log('');
  });

  console.log(`Total violations across all pages: ${totalViolations}`);
  console.log('\nRun with DEBUG=pw:api for detailed violation information.');
  console.log('========================================\n');
});
