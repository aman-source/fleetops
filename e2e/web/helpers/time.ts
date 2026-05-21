import { request } from '@playwright/test';

/** Build an ISO date string in Oman timezone (UTC+4). */
export function omanTime(yyyy_mm_dd: string, hh_mm: string): Date {
  const [year, month, day] = yyyy_mm_dd.split('-').map(Number);
  const [hour, minute] = hh_mm.split(':').map(Number);
  // Oman is UTC+4 — subtract 4 hours for UTC equivalent
  return new Date(Date.UTC(year, month - 1, day, hour - 4, minute));
}

/**
 * Advance the BullMQ "fake timer" clock by requesting the test helper endpoint.
 * The app-test container must expose POST /api/v1/test/advance-clock (test-only route).
 */
export async function advanceBullMqClock(
  baseURL: string,
  token: string,
  seconds: number,
): Promise<void> {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/api/v1/test/advance-clock', {
    headers: { Authorization: `Bearer ${token}` },
    data: { seconds },
  });
  if (!res.ok()) {
    throw new Error(`advanceBullMqClock failed: ${res.status()} ${await res.text()}`);
  }
  await ctx.dispose();
}

/** Return a date string YYYY-MM-DD for N days from now. */
export function futureDateString(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
