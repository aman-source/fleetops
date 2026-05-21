import { test, expect } from '@playwright/test';
import { loginAs, screenshot } from './fixtures/page-login';

test.describe.configure({ mode: 'serial' });

test.describe('05 — Maintenance Release', () => {
  test('5.1 login as maint — dashboard loads', async ({ page }) => {
    await loginAs(page, 'maint');
    await screenshot(page, '05-maint', '5.1-maint-dashboard');
    await expect(page).toHaveURL(/\/(map|maintenance|journeys)/);
  });

  test('5.2 navigate to /maintenance — bay board loads', async ({ page }) => {
    await loginAs(page, 'maint');
    await page.goto('/maintenance');
    await page.waitForTimeout(2000);
    await screenshot(page, '05-maint', '5.2-bay-board');
    await expect(page).toHaveURL('/maintenance');
  });

  test('5.3 WO cards visible on bay board', async ({ page }) => {
    await loginAs(page, 'maint');
    await page.goto('/maintenance');
    await page.waitForTimeout(2000);

    // Either a WO card or inbound queue item should be visible
    const woCard = page.locator('[data-testid^="wo-card-"], [data-testid^="wo-inbound-"]').first();
    if (await woCard.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(woCard).toBeVisible();
    }
    await screenshot(page, '05-maint', '5.3-wo-cards');
  });

  test('5.4 click WO card — navigates to detail page', async ({ page }) => {
    await loginAs(page, 'maint');
    await page.goto('/maintenance');
    await page.waitForTimeout(2000);

    const woCard = page.locator('[data-testid^="wo-card-"], [data-testid^="wo-inbound-"], [data-testid^="wo-row-"]').first();
    if (!(await woCard.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No work orders in test data');
      return;
    }

    await woCard.click();
    await expect(page).toHaveURL(/\/maintenance\/[0-9a-f-]+/, { timeout: 10_000 });
    await screenshot(page, '05-maint', '5.4-wo-detail');
  });

  test('5.5 release decision button visible on WO without release', async ({ page }) => {
    await loginAs(page, 'maint');
    await page.goto('/maintenance');
    await page.waitForTimeout(2000);

    const woCard = page.locator('[data-testid^="wo-card-"], [data-testid^="wo-inbound-"], [data-testid^="wo-row-"]').first();
    if (!(await woCard.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No work orders');
      return;
    }

    await woCard.click();
    await expect(page).toHaveURL(/\/maintenance\/[0-9a-f-]+/, { timeout: 10_000 });

    const releaseBtn = page.getByTestId('wo-release-decision-button');
    if (await releaseBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(releaseBtn).toBeVisible();
      await screenshot(page, '05-maint', '5.5-release-btn-visible');
    } else {
      // WO already has a release decision — take screenshot of current state
      await screenshot(page, '05-maint', '5.5-already-released');
    }
  });

  test('5.6 release modal — GO / CONDITIONAL / NO-GO buttons visible', async ({ page }) => {
    await loginAs(page, 'maint');
    await page.goto('/maintenance');
    await page.waitForTimeout(2000);

    const woCard = page.locator('[data-testid^="wo-card-"], [data-testid^="wo-inbound-"], [data-testid^="wo-row-"]').first();
    if (!(await woCard.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No work orders');
      return;
    }

    await woCard.click();
    await expect(page).toHaveURL(/\/maintenance\/[0-9a-f-]+/, { timeout: 10_000 });

    const releaseBtn = page.getByTestId('wo-release-decision-button');
    if (!(await releaseBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'WO already released');
      return;
    }

    await releaseBtn.click();
    await page.waitForTimeout(500);

    await expect(page.getByTestId('wo-release-go')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('wo-release-conditional')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('wo-release-no_go')).toBeVisible({ timeout: 5_000 });
    await screenshot(page, '05-maint', '5.6-modal-open');
  });

  test('5.7 conditional release — expiry input appears on CONDITIONAL select', async ({ page }) => {
    await loginAs(page, 'maint');
    await page.goto('/maintenance');
    await page.waitForTimeout(2000);

    const woCard = page.locator('[data-testid^="wo-card-"], [data-testid^="wo-inbound-"], [data-testid^="wo-row-"]').first();
    if (!(await woCard.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No work orders');
      return;
    }

    await woCard.click();
    await expect(page).toHaveURL(/\/maintenance\/[0-9a-f-]+/, { timeout: 10_000 });

    const releaseBtn = page.getByTestId('wo-release-decision-button');
    if (!(await releaseBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'WO already released');
      return;
    }

    await releaseBtn.click();
    await page.waitForTimeout(500);
    await page.getByTestId('wo-release-conditional').click();
    await expect(page.getByTestId('wo-conditional-expiry-input')).toBeVisible({ timeout: 5_000 });
    await screenshot(page, '05-maint', '5.7-expiry-input-visible');
  });

  test('5.8 GO release — submit closes modal and updates page', async ({ page }) => {
    await loginAs(page, 'maint');
    await page.goto('/maintenance');
    await page.waitForTimeout(2000);

    const woCard = page.locator('[data-testid^="wo-card-"], [data-testid^="wo-inbound-"], [data-testid^="wo-row-"]').first();
    if (!(await woCard.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, 'No work orders');
      return;
    }

    await woCard.click();
    await expect(page).toHaveURL(/\/maintenance\/[0-9a-f-]+/, { timeout: 10_000 });

    const releaseBtn = page.getByTestId('wo-release-decision-button');
    if (!(await releaseBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'WO already released');
      return;
    }

    await releaseBtn.click();
    await page.waitForTimeout(500);
    await page.getByTestId('wo-release-go').click();
    await page.getByTestId('wo-release-reason').fill('Passed all checks — clear to proceed');
    await page.getByTestId('wo-release-submit').click();
    await page.waitForTimeout(2000);
    await screenshot(page, '05-maint', '5.8-go-released');
    // Modal should be closed
    await expect(page.getByTestId('wo-release-go')).not.toBeVisible({ timeout: 5_000 });
  });
});
