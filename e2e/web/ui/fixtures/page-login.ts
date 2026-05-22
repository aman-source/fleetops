import type { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const API_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const CREDS = {
  admin:     { email: 'admin@artech.om',   password: 'Fleetops@2026' },
  jm:        { email: 'jm@artech.om',      password: 'Fleetops@2026' },
  hse:       { email: 'hse@artech.om',     password: 'Fleetops@2026' },
  maint:     { email: 'maint@artech.om',   password: 'Fleetops@2026' },
  driver:    { email: 'driver1@artech.om', password: 'Fleetops@2026' },
  passenger: { email: 'pax@artech.om',     password: 'Fleetops@2026' },
} as const;

export type Role = keyof typeof CREDS;

/**
 * Login via UI form — use only in 01-auth.spec.ts to test the actual login flow.
 * All other tests should use loginAs() which sets tokens directly.
 */
export async function loginViaForm(page: Page, role: Role): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('auth-email-input').fill(CREDS[role].email);
  await page.getByTestId('auth-password-input').fill(CREDS[role].password);
  await page.getByTestId('auth-submit-button').click();
  await page.waitForURL(/\/(map|journeys|hse|maintenance|passenger|fleet|analytics|admin)/, { timeout: 15_000 });
}

/**
 * Login by injecting tokens directly via API call + localStorage injection.
 * Does NOT click through the login form — use for all non-auth spec files.
 * Avoids consuming the login rate limit quota.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  // Make API call from Node.js context (not browser) to get tokens
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CREDS[role].email, password: CREDS[role].password }),
  });

  if (!res.ok) {
    throw new Error(`loginAs(${role}) API call failed: ${res.status} ${await res.text()}`);
  }

  const body = await res.json() as { data: { tokens: { accessToken: string; refreshToken: string } } };
  const { accessToken, refreshToken } = body.data.tokens;

  // Navigate to login page first so localStorage is on the right origin
  await page.goto('/login');

  // Inject tokens into localStorage and trigger auth store reload
  await page.evaluate(({ at, rt }) => {
    localStorage.setItem('accessToken', at);
    localStorage.setItem('refreshToken', rt);
  }, { at: accessToken, rt: refreshToken });

  // Navigate to role's home page — avoids /map API calls that some roles can't access
  const roleHome: Record<string, string> = {
    passenger: '/passenger',
    hse: '/hse',
    maint: '/maintenance',
    driver: '/journeys',
    jm: '/journeys',
    admin: '/map',
  };
  const dest = roleHome[role] ?? '/map';
  await page.goto(dest);
  await page.waitForURL(new RegExp(dest.replace(/\//g, '\\/')), { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

export async function screenshot(page: Page, spec: string, step: string): Promise<void> {
  const dir = path.join(process.cwd(), 'e2e', 'web', 'screenshots', spec);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${step}.png`), fullPage: true });
}
