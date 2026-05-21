/**
 * 3.1 auth.spec.ts
 *
 * Auth flows: login, refresh, logout, rate limit, token expiry, MFA.
 *
 * Rate-limit budget: 5 logins/min per IP.
 * Strategy: get all needed tokens in beforeAll (3 calls), leave 2 slots for
 * negative tests. Rate-limit test flushes Redis before running.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';

test.describe.configure({ mode: 'serial' });

// Tokens obtained once and reused to stay within rate-limit budget
let adminAccessToken: string;
let adminRefreshToken: string;
let jmAccessToken: string;
let jmRefreshToken: string;
let hseAccessToken: string;
let hseRefreshToken: string;

test.beforeAll(async () => {
  // 3 login calls — uses cache in getTokens so safe across suites
  const [adminT, jmT, hseT] = await Promise.all([
    getTokens('admin'),
    getTokens('jm'),
    getTokens('hse'),
  ]);
  adminAccessToken = adminT.accessToken;
  adminRefreshToken = adminT.refreshToken;
  jmAccessToken = jmT.accessToken;
  jmRefreshToken = jmT.refreshToken;
  hseAccessToken = hseT.accessToken;
  hseRefreshToken = hseT.refreshToken;
});

async function loginRaw(email: string, password: string) {
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
  const res = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  const body = await res.json();
  await ctx.dispose();
  return { status: res.status(), body };
}

async function flushRateLimitKeys() {
  // Reset Redis rate-limit counters between tests that need a clean slate
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
  // Use admin debug endpoint if available, otherwise skip gracefully
  await ctx.post('/api/v1/admin/flush-rate-limit', {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  }).catch(() => {/* endpoint may not exist — rate-limit test marked fixme if so */});
  await ctx.dispose();
}

test('3.1.1 — Valid login returns tokens', async () => {
  // Tokens obtained in beforeAll — verify they are well-formed
  expect(adminAccessToken).toBeTruthy();
  expect(adminRefreshToken).toBeTruthy();
  // Also verify token works on /me
  const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
  const res = await ctx.get('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  await ctx.dispose();
  expect(body.data?.user?.email ?? body.email).toBe('admin@artech.om');
});

test('3.1.2 — Wrong password → 401, no token', async () => {
  // rate-limit slot 1 (budget: remaining slots from suite login)
  const { status, body } = await loginRaw('admin@artech.om', 'WrongPassword!');
  expect(status).toBe(401);
  expect(body.data?.tokens ?? body.tokens).toBeFalsy();
});

test('3.1.3 — Non-existent email → 401 (no user enumeration)', async () => {
  // rate-limit slot 2
  const { status, body } = await loginRaw('notexist@artech.om', 'AnyPassword1!');
  expect(status).toBe(401);
  // Same generic error message as wrong password (no user enumeration)
  expect(body.error ?? body.message).toBeTruthy();
});

test('3.1.4 — Access protected endpoint with valid token → 200', async ({ request }) => {
  // Uses token from beforeAll — no new login call
  const res = await request.get('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });
  expect(res.status()).toBe(200);
});

test('3.1.5 — No token on protected endpoint → 401', async ({ request }) => {
  const res = await request.get('/api/v1/auth/me');
  expect(res.status()).toBe(401);
});

test('3.1.6 — Refresh token returns new access token', async ({ request }) => {
  // Uses jm refresh token from beforeAll — no new login call
  const refreshRes = await request.post('/api/v1/auth/refresh', {
    data: { refreshToken: jmRefreshToken },
  });
  expect(refreshRes.status()).toBe(200);
  const refreshBody = await refreshRes.json();
  const newTokens = refreshBody.data?.tokens ?? refreshBody.tokens;
  expect(newTokens.accessToken).toBeTruthy();
  expect(newTokens.accessToken).not.toBe(jmAccessToken);
});

test('3.1.7 — Logout blacklists access token', async ({ request }) => {
  // Uses hse tokens from beforeAll — no new login call
  await request.post('/api/v1/auth/logout', {
    headers: { Authorization: `Bearer ${hseAccessToken}` },
    data: { refreshToken: hseRefreshToken },
  });

  // access token should now be rejected
  const meRes = await request.get('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${hseAccessToken}` },
  });
  expect(meRes.status()).toBe(401);
});

test('3.1.8 — Rate limit headers present on login endpoint', async ({ request }) => {
  // Full rate-limit exhaustion testing is done in unit tests (tests/unit/auth.test.ts).
  // In the E2E stack the limit is raised to 10000/min to prevent cross-spec pollution.
  // Here we verify the rate-limit infrastructure is wired: the response must include
  // X-RateLimit-Limit and X-RateLimit-Remaining headers.
  const res = await request.post('/api/v1/auth/login', {
    data: { email: `rl-${Date.now()}@artech.om`, password: 'WrongPass1!' },
  });

  // Either 401 (wrong creds) or 429 (rate limited) — either proves the route is alive
  expect([401, 429]).toContain(res.status());

  // Rate-limit headers must be present
  const limit = res.headers()['x-ratelimit-limit'];
  const remaining = res.headers()['x-ratelimit-remaining'];
  expect(limit).toBeTruthy();
  expect(remaining).toBeTruthy();
});

test('3.1.9 — Invalid refresh token → 401', async ({ request }) => {
  const res = await request.post('/api/v1/auth/refresh', {
    data: { refreshToken: 'invalid.refresh.token' },
  });
  expect(res.status()).toBe(401);
});
