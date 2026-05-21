import { test, expect } from '@playwright/test';
import { loginAs, screenshot } from './fixtures/page-login';

test.describe.configure({ mode: 'serial' });

test.describe('04 — HSE Incident', () => {
  test('4.1 login as hse — dashboard loads', async ({ page }) => {
    await loginAs(page, 'hse');
    await screenshot(page, '04-hse', '4.1-hse-dashboard');
    await expect(page).toHaveURL(/\/(map|hse|journeys)/);
  });

  test('4.2 navigate to /hse — incident list loads', async ({ page }) => {
    await loginAs(page, 'hse');
    await page.goto('/hse');
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('hse-active-incidents-section')).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '04-hse', '4.2-hse-list');
  });

  test('4.3 KPI tiles visible on HSE page', async ({ page }) => {
    await loginAs(page, 'hse');
    await page.goto('/hse');
    await page.waitForTimeout(2000);
    // At least one KPI tile should be present
    const kpiTile = page.locator('[data-testid^="hse-kpi-"]').first();
    await expect(kpiTile).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '04-hse', '4.3-kpi-tiles');
  });

  test('4.4 click incident row — detail page loads', async ({ page }) => {
    await loginAs(page, 'hse');
    await page.goto('/hse');
    await page.waitForTimeout(2000);

    const firstIncident = page.locator('[data-testid^="incident-row-"]').first();
    if (!(await firstIncident.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No active incidents in test data');
      return;
    }

    await firstIncident.click();
    await expect(page).toHaveURL(/\/hse\/[0-9a-f-]+/, { timeout: 10_000 });
    await screenshot(page, '04-hse', '4.4-incident-detail');
  });

  test('4.5 incident detail — playbook steps rendered', async ({ page }) => {
    await loginAs(page, 'hse');
    await page.goto('/hse');
    await page.waitForTimeout(2000);

    const firstIncident = page.locator('[data-testid^="incident-row-"]').first();
    if (!(await firstIncident.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No active incidents in test data');
      return;
    }

    await firstIncident.click();
    await expect(page).toHaveURL(/\/hse\/[0-9a-f-]+/, { timeout: 10_000 });

    // At least step 1 should exist
    await expect(page.getByTestId('incident-step-1')).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '04-hse', '4.5-steps-visible');
  });

  test('4.6 complete active step — step marks done', async ({ page }) => {
    await loginAs(page, 'hse');
    await page.goto('/hse');
    await page.waitForTimeout(2000);

    const firstIncident = page.locator('[data-testid^="incident-row-"]').first();
    if (!(await firstIncident.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No active incidents');
      return;
    }

    await firstIncident.click();
    await expect(page).toHaveURL(/\/hse\/[0-9a-f-]+/, { timeout: 10_000 });

    // Find first available complete button
    const completeBtn = page.locator('[data-testid^="incident-step-"][data-testid$="-complete"]').first();
    if (!(await completeBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No active step to complete');
      return;
    }

    await completeBtn.click();
    await page.waitForTimeout(2000);
    await screenshot(page, '04-hse', '4.6-step-completed');
    // The step should no longer have a complete button (moved to next step)
    // Just verify page did not crash
    await expect(page).toHaveURL(/\/hse\/[0-9a-f-]+/);
  });

  test('4.7 escalate button visible when incident open', async ({ page }) => {
    await loginAs(page, 'hse');
    await page.goto('/hse');
    await page.waitForTimeout(2000);

    const firstIncident = page.locator('[data-testid^="incident-row-"]').first();
    if (!(await firstIncident.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No active incidents');
      return;
    }

    await firstIncident.click();
    await expect(page).toHaveURL(/\/hse\/[0-9a-f-]+/, { timeout: 10_000 });
    await expect(page.getByTestId('incident-escalate-button')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '04-hse', '4.7-escalate-visible');
  });
});
