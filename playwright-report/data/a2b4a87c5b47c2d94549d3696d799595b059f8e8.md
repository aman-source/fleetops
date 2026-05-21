# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui\01-auth.spec.ts >> 01 — Authentication >> 1.7 wrong password shows error message
- Location: e2e\web\ui\01-auth.spec.ts:43:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('auth-error-message')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('auth-error-message')
    - waiting for" http://localhost:3001/login" navigation to finish...
    - navigated to "http://localhost:3001/login"

```

```yaml
- heading "FLEETOPS" [level=1]
- paragraph: AR Technology Fleet Management
- text: Email
- textbox "admin@artech.om"
- text: Password
- textbox "••••••••"
- button "Sign in"
- paragraph: Fleetops v0.1.0 — Oman
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginViaForm, loginAs, screenshot } from './fixtures/page-login';
  3  | 
  4  | test.describe.configure({ mode: 'serial' });
  5  | 
  6  | test.describe('01 — Authentication', () => {
  7  |   test('1.1 admin login redirects to dashboard', async ({ page }) => {
  8  |     await loginViaForm(page, 'admin');
  9  |     await screenshot(page, '01-auth', '1.1-admin-logged-in');
  10 |     await expect(page).toHaveURL(/\/(map|journeys|fleet|analytics|admin)/);
  11 |   });
  12 | 
  13 |   test('1.2 jm login redirects to dashboard', async ({ page }) => {
  14 |     await loginViaForm(page, 'jm');
  15 |     await screenshot(page, '01-auth', '1.2-jm-logged-in');
  16 |     await expect(page).toHaveURL(/\/(map|journeys|fleet|analytics)/);
  17 |   });
  18 | 
  19 |   test('1.3 hse login redirects to dashboard', async ({ page }) => {
  20 |     await loginViaForm(page, 'hse');
  21 |     await screenshot(page, '01-auth', '1.3-hse-logged-in');
  22 |     await expect(page).toHaveURL(/\/(map|hse|journeys)/);
  23 |   });
  24 | 
  25 |   test('1.4 maint login redirects to dashboard', async ({ page }) => {
  26 |     await loginViaForm(page, 'maint');
  27 |     await screenshot(page, '01-auth', '1.4-maint-logged-in');
  28 |     await expect(page).toHaveURL(/\/(map|maintenance|journeys)/);
  29 |   });
  30 | 
  31 |   test('1.5 driver login redirects to dashboard', async ({ page }) => {
  32 |     await loginViaForm(page, 'driver');
  33 |     await screenshot(page, '01-auth', '1.5-driver-logged-in');
  34 |     await expect(page).toHaveURL(/\/(map|journeys)/);
  35 |   });
  36 | 
  37 |   test('1.6 passenger login redirects to dashboard', async ({ page }) => {
  38 |     await loginViaForm(page, 'passenger');
  39 |     await screenshot(page, '01-auth', '1.6-passenger-logged-in');
  40 |     await expect(page).toHaveURL(/\/(map|passenger)/);
  41 |   });
  42 | 
  43 |   test('1.7 wrong password shows error message', async ({ page }) => {
  44 |     await page.goto('/login');
  45 |     await page.getByTestId('auth-email-input').fill('admin@artech.om');
  46 |     await page.getByTestId('auth-password-input').fill('WrongPassword123!');
  47 |     await page.getByTestId('auth-submit-button').click();
> 48 |     await expect(page.getByTestId('auth-error-message')).toBeVisible({ timeout: 10_000 });
     |                                                          ^ Error: expect(locator).toBeVisible() failed
  49 |     await screenshot(page, '01-auth', '1.7-wrong-password-error');
  50 |     await expect(page).toHaveURL(/\/login/);
  51 |   });
  52 | 
  53 |   test('1.8 invalid email format triggers form validation', async ({ page }) => {
  54 |     await page.goto('/login');
  55 |     await page.getByTestId('auth-email-input').fill('notanemail');
  56 |     await page.getByTestId('auth-password-input').fill('SomePassword1!');
  57 |     await page.getByTestId('auth-submit-button').click();
  58 |     // Browser native validation prevents submission — URL stays on /login
  59 |     await screenshot(page, '01-auth', '1.8-invalid-email');
  60 |     await expect(page).toHaveURL(/\/login/);
  61 |   });
  62 | 
  63 |   test('1.9 jm can logout and is redirected to /login', async ({ page }) => {
  64 |     await loginAs(page, 'jm');
  65 |     // Look for logout — could be in a user menu. Try common testids or navigate directly.
  66 |     // If no logout button wired, test that /login is accessible post-session.
  67 |     await page.goto('/login');
  68 |     await screenshot(page, '01-auth', '1.9-logout-redirected');
  69 |     await expect(page).toHaveURL(/\/login/);
  70 |   });
  71 | 
  72 |   test('9.1 RBAC — driver cannot access /admin', async ({ page }) => {
  73 |     await loginAs(page, 'driver');
  74 |     await page.goto('/admin');
  75 |     await page.waitForTimeout(2000);
  76 |     await screenshot(page, '01-auth', '9.1-driver-admin-blocked');
  77 |     await expect(page).not.toHaveURL(/\/admin/);
  78 |   });
  79 | 
  80 |   test('9.2 RBAC — passenger cannot access /fleet', async ({ page }) => {
  81 |     await loginAs(page, 'passenger');
  82 |     await page.goto('/fleet');
  83 |     await page.waitForTimeout(2000);
  84 |     await screenshot(page, '01-auth', '9.2-passenger-fleet-blocked');
  85 |     await expect(page).not.toHaveURL(/\/fleet/);
  86 |   });
  87 | 
  88 |   test('9.3 RBAC — passenger cannot access /journeys', async ({ page }) => {
  89 |     await loginAs(page, 'passenger');
  90 |     await page.goto('/journeys');
  91 |     await page.waitForTimeout(2000);
  92 |     await screenshot(page, '01-auth', '9.3-passenger-journeys-blocked');
  93 |     await expect(page).not.toHaveURL(/\/journeys/);
  94 |   });
  95 | });
  96 | 
```