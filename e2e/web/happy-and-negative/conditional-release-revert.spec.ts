/**
 * 3.3 conditional-release-revert.spec.ts
 *
 * Unit-of-functionality version of 1.3 — faster, smaller scope for CI.
 * Tests ONLY the conditional → auto-revert flow (no full maintenance workflow).
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { getVehicleStatus } from '../helpers/db.js';
import { futureDateString } from '../helpers/time.js';

test.describe.configure({ mode: 'serial' });

let maintToken: string;
let hseToken: string;
let jmToken: string;
let workOrderId: string;
let vehicleId: string;
let vehiclePlate: string;
let driverId: string;

test.beforeAll(async ({ request }) => {
  maintToken = (await getTokens('maint')).accessToken;
  hseToken = (await getTokens('hse')).accessToken;
  jmToken = (await getTokens('jm')).accessToken;

  const entities = await resolveTestEntities();
  driverId = entities.driverId;

  // Create vehicle for this test
  const adminToken = (await getTokens('admin')).accessToken;
  const adminApi = new ApiClient(request, adminToken);

  const suffix = Date.now().toString().slice(-4);
  vehiclePlate = `4-C-${suffix}`;
  const vehicle = await adminApi.post<{ id: string; plateNo: string }>(
    '/api/v1/vehicles',
    {
      plateNo: vehiclePlate,
      type: 'light',
      make: 'Toyota',
      model: 'Hilux',
      year: 2022,
      seatCount: 5,
    },
  );
  vehicleId = vehicle.id;

  // Create work order for the vehicle
  const maintApi = new ApiClient(request, maintToken);
  const wo = await maintApi.post<{ id: string }>(
    '/api/v1/work-orders',
    {
      vehicleId,
      title: 'Conditional revert unit test',
      priority: 'medium',
      issueType: 'corrective',
    },
  );
  workOrderId = wo.id;

  // Move to hse_review
  await maintApi.patch(`/api/v1/work-orders/${workOrderId}`, { status: 'in_bay' });
  await maintApi.patch(`/api/v1/work-orders/${workOrderId}`, { status: 'hse_review' });

  // HSE co-sign
  const hseApi = new ApiClient(request, hseToken);
  await hseApi.post(`/api/v1/work-orders/${workOrderId}/hse-approve`);
});

test('3.3.1 — Conditional release sets vehicle to conditional', async ({ request }) => {
  // arrange
  const maintApi = new ApiClient(request, maintToken);
  const expiryDate = new Date(Date.now() + 10_000).toISOString(); // 10s from now

  // act
  await maintApi.post(`/api/v1/work-orders/${workOrderId}/release`, {
    decision: 'conditional',
    releaseExpiry: expiryDate,
    notes: 'Fast expiry for unit test',
    reason: 'Conditional approval — tires within tolerance, re-check in 10s',
  });

  // assert
  const status = await getVehicleStatus(vehicleId);
  expect(status).toBe('conditional');
});

test('3.3.2 — After 12s, vehicle auto-reverts to no_go', async () => {
  test.setTimeout(20_000);
  await new Promise((r) => setTimeout(r, 12_000));

  const status = await getVehicleStatus(vehicleId);
  expect(status).toBe('no_go');
});

test('3.3.3 — Journey blocked after revert', async ({ request }) => {
  // After conditional expiry, vehicle reverts to no_go.
  // Journey creation is blocked at the service layer (vehicle not available/conditional).
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  // act — attempt to create journey on a no_go vehicle
  const createRes = await jmApi.postRaw('/api/v1/journeys', {
    vehicleId,
    driverId,
    plannedDeparture: `${tomorrow}T02:00:00.000Z`,
    plannedArrival: `${tomorrow}T10:00:00.000Z`,
    purpose: 'Conditional revert unit test',
  });

  // assert — must be rejected (409 Conflict or 422 Unprocessable)
  expect([409, 422]).toContain(createRes.status());
});
