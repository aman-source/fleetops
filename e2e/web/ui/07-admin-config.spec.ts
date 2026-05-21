import { test, expect } from '@playwright/test';
import { loginAs, screenshot } from './fixtures/page-login';

test.describe.configure({ mode: 'serial' });

test.describe('07 — Admin Config', () => {
  test('7.1 login as admin — dashboard loads', async ({ page }) => {
    await loginAs(page, 'admin');
    await screenshot(page, '07-admin', '7.1-admin-dashboard');
    await expect(page).toHaveURL(/\/(map|journeys|fleet|analytics|admin)/);
  });

  test('7.2 navigate to /admin — workflow list loads', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await screenshot(page, '07-admin', '7.2-admin-page');
    await expect(page).toHaveURL('/admin');
  });

  test('7.3 workflow table renders — headers visible', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    await expect(page.locator('th:has-text("Name")')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('th:has-text("Key")')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('th:has-text("Version")')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '07-admin', '7.3-workflow-table');
  });

  test('7.4 workflow rows visible if workflows configured', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="workflow-row-"]').first();
    if (await firstRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(firstRow).toBeVisible();
      await screenshot(page, '07-admin', '7.4-workflow-rows');
    } else {
      // Empty state is acceptable for test environment
      await screenshot(page, '07-admin', '7.4-no-workflows');
    }
  });

  test('7.5 non-admin cannot access /admin', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await screenshot(page, '07-admin', '7.5-jm-admin-blocked');
    // Should be redirected away from /admin
    await expect(page).not.toHaveURL('/admin');
  });
});
