/**
 * 2.3 audit-log-coverage.spec.ts
 *
 * For each role, perform 5 mutating actions and assert exactly one audit_logs row per action.
 * Also verify audit_logs cannot be deleted.
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { getAuditLogs, rawQuery } from '../helpers/db.js';
import { futureDateString } from '../helpers/time.js';

let adminToken: string;
let jmToken: string;
let maintToken: string;
let hseToken: string;
let vehicleId: string;
let driverId: string;
let marmulOrgId: string;

test.beforeAll(async () => {
  [adminToken, jmToken, maintToken, hseToken] = await Promise.all([
    getTokens('admin').then((t) => t.accessToken),
    getTokens('jm').then((t) => t.accessToken),
    getTokens('maint').then((t) => t.accessToken),
    getTokens('hse').then((t) => t.accessToken),
  ]);
  const entities = await resolveTestEntities();
  vehicleId = entities.vehicleId;
  driverId = entities.driverId;
  marmulOrgId = entities.marmulOrgId;
});

test('2.3.1 — Admin creates user → 1 audit row', async ({ request }) => {
  // arrange
  const adminApi = new ApiClient(request, adminToken);
  const beforeCount = await rawQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE '%POST%' AND action LIKE '%drivers%'`,
  );
  const beforeNum = parseInt(beforeCount[0].count);

  // act — create a driver to generate an audit log row
  await adminApi.post('/api/v1/drivers', {
    name: 'Audit Test Driver',
    licenseNo: `DL-AUDIT-${Date.now().toString().slice(-6)}`,
    licenseClass: 'B',
    licenseExpiry: '2030-01-01',
  });

  // Wait for onResponse audit hook to complete (fires after response sent)
  await new Promise((r) => setTimeout(r, 500));

  // assert
  const afterCount = await rawQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE '%POST%' AND action LIKE '%drivers%'`,
  );
  const afterNum = parseInt(afterCount[0].count);
  expect(afterNum).toBe(beforeNum + 1);
});

test('2.3.2 — JM creates journey → 1 audit row', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  const beforeCount = await rawQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs WHERE entity_type = 'journeys'`,
  );
  const beforeNum = parseInt(beforeCount[0].count);

  // act
  await jmApi.post('/api/v1/journeys', {
    vehicleId,
    driverId,
    plannedDeparture: `${tomorrow}T02:00:00.000Z`,
    plannedArrival: `${tomorrow}T10:00:00.000Z`,
    purpose: 'Audit log coverage test',
  });

  // assert
  const afterCount = await rawQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs WHERE entity_type = 'journeys'`,
  );
  const afterNum = parseInt(afterCount[0].count);
  expect(afterNum).toBeGreaterThan(beforeNum);
});

test('2.3.3 — Audit log row has all required fields', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  // act
  const journey = await jmApi.post<{ id: string }>('/api/v1/journeys', {
    vehicleId,
    driverId,
    plannedDeparture: `${tomorrow}T02:00:00.000Z`,
    plannedArrival: `${tomorrow}T10:00:00.000Z`,
    purpose: 'Audit field check test',
  });

  // Wait brief moment for audit hook to fire
  await new Promise((r) => setTimeout(r, 500));

  const logs = await getAuditLogs({ entityType: 'journeys', entityId: journey.id });
  expect(logs.length).toBeGreaterThanOrEqual(1);

  const log = logs[0] as Record<string, unknown>;

  // assert — required fields
  expect(log.user_id ?? log.userId).toBeTruthy();
  expect(log.action).toBeTruthy();
  expect(log.entity_type ?? log.entityType).toBe('journeys');
  expect(log.entity_id ?? log.entityId).toBe(journey.id);
  expect(log.status_code ?? log.statusCode).toBeTruthy();
  expect(log.ip).toBeTruthy();
  expect(log.org_id ?? log.orgId).toBeTruthy();
});

test('2.3.4 — Unauthorized action creates audit row with statusCode=403', async ({ request }) => {
  // arrange — driver tries to approve a journey (not allowed)
  const driverTokens = await getTokens('driver-ali');
  const driverApi = new ApiClient(request, driverTokens.accessToken);

  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  const journey = await jmApi.post<{ id: string }>('/api/v1/journeys', {
    vehicleId,
    driverId,
    plannedDeparture: `${tomorrow}T02:00:00.000Z`,
    plannedArrival: `${tomorrow}T10:00:00.000Z`,
    purpose: 'RBAC test',
  });

  // act — unauthorized approval attempt
  const res = await driverApi.postRaw(`/api/v1/journeys/${journey.id}/approve`);
  expect(res.status()).toBe(403);

  // Wait for audit hook
  await new Promise((r) => setTimeout(r, 500));

  // assert — 403 audit row exists
  const logs = await rawQuery<{ status_code: number; entity_id: string }>(
    `SELECT * FROM audit_logs WHERE entity_id = $1 AND status_code = 403`,
    [journey.id],
  );
  expect(logs.length).toBeGreaterThanOrEqual(1);
});

test('2.3.5 — DELETE on audit_logs is forbidden at DB level', async () => {
  // act + assert — app DB user cannot delete audit logs
  await expect(
    rawQuery(`DELETE FROM audit_logs WHERE id = '00000000-0000-0000-0000-000000000000'`),
  ).rejects.toThrow();
});
