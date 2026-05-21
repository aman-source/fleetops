/**
 * 1.3 maintenance-release.spec.ts — Work order to Conditional Release with auto-revert
 *
 * Personas: Maintenance Lead → HSE → System (BullMQ worker)
 * Tests: Conditional release → 30s expiry → auto-revert to no_go → gate blocks
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { getVehicleStatus, getWorkOrders, getAuditLogs } from '../helpers/db.js';
import { futureDateString } from '../helpers/time.js';

test.describe.configure({ mode: 'serial' });

let adminToken: string;
let maintToken: string;
let hseToken: string;
let jmToken: string;
let workOrderId: string;
let vehicleId: string;
let driverId: string;

test.afterAll(async ({ request }) => {
  // Restore vehicle to available so subsequent specs can use it
  const adminApi = new ApiClient(request, adminToken);
  await adminApi.patch(`/api/v1/vehicles/${vehicleId}/status`, {
    status: 'available',
    reason: 'Test cleanup after maintenance-release spec',
  }).catch(() => { /* ignore if already available */ });
});

test.beforeAll(async ({ request }) => {
  adminToken = (await getTokens('admin')).accessToken;
  const maintTokens = await getTokens('maint');
  maintToken = maintTokens.accessToken;
  const hseTokens = await getTokens('hse');
  hseToken = hseTokens.accessToken;
  const jmTokens = await getTokens('jm');
  jmToken = jmTokens.accessToken;

  // Resolve vehicle and driver UUIDs
  const entities = await resolveTestEntities();
  vehicleId = entities.vehicleId;
  driverId = entities.driverId;

  // Put vehicle into under_maintenance status via maintenance API
  const maintApi = new ApiClient(request, maintToken);
  const wo = await maintApi.post<{ id: string; status: string }>(
    '/api/v1/work-orders',
    {
      vehicleId,
      title: 'Conditional release test — tire defect',
      priority: 'high',
      issueType: 'corrective',
    },
  );
  workOrderId = wo.id;
});

test('1.3.1 — Open WO is in inbound status', async ({ request }) => {
  // arrange
  const maintApi = new ApiClient(request, maintToken);

  // act
  const wo = await maintApi.get<{ id: string; status: string }>(`/api/v1/work-orders/${workOrderId}`);

  // assert
  expect(['inbound', 'in_bay']).toContain(wo.status);
});

test('1.3.2 — Move WO to in_bay', async ({ request }) => {
  // arrange
  const maintApi = new ApiClient(request, maintToken);

  // act
  const updated = await maintApi.patch<{ status: string }>(
    `/api/v1/work-orders/${workOrderId}`,
    { status: 'in_bay' },
  );

  // assert
  expect(updated.status).toBe('in_bay');
});

test('1.3.3 — Move WO to hse_review for HSE co-sign', async ({ request }) => {
  // arrange
  const maintApi = new ApiClient(request, maintToken);

  // act
  const updated = await maintApi.patch<{ status: string }>(
    `/api/v1/work-orders/${workOrderId}`,
    { status: 'hse_review' },
  );

  // assert
  expect(updated.status).toBe('hse_review');
});

test('1.3.4 — HSE approves co-sign', async ({ request }) => {
  // arrange
  const hseApi = new ApiClient(request, hseToken);

  // act
  const res = await hseApi.post<{ status: string }>(
    `/api/v1/work-orders/${workOrderId}/hse-approve`,
  );

  // assert — hseApprove transitions WO to 'ready'
  expect(['ready', 'hse_approved']).toContain(res.status);
});

test('1.3.5 — Maintenance releases as CONDITIONAL with 30s expiry', async ({ request }) => {
  // arrange
  const maintApi = new ApiClient(request, maintToken);
  const expiryDate = new Date(Date.now() + 30_000).toISOString();

  // act
  const res = await maintApi.post<{ releaseDecision: string; releaseExpiry: string }>(
    `/api/v1/work-orders/${workOrderId}/release`,
    {
      decision: 'conditional',
      releaseExpiry: expiryDate,
      reason: 'E2E test: 30s conditional release — tires within tolerance',
    },
  );

  // assert
  expect(res.releaseDecision).toBe('conditional');
  expect(res.releaseExpiry).toBeTruthy();

  const vehicleStatus = await getVehicleStatus(vehicleId);
  expect(vehicleStatus).toBe('conditional');
});

test('1.3.6 — Journey gate 2 PASS while vehicle is conditional', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  // Create a draft journey using resolved UUIDs
  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Test conditional vehicle',
    },
  );

  // act — evaluate gates
  const gates = await jmApi.get<{
    canSubmit: boolean;
    gates: Array<{ gateNumber: number; status: string }>;
  }>(`/api/v1/journeys/${journey.id}/gates`);

  // assert — gate 2 should PASS (conditional ≠ blocked)
  const gate2 = gates.gates.find((g) => g.gateNumber === 2);
  expect(gate2).toBeTruthy();
  expect(gate2!.status).not.toBe('BLOCK');
});

test('1.3.7 — After 35s, vehicle auto-reverts to no_go', async () => {
  test.setTimeout(45_000);
  // Wait 35 seconds for BullMQ conditional revert job to fire
  await new Promise((r) => setTimeout(r, 35_000));

  // act
  const vehicleStatus = await getVehicleStatus(vehicleId);

  // assert
  expect(vehicleStatus).toBe('no_go');
});

test('1.3.8 — Journey creation blocked after auto-revert (vehicle no_go)', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  // act — vehicle is no_go, journey creation itself is blocked
  const createRes = await jmApi.postRaw('/api/v1/journeys', {
    vehicleId,
    driverId,
    plannedDeparture: `${tomorrow}T02:00:00.000Z`,
    plannedArrival: `${tomorrow}T10:00:00.000Z`,
    purpose: 'Test no_go vehicle',
  });

  // assert — 409 Conflict (vehicle not available/conditional)
  expect([409, 422]).toContain(createRes.status());
});

test('1.3.9 — Audit log has release and hse events', async () => {
  // act
  const logs = await getAuditLogs({ entityType: 'work-orders', entityId: workOrderId });

  // assert
  const actions = logs.map((l) => (l as { action: string }).action);
  expect(actions.some((a) => /release/i.test(a))).toBe(true);
  expect(actions.some((a) => /hse/i.test(a))).toBe(true);
});
