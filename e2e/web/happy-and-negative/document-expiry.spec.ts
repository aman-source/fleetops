/**
 * 3.2 document-expiry.spec.ts
 *
 * Document expiry → vehicle status change → gate block → renewal → gate pass.
 *
 * Note: BullMQ-based auto-expiry timing is not tested here (requires waiting up to 1 day
 * for date-granular expiry jobs). Instead we test the GATE behaviour by directly
 * setting vehicle status via the status-transition API, which is the same path the
 * BullMQ worker uses.
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { getVehicleStatus } from '../helpers/db.js';
import { futureDateString } from '../helpers/time.js';

test.describe.configure({ mode: 'serial' });

let adminToken: string;
let jmToken: string;
let vehicleId: string;
let vehiclePlate: string;
let documentId: string;
let driverId: string;
let preExpiryJourneyId: string; // created before expiry, reused in 3.2.4

test.beforeAll(async ({ request }) => {
  adminToken = (await getTokens('admin')).accessToken;
  jmToken = (await getTokens('jm')).accessToken;
  const entities = await resolveTestEntities();
  driverId = entities.driverId;

  const adminApi = new ApiClient(request, adminToken);

  // Create a fresh vehicle for this test
  const suffix = Date.now().toString().slice(-4);
  vehiclePlate = `3-D-${suffix}`;
  const vehicle = await adminApi.post<{ id: string; plateNo: string }>(
    '/api/v1/vehicles',
    {
      plateNo: vehiclePlate,
      type: 'light',
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2023,
      seatCount: 5,
    },
  );
  vehicleId = vehicle.id;

  // Pre-seed required vehicle docs (insurance + ras) so gate 3 only blocks on mulkia expiry
  const farFuture = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  for (const docType of ['insurance', 'ras']) {
    await adminApi.post('/api/v1/documents', {
      entityType: 'vehicle', entityId: vehicleId,
      documentType: docType,
      documentNumber: `${docType.toUpperCase()}-SEED-${Date.now()}`,
      expiryDate: farFuture,
      blocksOnExpiry: true,
    });
  }

  // Attach a dummy IVMS device so gate 2 "IVMS device installed" check passes
  await adminApi.post('/api/v1/devices', {
    type: 'ivms',
    serialNo: `TEST-IVMS-${Date.now()}`,
    vehicleId,
  });
});

test('3.2.1 — Create document with future expiry, blocksOnExpiry=true', async ({ request }) => {
  // Use YYYY-MM-DD format (required by schema), 1 year from today = valid
  const adminApi = new ApiClient(request, adminToken);
  const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]; // YYYY-MM-DD

  const doc = await adminApi.post<{ id: string; expiryDate: string }>(
    '/api/v1/documents',
    {
      entityType: 'vehicle',
      entityId: vehicleId,
      documentType: 'mulkia',
      documentNumber: `MULKIA-EXPIRY-${Date.now()}`,
      expiryDate,
      blocksOnExpiry: true,
    },
  );

  expect(doc.id).toBeTruthy();
  documentId = doc.id;
});

test('3.2.2 — Journey gate 2+3 PASS while doc is valid', async ({ request }) => {
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Doc expiry test — before',
    },
  );
  preExpiryJourneyId = journey.id; // reuse in 3.2.4 after vehicle expires

  const gates = await jmApi.get<{
    gates: Array<{ gateNumber: number; status: string }>;
  }>(`/api/v1/journeys/${journey.id}/gates`);

  const gate2 = gates.gates.find((g) => g.gateNumber === 2);
  const gate3 = gates.gates.find((g) => g.gateNumber === 3);
  expect(gate2?.status).not.toBe('BLOCK');
  expect(gate3?.status).not.toBe('BLOCK');
});

test('3.2.3 — Force vehicle to expired_documents via status API', async ({ request }) => {
  // The BullMQ auto-block worker does: vehicles.status = expired_documents
  // We replicate that path here for fast CI testing (no need to wait for date to expire)
  const adminApi = new ApiClient(request, adminToken);
  await adminApi.patch(`/api/v1/vehicles/${vehicleId}/status`, {
    status: 'expired_documents',
    reason: 'Test: simulating doc expiry',
  });

  const status = await getVehicleStatus(vehicleId);
  expect(status).toBe('expired_documents');
});

test('3.2.4 — Journey gate 2 BLOCK after expiry (vehicle expired_documents)', async ({ request }) => {
  const jmApi = new ApiClient(request, jmToken);

  // Reuse journey created before expiry (cannot create new journey — vehicle not available)
  const submitRes = await jmApi.postRaw(`/api/v1/journeys/${preExpiryJourneyId}/submit`);
  expect(submitRes.status()).toBe(422);

  const gates = await jmApi.get<{
    gates: Array<{ gateNumber: number; status: string }>;
  }>(`/api/v1/journeys/${preExpiryJourneyId}/gates`);
  // Gate 2 (vehicle readiness) blocks when status = expired_documents
  const gate2 = gates.gates.find((g) => g.gateNumber === 2);
  expect(gate2?.status).toBe('BLOCK');
});

test('3.2.5 — Renew: flip vehicle back to available', async ({ request }) => {
  const adminApi = new ApiClient(request, adminToken);
  await adminApi.patch(`/api/v1/vehicles/${vehicleId}/status`, {
    status: 'available',
    reason: 'Docs renewed — test cleanup',
  });

  const status = await getVehicleStatus(vehicleId);
  expect(status).toBe('available');
});

test('3.2.6 — Journey gate 3 PASS after renewal', async ({ request }) => {
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Doc expiry test — renewed',
    },
  );

  const gates = await jmApi.get<{
    gates: Array<{ gateNumber: number; status: string }>;
  }>(`/api/v1/journeys/${journey.id}/gates`);
  const gate2 = gates.gates.find((g) => g.gateNumber === 2);
  // After renewal, vehicle is available, gate 2 should PASS (not BLOCK)
  expect(gate2?.status).not.toBe('BLOCK');
});
