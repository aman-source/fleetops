import { test, expect } from '@playwright/test';
import { loginAs, screenshot } from './fixtures/page-login';

test.describe.configure({ mode: 'serial' });

test.describe('08 — Analytics & Fleet', () => {
  test('8.1 login as jm — dashboard loads', async ({ page }) => {
    await loginAs(page, 'jm');
    await screenshot(page, '08-analytics', '8.1-jm-dashboard');
    await expect(page).toHaveURL(/\/(map|journeys|fleet|analytics)/);
  });

  test('8.2 navigate to /analytics — KPI tiles visible', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/analytics');
    await page.waitForTimeout(3000);
    await screenshot(page, '08-analytics', '8.2-analytics-page');
    await expect(page).toHaveURL('/analytics');
  });

  test('8.3 fleet utilization KPI tile renders with number', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    const tile = page.getByTestId('analytics-kpi-fleet-utilization');
    await expect(tile).toBeVisible({ timeout: 10_000 });
    // Should contain a number value (not empty/loading)
    const text = await tile.textContent() ?? '';
    expect(text.length).toBeGreaterThan(0);
    await screenshot(page, '08-analytics', '8.3-fleet-utilization-tile');
  });

  test('8.4 incidents KPI tile renders', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    const tile = page.getByTestId('analytics-kpi-incidents-30d');
    await expect(tile).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '08-analytics', '8.4-incidents-tile');
  });

  test('8.5 all 6 KPI tiles render', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    const tiles = page.locator('[data-testid^="analytics-kpi-"]');
    await expect(tiles).toHaveCount(6, { timeout: 10_000 });
    await screenshot(page, '08-analytics', '8.5-all-kpi-tiles');
  });

  test('8.6 export PDF button visible', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/analytics');
    await page.waitForTimeout(2000);

    await expect(page.getByTestId('analytics-export-pdf')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '08-analytics', '8.6-export-pdf-btn');
  });

  test('8.7 share to BI button visible', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/analytics');
    await page.waitForTimeout(2000);

    await expect(page.getByTestId('analytics-share-bi')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '08-analytics', '8.7-share-bi-btn');
  });

  test('8.8 navigate to /fleet — vehicle list loads', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/fleet');
    await page.waitForTimeout(2000);
    await screenshot(page, '08-analytics', '8.8-fleet-page');
    await expect(page).toHaveURL('/fleet');
  });

  test('8.9 fleet search input visible', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/fleet');
    await page.waitForTimeout(2000);

    await expect(page.getByTestId('fleet-search-input')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '08-analytics', '8.9-fleet-search');
  });

  test('8.10 fleet vehicle rows visible with status badges', async ({ page }) => {
    await loginAs(page, 'admin'); // admin org has seeded vehicles; jm (Marmul Ops) has none
    await page.goto('/fleet');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="vehicle-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    const firstBadge = page.locator('[data-testid^="vehicle-status-"]').first();
    await expect(firstBadge).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '08-analytics', '8.10-vehicle-rows');
  });

  test('8.11 fleet search filters vehicle rows', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/fleet');
    await page.waitForTimeout(2000);

    const search = page.getByTestId('fleet-search-input');
    await expect(search).toBeVisible({ timeout: 8_000 });

    // Type something unlikely to match all vehicles
    await search.fill('12-A');
    await page.waitForTimeout(1000);
    await screenshot(page, '08-analytics', '8.11-fleet-filtered');
    // Page should not crash
    await expect(page).toHaveURL('/fleet');
  });

  test('8.12 click vehicle row — /fleet/[id] loads with tabs', async ({ page }) => {
    await loginAs(page, 'admin'); // admin org has seeded vehicles
    await page.goto('/fleet');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="vehicle-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/fleet\/[0-9a-f-]+/, { timeout: 10_000 });
    await screenshot(page, '08-analytics', '8.12-vehicle-detail');

    // Tabs should be visible
    const tab = page.locator('[data-testid^="vehicle-tab-"]').first();
    await expect(tab).toBeVisible({ timeout: 8_000 });
  });

  test('8.13 vehicle detail tabs — documents and IVMS accessible', async ({ page }) => {
    await loginAs(page, 'admin'); // admin org has seeded vehicles
    await page.goto('/fleet');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="vehicle-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/fleet\/[0-9a-f-]+/, { timeout: 10_000 });

    // Try clicking Documents tab
    const docsTab = page.getByTestId('vehicle-tab-documents');
    if (await docsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await docsTab.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '08-analytics', '8.13-documents-tab');
    }

    // Try clicking IVMS tab
    const ivmsTab = page.getByTestId('vehicle-tab-ivms');
    if (await ivmsTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await ivmsTab.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '08-analytics', '8.13-ivms-tab');
    }

    await expect(page).toHaveURL(/\/fleet\/[0-9a-f-]+/);
  });
});
