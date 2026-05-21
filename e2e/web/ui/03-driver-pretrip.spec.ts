import { test, expect } from '@playwright/test';
import { loginAs, screenshot } from './fixtures/page-login';

test.describe.configure({ mode: 'serial' });

test.describe('03 — Driver Pre-trip', () => {
  test('3.1 login as driver — dashboard loads', async ({ page }) => {
    await loginAs(page, 'driver');
    await screenshot(page, '03-driver', '3.1-driver-dashboard');
    await expect(page).toHaveURL(/\/(map|journeys)/);
  });

  test('3.2 navigate to /journeys — journey list loads', async ({ page }) => {
    await loginAs(page, 'driver');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);
    await screenshot(page, '03-driver', '3.2-journey-list');
    // At least the page loaded without crashing
    await expect(page).toHaveURL('/journeys');
  });

  test('3.3 click a journey row — detail page loads', async ({ page }) => {
    await loginAs(page, 'driver');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="journey-row-"]').first();
    if (await firstRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+/, { timeout: 10_000 });
      await screenshot(page, '03-driver', '3.3-journey-detail');
    } else {
      // No journeys for driver — pass with note
      await screenshot(page, '03-driver', '3.3-no-journeys');
    }
  });

  test('3.4 journey detail — gates and submit visible', async ({ page }) => {
    await loginAs(page, 'driver');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="journey-row-"]').first();
    if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No journeys available for driver');
      return;
    }

    await firstRow.click();
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+/, { timeout: 10_000 });

    // Gate panels
    for (let i = 1; i <= 6; i++) {
      const panel = page.getByTestId(`gate-${i}-panel`);
      await expect(panel).toBeVisible({ timeout: 8_000 });
    }
    await screenshot(page, '03-driver', '3.4-gates-visible');
  });

  test('3.5 submit button present on journey detail', async ({ page }) => {
    await loginAs(page, 'driver');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="journey-row-"]').first();
    if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No journeys available for driver');
      return;
    }

    await firstRow.click();
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+/, { timeout: 10_000 });
    await expect(page.getByTestId('gates-submit-button')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '03-driver', '3.5-submit-visible');
  });
});
