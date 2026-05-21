/**
 * 2.5 multi-tenant-isolation.spec.ts
 *
 * Verify Marmul data is completely invisible to Nimr-2 JM.
 * Tests: list isolation, direct read isolation (404 not 403), write isolation.
 */
import { test, expect } from '@playwright/test';
import { apiAs } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { futureDateString } from '../helpers/time.js';

// FIXME: jm-nimr maps to same credentials as jm (jm@artech.om, Marmul Ops).
// No separate Nimr org user seeded. All 2.5.x tests are disabled until a
// distinct Nimr JM user is added to seed data.

let marmulJourneyId: string;
let marmulVehicleId: string;

test.beforeAll(async () => {
  const entities = await resolveTestEntities();
  marmulVehicleId = entities.vehicleId;

  // Create a journey as Marmul JM
  const marmulCtx = await apiAs('jm');
  const tomorrow = futureDateString(1);

  const res = await marmulCtx.post('/api/v1/journeys', {
    data: {
      vehicleId: entities.vehicleId,
      driverId: entities.driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Multi-tenant isolation test',
    },
  });
  const body = await res.json();
  marmulJourneyId = body.data?.id ?? body.id;

  await marmulCtx.dispose();
});

test.fixme('2.5.1 — Nimr JM journey list does not contain Marmul journey', async () => {
  // arrange
  const nimrCtx = await apiAs('jm-nimr');

  // act
  const res = await nimrCtx.get('/api/v1/journeys');
  const body = await res.json();
  const journeys = Array.isArray(body.data) ? body.data : [];

  // assert
  const found = journeys.find((j: { id: string }) => j.id === marmulJourneyId);
  expect(found).toBeUndefined();

  await nimrCtx.dispose();
});

test.fixme('2.5.2 — Nimr JM direct GET of Marmul journey → 404', async () => {
  // arrange
  const nimrCtx = await apiAs('jm-nimr');

  // act
  const res = await nimrCtx.get(`/api/v1/journeys/${marmulJourneyId}`);

  // assert — 404, not 403 (must not leak existence)
  expect(res.status()).toBe(404);

  await nimrCtx.dispose();
});

test.fixme('2.5.3 — Nimr JM PATCH of Marmul journey → 404', async () => {
  // arrange
  const nimrCtx = await apiAs('jm-nimr');

  // act
  const res = await nimrCtx.patch(`/api/v1/journeys/${marmulJourneyId}`, {
    data: { purpose: 'Cross-tenant tamper attempt' },
  });

  // assert
  expect(res.status()).toBe(404);

  await nimrCtx.dispose();
});

test.fixme('2.5.4 — Nimr JM vehicle list does not include Marmul vehicles', async () => {
  // arrange
  const nimrCtx = await apiAs('jm-nimr');

  // act
  const res = await nimrCtx.get('/api/v1/vehicles');
  const body = await res.json();
  const vehicles = Array.isArray(body.data) ? body.data : [];

  // assert
  const marmulVehicle = vehicles.find((v: { plate: string }) => v.plate === '12-A-3471');
  expect(marmulVehicle).toBeUndefined();

  await nimrCtx.dispose();
});

test.fixme('2.5.5 — Nimr JM direct GET of Marmul vehicle → 404', async () => {
  if (!marmulVehicleId) { test.skip(); return; }

  // arrange
  const nimrCtx = await apiAs('jm-nimr');

  // act
  const res = await nimrCtx.get(`/api/v1/vehicles/${marmulVehicleId}`);

  // assert
  expect(res.status()).toBe(404);

  await nimrCtx.dispose();
});

test.fixme('2.5.6 — Cross-tenant journey creation: Nimr JM uses Marmul vehicle → rejected', async () => {
  // arrange
  const nimrCtx = await apiAs('jm-nimr');
  const tomorrow = futureDateString(1);

  // act — Nimr JM tries to create a journey using a Marmul vehicle ID
  const res = await nimrCtx.post('/api/v1/journeys', {
    data: {
      vehicleId: '12-A-3471', // Marmul vehicle
      driverId: 'hassan@artech.om', // Nimr driver
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Cross-tenant create attempt',
    },
  });

  // assert — 400 or 404 — must never succeed
  expect([400, 404, 422]).toContain(res.status());
  expect(res.status()).not.toBe(201);

  await nimrCtx.dispose();
});

test.fixme('2.5.7 — Work orders: Nimr cannot see Marmul work orders', async () => {
  // arrange
  const nimrCtx = await apiAs('jm-nimr');

  // act
  const res = await nimrCtx.get('/api/v1/work-orders');
  const body = await res.json();
  const orders = Array.isArray(body.data) ? body.data : [];

  // All returned work orders must belong to Nimr org
  for (const order of orders as Array<{ orgId?: string; org_id?: string }>) {
    const orgId = order.orgId ?? order.org_id;
    if (orgId) {
      expect(orgId).not.toMatch(/marmul/i);
    }
  }

  await nimrCtx.dispose();
});
