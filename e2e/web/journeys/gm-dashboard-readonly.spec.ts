/**
 * 1.7 gm-dashboard-readonly.spec.ts — GM dashboard cross-data integrity
 *
 * Persona: GM / Ops
 * Tests: KPI tiles, DB cross-check, reports, CSV export, RBAC write-block
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { ApiClient } from '../helpers/api.js';
import { rawQuery } from '../helpers/db.js';

test.describe.configure({ mode: 'serial' });

let gmToken: string;

test.beforeAll(async () => {
  const gmTokens = await getTokens('gm');
  gmToken = gmTokens.accessToken;
});

test('1.7.1 — GM KPI tiles all present', async ({ request }) => {
  // arrange
  const gmApi = new ApiClient(request, gmToken);

  // act
  const kpis = await gmApi.get<Record<string, unknown>>('/api/v1/analytics/kpis');

  // assert — all required KPI fields present (match analytics service field names)
  expect(kpis).toHaveProperty('utilizationPct');
  expect(kpis).toHaveProperty('onTimePct');
  expect(kpis).toHaveProperty('noGoRate');
  expect(kpis).toHaveProperty('activeIncidents');
  expect(kpis).toHaveProperty('avgDriverScore');
});

test('1.7.2 — KPI fleet utilization within 5% tolerance of DB', async ({ request }) => {
  // arrange
  const gmApi = new ApiClient(request, gmToken);
  const kpis = await gmApi.get<{ utilizationPct: number }>('/api/v1/analytics/kpis');

  // Direct DB calculation matching API formula: (total - available) / total
  const rows = await rawQuery<{ total: string; available: string }>(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'available') as available
     FROM vehicles`,
  );

  const total = parseInt(rows[0].total);
  const available = parseInt(rows[0].available);

  if (total === 0) return; // No vehicles in seed — skip numeric check

  const dbUtilization = ((total - available) / total) * 100;
  const diff = Math.abs(kpis.utilizationPct - dbUtilization);

  // assert — within 5%
  expect(diff).toBeLessThanOrEqual(5);
});

test('1.7.3 — By-site breakdown includes Marmul and Nimr-2', async ({ request }) => {
  // arrange
  const gmApi = new ApiClient(request, gmToken);

  // act
  const breakdown = await gmApi.get<Array<{ site: string }>>('/api/v1/analytics/sites');

  // assert
  const sites = (Array.isArray(breakdown) ? breakdown : []).map((b) => b.site);
  expect(sites.some((s) => /marmul/i.test(s))).toBe(true);
  expect(sites.some((s) => /nimr/i.test(s))).toBe(true);
});

test('1.7.4 — Generate vehicle readiness report', async ({ request }) => {
  // arrange
  const gmApi = new ApiClient(request, gmToken);

  // act — start report generation
  const report = await gmApi.post<{ id: string; status: string }>(
    '/api/v1/reports',
    { reportType: 'fleet_status' },
  );

  expect(report.id).toBeTruthy();

  // Poll until ready (max 30s)
  await expect
    .poll(
      async () => {
        const r = await gmApi.get<{ status: string; url?: string }>(
          `/api/v1/reports/${report.id}`,
        );
        return r.status;
      },
      { timeout: 30_000, intervals: [2_000] },
    )
    .toMatch(/ready|complete/);

  // Fetch completed report
  const completed = await gmApi.get<{ status: string; url?: string }>(
    `/api/v1/reports/${report.id}`,
  );
  expect(['ready', 'complete']).toContain(completed.status);
});

test('1.7.5 — CSV export has headers and ≥ 20 rows', async ({ request }) => {
  // arrange
  const gmApi = new ApiClient(request, gmToken);

  // act
  const res = await gmApi.getRaw('/api/v1/vehicles?format=csv');

  // assert
  expect(res.ok()).toBe(true);
  const csvText = await res.text();
  const lines = csvText.trim().split('\n');

  // Headers on first line
  expect(lines[0].toLowerCase()).toMatch(/plate|id|status/i);
  // At least 20 data rows
  expect(lines.length - 1).toBeGreaterThanOrEqual(20);
});

test('1.7.6 — GM cannot create journeys (403)', async ({ request }) => {
  // arrange
  const gmApi = new ApiClient(request, gmToken);

  // act
  const res = await gmApi.postRaw('/api/v1/journeys', {
    vehicleId: '12-A-3471',
    driverId: 'ali@artech.om',
    plannedDeparture: new Date().toISOString(),
    plannedArrival: new Date().toISOString(),
    purpose: 'GM write test — should fail',
  });

  // assert
  expect(res.status()).toBe(403);
});

test('1.7.7 — Top operational risks list present', async ({ request }) => {
  // arrange
  const gmApi = new ApiClient(request, gmToken);

  // act
  const risks = await gmApi.get<unknown[]>('/api/v1/analytics/operational-risks');

  // assert — endpoint responds, even if empty
  expect(Array.isArray(risks)).toBe(true);
});
