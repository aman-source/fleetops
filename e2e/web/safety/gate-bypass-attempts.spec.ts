/**
 * 2.1 gate-bypass-attempts.spec.ts
 *
 * For each gate, attempt direct API bypass while conditions should BLOCK.
 * Tests that server-side gate validation cannot be bypassed.
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { rawQuery } from '../helpers/db.js';

import { futureDateString } from '../helpers/time.js';

let jmToken: string;
let adminToken: string;
let vehicleId: string;
let driverId: string;

test.beforeAll(async () => {
  const jmTokens = await getTokens('jm');
  jmToken = jmTokens.accessToken;
  const adminTokens = await getTokens('admin');
  adminToken = adminTokens.accessToken;
  const entities = await resolveTestEntities();
  vehicleId = entities.vehicleId;
  driverId = entities.driverId;

  // Reset shared vehicle to available before gate bypass tests
  await rawQuery(
    `UPDATE journeys SET status = 'cancelled', updated_at = NOW()
     WHERE vehicle_id = $1 AND status IN ('draft', 'pending_approval', 'approved')`,
    [vehicleId],
  ).catch(() => null);
  await rawQuery(
    `UPDATE journeys SET status = 'closed', closed_at = NOW(), updated_at = NOW()
     WHERE vehicle_id = $1 AND status = 'active'`,
    [vehicleId],
  ).catch(() => null);
  await rawQuery(
    `UPDATE vehicles SET status = 'available', updated_at = NOW()
     WHERE id = $1 AND status NOT IN ('available', 'conditional', 'under_maintenance', 'decommissioned')`,
    [vehicleId],
  ).catch(() => null);
});

// ── Gate 1: Driver Authorization ──────────────────────────────────────────────

test('2.1.1 — Gate 1 bypass: expired driver license → submit blocked', async ({ request }) => {
  // arrange — create a driver with expired license via admin API
  const adminApi = new ApiClient(request, adminToken);
  const jmApi = new ApiClient(request, jmToken);

  // Create driver with expired license
  const driver = await adminApi.post<{ id: string }>(
    '/api/v1/drivers',
    {
      name: 'Expired Driver Test',
      licenseNo: `DL-EXP-${Date.now().toString().slice(-6)}`,
      licenseClass: 'B',
      licenseExpiry: '2020-01-01', // Expired
    },
  );

  const tomorrow = futureDateString(1);
  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId,
      driverId: driver.id,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Gate 1 bypass test',
    },
  );

  // act — try to submit directly
  const submitRes = await jmApi.postRaw(`/api/v1/journeys/${journey.id}/submit`);

  // assert
  expect(submitRes.status()).toBe(422);
  const body = await submitRes.json();
  const code = body.code ?? body.error?.code ?? '';
  expect(String(code).toUpperCase()).toMatch(/GATE_FAILURE/);

  // Verify gate 1 specifically blocked
  const gates = await jmApi.get<{
    gates: Array<{ gateNumber: number; status: string; checks: Array<{ name: string; status: string; message: string }> }>;
  }>(`/api/v1/journeys/${journey.id}/gates`);

  const gate1 = gates.gates.find((g) => g.gateNumber === 1);
  expect(gate1?.status).toBe('BLOCK');
  const licenseBlock = gate1?.checks.find(
    (c) => c.status === 'BLOCK' && /license/i.test(c.message),
  );
  expect(licenseBlock).toBeTruthy();
});

// ── Gate 2: Vehicle Readiness ─────────────────────────────────────────────────

test('2.1.2 — Gate 2 bypass: no_go vehicle → submit blocked', async ({ request }) => {
  // arrange — set a vehicle to no_go
  const adminApi = new ApiClient(request, adminToken);
  const jmApi = new ApiClient(request, jmToken);

  // Create an available vehicle (must be available to allow journey creation)
  const vehicle = await adminApi.post<{ id: string; plateNo: string }>(
    '/api/v1/vehicles',
    {
      plateNo: `99-Z-${Date.now().toString().slice(-4)}`,
      type: 'light',
      make: 'Toyota',
      model: 'Hilux',
      year: 2020,
      seatCount: 5,
    },
  );

  const tomorrow = futureDateString(1);
  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId: vehicle.id,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Gate 2 bypass test',
    },
  );

  // Simulate vehicle going no_go after journey creation
  await rawQuery(`UPDATE vehicles SET status = 'no_go', updated_at = NOW() WHERE id = $1`, [vehicle.id]);

  // act
  const submitRes = await jmApi.postRaw(`/api/v1/journeys/${journey.id}/submit`);

  // assert
  expect(submitRes.status()).toBe(422);
  const gates = await jmApi.get<{
    gates: Array<{ gateNumber: number; status: string }>;
  }>(`/api/v1/journeys/${journey.id}/gates`);
  const gate2 = gates.gates.find((g) => g.gateNumber === 2);
  expect(gate2?.status).toBe('BLOCK');
});

// ── Gate 3: Documents ─────────────────────────────────────────────────────────

test('2.1.3 — Gate 3 bypass: expired Mulkia → submit blocked', async ({ request }) => {
  // arrange — expire a document for a vehicle
  const adminApi = new ApiClient(request, adminToken);
  const jmApi = new ApiClient(request, jmToken);

  // Create vehicle — must create journey BEFORE attaching expired doc
  // (expired doc triggers vehicle status flip to 'expired_documents' which blocks journey creation)
  const vehicle = await adminApi.post<{ id: string; plateNo: string }>(
    '/api/v1/vehicles',
    {
      plateNo: `88-Y-${Date.now().toString().slice(-4)}`,
      type: 'light',
      make: 'Nissan',
      model: 'Patrol',
      year: 2021,
      seatCount: 5,
    },
  );

  const tomorrow = futureDateString(1);
  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId: vehicle.id,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Gate 3 bypass test',
    },
  );

  // Attach expired Mulkia AFTER journey creation (triggers vehicle status flip)
  await adminApi.post('/api/v1/documents', {
    entityType: 'vehicle',
    entityId: vehicle.id,
    documentType: 'mulkia',
    referenceNo: `MULKIA-EXP-${Date.now().toString().slice(-6)}`,
    expiryDate: '2020-01-01', // Expired
    blocksOnExpiry: true,
  });

  // act
  const submitRes = await jmApi.postRaw(`/api/v1/journeys/${journey.id}/submit`);

  // assert
  expect(submitRes.status()).toBe(422);
  const gates = await jmApi.get<{
    gates: Array<{ gateNumber: number; status: string }>;
  }>(`/api/v1/journeys/${journey.id}/gates`);
  const gate3 = gates.gates.find((g) => g.gateNumber === 3);
  expect(gate3?.status).toBe('BLOCK');
});

// ── Gate 5: Headcount ─────────────────────────────────────────────────────────

test('2.1.4 — Gate 5 bypass: 8 passengers on 5-seat vehicle → blocked', async ({ request }) => {
  // arrange
  const adminApi = new ApiClient(request, adminToken);
  const jmApi = new ApiClient(request, jmToken);

  // Create a 5-seat vehicle
  const vehicle = await adminApi.post<{ id: string; plateNo: string }>(
    '/api/v1/vehicles',
    {
      plateNo: `77-X-${Date.now().toString().slice(-4)}`,
      type: 'light',
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      seatCount: 5,
    },
  );

  const tomorrow = futureDateString(1);
  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId: vehicle.id,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Gate 5 bypass test',
    },
  );

  // Gate 5 checks journey_passengers table — insert 8 passengers to exceed 5-seat capacity
  await rawQuery(
    `INSERT INTO journey_passengers (id, journey_id, passenger_name) SELECT gen_random_uuid(), $1, 'Passenger ' || gs FROM generate_series(1, 8) gs`,
    [journey.id],
  );

  // act
  const submitRes = await jmApi.postRaw(`/api/v1/journeys/${journey.id}/submit`);

  // assert
  expect(submitRes.status()).toBe(422);
  const gates = await jmApi.get<{
    gates: Array<{ gateNumber: number; status: string }>;
  }>(`/api/v1/journeys/${journey.id}/gates`);
  const gate5 = gates.gates.find((g) => g.gateNumber === 5);
  expect(gate5?.status).toBe('BLOCK');
});

// ── All-clean baseline ────────────────────────────────────────────────────────

test('2.1.5 — All-clean baseline: valid journey submits successfully', async ({ request }) => {
  // arrange — use known-good seed vehicles and driver
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Baseline clean test',
      passengerCount: 1,
    },
  );

  // act
  const submitRes = await jmApi.postRaw(`/api/v1/journeys/${journey.id}/submit`);

  // assert — should succeed or be pending_approval
  expect([200, 201]).toContain(submitRes.status());
});
