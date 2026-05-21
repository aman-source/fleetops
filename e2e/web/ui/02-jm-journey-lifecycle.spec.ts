import { test, expect } from '@playwright/test';
import { loginAs, screenshot } from './fixtures/page-login';

test.describe.configure({ mode: 'serial' });

let createdJourneyId: string;

test.describe('02 — JM Journey Lifecycle', () => {
  test('2.1 login as jm — dashboard loads', async ({ page }) => {
    await loginAs(page, 'jm');
    await screenshot(page, '02-journey', '2.1-jm-dashboard');
    await expect(page).toHaveURL(/\/(map|journeys|fleet|analytics)/);
  });

  test('2.2 navigate to /journeys — list + new button visible', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/journeys');
    await expect(page.getByTestId('journey-list-new-button')).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '02-journey', '2.2-journey-list');
  });

  test('2.3 new journey modal opens on button click', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/journeys');
    await page.getByTestId('journey-list-new-button').click();
    // Modal should appear — look for a dialog or form with vehicle input
    await expect(page.locator('[role="dialog"], [data-modal], form')).toBeVisible({ timeout: 8_000 });
    await screenshot(page, '02-journey', '2.3-new-journey-modal');
  });

  test('2.4 create journey — fills form and submits', async ({ page }) => {
    await loginAs(page, 'jm');
    await page.goto('/journeys');
    await page.getByTestId('journey-list-new-button').click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Fill vehicle — look for combobox/input for vehicle
    const vehicleInput = page.locator('input[placeholder*="vehicle" i], input[placeholder*="plate" i], [data-testid*="vehicle"]').first();
    if (await vehicleInput.isVisible()) {
      await vehicleInput.click();
      await vehicleInput.fill('');
      await page.waitForTimeout(500);
      // Select first option if dropdown appears
      const option = page.locator('[role="option"], [data-option]').first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      }
    }

    // Fill driver
    const driverInput = page.locator('input[placeholder*="driver" i], [data-testid*="driver"]').first();
    if (await driverInput.isVisible()) {
      await driverInput.click();
      await driverInput.fill('');
      await page.waitForTimeout(500);
      const option = page.locator('[role="option"], [data-option]').first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click();
      }
    }

    // Fill purpose
    const purposeInput = page.locator('input[placeholder*="purpose" i], textarea[placeholder*="purpose" i]').first();
    if (await purposeInput.isVisible()) {
      await purposeInput.fill('Test journey — E2E automated');
    }

    // Fill departure date/time
    const departureInput = page.locator('input[type="datetime-local"], input[placeholder*="departure" i]').first();
    if (await departureInput.isVisible()) {
      const future = new Date(Date.now() + 2 * 3600_000);
      const iso = future.toISOString().slice(0, 16);
      await departureInput.fill(iso);
    }

    // Fill arrival
    const arrivalInput = page.locator('input[type="datetime-local"], input[placeholder*="arrival" i]').nth(1);
    if (await arrivalInput.isVisible()) {
      const future = new Date(Date.now() + 6 * 3600_000);
      const iso = future.toISOString().slice(0, 16);
      await arrivalInput.fill(iso);
    }

    await screenshot(page, '02-journey', '2.4-form-filled');

    // Submit — look for create/submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }

    await screenshot(page, '02-journey', '2.4-after-create');
  });

  // Tests 2.5-2.8 use admin because seeded journeys are in AR Technology org (admin's org).
  // jm is in Marmul Operations which has no seeded journeys.
  test('2.5 journey row is clickable and navigates to detail', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);

    // Click the first journey row
    const firstRow = page.locator('[data-testid^="journey-row-"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    // Extract id from testid
    const testId = await firstRow.getAttribute('data-testid') ?? '';
    createdJourneyId = testId.replace('journey-row-', '');

    await firstRow.click();
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+/, { timeout: 10_000 });
    await screenshot(page, '02-journey', '2.5-journey-detail');
  });

  test('2.6 journey detail — gates rendered', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="journey-row-"]').first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+/, { timeout: 10_000 });

    // All 6 gate panels should be visible
    for (let i = 1; i <= 6; i++) {
      await expect(page.getByTestId(`gate-${i}-panel`)).toBeVisible({ timeout: 10_000 });
    }
    await screenshot(page, '02-journey', '2.6-gates-visible');
  });

  test('2.7 gates submit button is visible', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);

    const firstRow = page.locator('[data-testid^="journey-row-"]').first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+/, { timeout: 10_000 });

    await expect(page.getByTestId('gates-submit-button')).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '02-journey', '2.7-submit-button');
  });

  test('2.8 status badges visible on journey list rows', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/journeys');
    await page.waitForTimeout(2000);

    const firstStatusBadge = page.locator('[data-testid^="journey-status-"]').first();
    await expect(firstStatusBadge).toBeVisible({ timeout: 10_000 });
    await screenshot(page, '02-journey', '2.8-status-badges');
  });
});
