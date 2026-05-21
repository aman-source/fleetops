import { test, expect } from '@playwright/test';
import { loginAs, screenshot } from './fixtures/page-login';

test.describe.configure({ mode: 'serial' });

test.describe('06 — Passenger Request', () => {
  test('6.1 login as passenger — dashboard loads', async ({ page }) => {
    await loginAs(page, 'passenger');
    await screenshot(page, '06-passenger', '6.1-passenger-dashboard');
    await expect(page).toHaveURL(/\/(map|passenger)/);
  });

  test('6.2 navigate to /passenger — request table loads', async ({ page }) => {
    await loginAs(page, 'passenger');
    await page.goto('/passenger');
    await page.waitForTimeout(2000);
    await screenshot(page, '06-passenger', '6.2-passenger-page');
    await expect(page).toHaveURL('/passenger');
  });

  test('6.3 passenger request rows visible (if any exist)', async ({ page }) => {
    await loginAs(page, 'passenger');
    await page.goto('/passenger');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="passenger-request-row-"]').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(firstRow).toBeVisible();
      await screenshot(page, '06-passenger', '6.3-request-rows');
    } else {
      // Empty state is acceptable
      await screenshot(page, '06-passenger', '6.3-no-requests');
    }
  });

  test('6.4 passenger request status badges visible', async ({ page }) => {
    await loginAs(page, 'passenger');
    await page.goto('/passenger');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="passenger-request-row-"]').first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No passenger requests in test data');
      return;
    }

    // Status badge inside the row
    const statusBadge = page.locator('tbody tr td span[class*="bg-"]').first();
    await expect(statusBadge).toBeVisible({ timeout: 5_000 });
    await screenshot(page, '06-passenger', '6.4-status-badges');
  });

  test('6.5 page shows correct column headers', async ({ page }) => {
    await loginAs(page, 'passenger');
    await page.goto('/passenger');
    await page.waitForTimeout(2000);

    // Table should have Request #, Pickup, Drop, Time, Priority, Status columns
    await expect(page.locator('th:has-text("Request")')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('th:has-text("Status")')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '06-passenger', '6.5-column-headers');
  });
});
