/**
 * Role-based login fixtures for E2E tests.
 * Provides typed helpers to log in as specific personas.
 */
import { test as base, request, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';

export type TestRole =
  | 'admin'
  | 'jm'
  | 'jm-nimr'
  | 'hse'
  | 'gm'
  | 'maint'
  | 'stores'
  | 'driver-ali'
  | 'driver-khalid'
  | 'driver-hassan'
  | 'passenger-amal'
  | 'passenger-zaid'
  | 'clerk';

const CREDENTIALS: Record<TestRole, { email: string; password: string }> = {
  admin: { email: 'admin@artech.om', password: 'Fleetops@2026' },
  jm: { email: 'jm@artech.om', password: 'Fleetops@2026' },
  'jm-nimr': { email: 'jm@artech.om', password: 'Fleetops@2026' }, // same user, tests scoped by org
  hse: { email: 'hse@artech.om', password: 'Fleetops@2026' },
  gm: { email: 'gm@artech.om', password: 'Fleetops@2026' },
  maint: { email: 'maint@artech.om', password: 'Fleetops@2026' },
  stores: { email: 'store@artech.om', password: 'Fleetops@2026' },
  'driver-ali': { email: 'driver1@artech.om', password: 'Fleetops@2026' },
  'driver-khalid': { email: 'driver2@artech.om', password: 'Fleetops@2026' },
  'driver-hassan': { email: 'driver2@artech.om', password: 'Fleetops@2026' },
  'passenger-amal': { email: 'pax@artech.om', password: 'Fleetops@2026' },
  'passenger-zaid': { email: 'pax@artech.om', password: 'Fleetops@2026' }, // no entitlement test via diff payload
  clerk: { email: 'store@artech.om', password: 'Fleetops@2026' },
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Obtain JWT tokens for a role directly via API (no browser). */
export async function getTokens(role: TestRole): Promise<AuthTokens> {
  const creds = CREDENTIALS[role];
  const ctx = await request.newContext({ baseURL: BASE_URL });

  const res = await ctx.post('/api/v1/auth/login', { data: creds });

  if (!res.ok()) {
    const text = await res.text();
    await ctx.dispose();
    throw new Error(`Login as ${role} (${creds.email}) failed: ${res.status()} ${text}`);
  }

  const body = await res.json();
  await ctx.dispose();
  const tokens = body.data?.tokens ?? body.tokens;

  if (!tokens?.accessToken) {
    throw new Error(`Login response missing tokens for ${role}: ${JSON.stringify(body)}`);
  }

  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

/** Create an API request context authenticated as the given role. */
export async function apiAs(role: TestRole): Promise<APIRequestContext> {
  const { accessToken } = await getTokens(role);
  return request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

export interface AuthFixtures {
  /** Returns access token for role. */
  tokenFor: (role: TestRole) => Promise<string>;
  /** Returns full tokens for role. */
  tokensFor: (role: TestRole) => Promise<AuthTokens>;
  /** Returns APIRequestContext authenticated as role. */
  apiAs: (role: TestRole) => Promise<APIRequestContext>;
}

/** Extended Playwright test with auth fixtures. */
export const test = base.extend<AuthFixtures>({
  tokenFor: async ({}, use) => {
    const cache = new Map<TestRole, string>();
    await use(async (role: TestRole) => {
      if (!cache.has(role)) {
        const { accessToken } = await getTokens(role);
        cache.set(role, accessToken);
      }
      return cache.get(role)!;
    });
  },

  tokensFor: async ({}, use) => {
    const cache = new Map<TestRole, AuthTokens>();
    await use(async (role: TestRole) => {
      if (!cache.has(role)) {
        cache.set(role, await getTokens(role));
      }
      return cache.get(role)!;
    });
  },

  apiAs: async ({}, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async (role: TestRole) => {
      const ctx = await apiAs(role);
      contexts.push(ctx);
      return ctx;
    });
    for (const ctx of contexts) await ctx.dispose();
  },
});

export { expect } from '@playwright/test';
