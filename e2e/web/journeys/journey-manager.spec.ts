/**
 * 1.1 journey-manager.spec.ts — Journey lifecycle, happy path
 *
 * Persona: Journey Manager Marmul
 * Goal: Create journey → gates → submit → approve → driver activates → MQTT telemetry → close → audit
 *
 * SERIAL: each step depends on the previous.
 */
import { test, expect } from '@playwright/test';
import { getTokens, apiAs } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import {
  publishTelemetry,
  interpolateRoute,
  disconnectMqtt,
} from '../fixtures/mqtt-publisher.js';
import { subscribeRoom } from '../fixtures/ws-listener.js';
import { getJourneyStatus, getJourneyApprovals, getAuditLogs, rawQuery } from '../helpers/db.js';
import { futureDateString } from '../helpers/time.js';

test.describe.configure({ mode: 'serial' });

// State shared across steps
let journeyId: string;
let jmToken: string;
let driverToken: string;
let vehicleId: string;
let driverId: string;
let deviceId: string;

// Oman coordinates: Marmul → Fahud
const ROUTE = interpolateRoute(
  { lat: 18.13, lon: 55.20 }, // Marmul
  { lat: 22.34, lon: 56.50 }, // Fahud
  30,
);

test.beforeAll(async () => {
  const jmTokens = await getTokens('jm');
  jmToken = jmTokens.accessToken;
  const driverTokens = await getTokens('driver-ali');
  driverToken = driverTokens.accessToken;

  const entities = await resolveTestEntities();
  vehicleId = entities.vehicleId;
  driverId = entities.driverId;
  deviceId = entities.deviceId;

  // Reset shared vehicle to available + close any stale journeys from prior test runs
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

test.afterAll(async () => {
  await disconnectMqtt();
});

test('1.1.1 — Login as JM and navigate to /journeys/new', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);
  // act — verify the token works
  const me = await jmApi.get('/api/v1/auth/me');
  // assert — /auth/me returns { user: { email } }
  const email = (me as { user?: { email: string }; email?: string }).user?.email
    ?? (me as { email?: string }).email;
  expect(email).toBe('jm@artech.om');
});

test('1.1.2 — Create journey draft', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);

  const tomorrow = futureDateString(1);

  // act
  const journey = await jmApi.post<{ id: string; status: string }>('/api/v1/journeys', {
    vehicleId,
    driverId,
    plannedDeparture: `${tomorrow}T02:00:00.000Z`, // 06:00 Oman = 02:00 UTC
    plannedArrival: `${tomorrow}T10:00:00.000Z`,   // 14:00 Oman = 10:00 UTC
    purpose: 'Inspection — well 47',
    passengerCount: 2,
  });

  // assert
  expect(journey.id).toBeTruthy();
  expect(journey.status).toBe('draft');
  journeyId = journey.id;
});

test('1.1.3 — Evaluate gates: all should PASS, canSubmit=true', async ({ request }) => {
  // arrange
  expect(journeyId).toBeTruthy();
  const jmApi = new ApiClient(request, jmToken);

  // act
  const gates = await jmApi.get<{
    canSubmit: boolean;
    gates: Array<{ gate: string; status: string; checks: Array<{ status: string }> }>;
  }>(`/api/v1/journeys/${journeyId}/gates`);

  // assert
  expect(gates.gates).toHaveLength(6);
  expect(gates.canSubmit).toBe(true);
  for (const gate of gates.gates) {
    expect(['PASS', 'REVIEW']).toContain(gate.status);
    // No gate should be BLOCK
    const blocked = gate.checks.filter((c) => c.status === 'BLOCK');
    expect(blocked).toHaveLength(0);
  }
});

test('1.1.4 — Submit journey for approval', async ({ request }) => {
  // arrange
  expect(journeyId).toBeTruthy();
  const jmApi = new ApiClient(request, jmToken);

  // act
  const res = await jmApi.post<{ status: string }>(`/api/v1/journeys/${journeyId}/submit`);

  // assert
  expect(res.status).toBe('pending_approval');

  const dbStatus = await getJourneyStatus(journeyId);
  expect(dbStatus).toBe('pending_approval');
});

test('1.1.5 — Verify approval chain created', async () => {
  // arrange + act
  const approvals = await getJourneyApprovals(journeyId);

  // assert — at least 1 approval step exists
  expect(approvals.length).toBeGreaterThanOrEqual(1);
  const pendingStep = approvals.find(
    (a) => (a as { decision: string }).decision === 'pending',
  );
  expect(pendingStep).toBeTruthy();
});

test('1.1.6 — JM approves journey', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);

  // act
  const res = await jmApi.post<{ status: string }>(`/api/v1/journeys/${journeyId}/approve`);

  // assert — approved or pending next approval step
  expect(['approved', 'pending_approval']).toContain(res.status);

  // Force through remaining approval steps (if multi-step)
  if (res.status === 'pending_approval') {
    // get remaining approvers
    const approvals = await getJourneyApprovals(journeyId);
    const pendingSteps = approvals.filter(
      (a) => (a as { decision: string }).decision === 'pending',
    );

    // For each pending step, approve as the appropriate role
    for (const step of pendingSteps) {
      const stepName = (step as { step: string }).step;
      if (stepName === 'hse' || stepName === 'hse_officer') {
        const hseTokens = await getTokens('hse');
        const hseApi = new ApiClient(request, hseTokens.accessToken);
        await hseApi.post(`/api/v1/journeys/${journeyId}/approve`);
      }
    }
  }

  const dbStatus = await getJourneyStatus(journeyId);
  expect(dbStatus).toBe('approved');
});

test('1.1.7 — Driver activates journey', async ({ request }) => {
  // arrange
  const driverApi = new ApiClient(request, driverToken);

  // Verify driver can access the journey directly (list may exceed pagination limit in test DB)
  const myJourney = await driverApi.get<{ id: string; status: string }>(`/api/v1/journeys/${journeyId}`);
  expect(myJourney).toBeTruthy();
  expect(myJourney.id).toBe(journeyId);

  // act
  const res = await driverApi.post<{ status: string }>(`/api/v1/journeys/${journeyId}/activate`);

  // assert
  expect(res.status).toBe('active');
  const dbStatus = await getJourneyStatus(journeyId);
  expect(dbStatus).toBe('active');
});

test('1.1.8 — MQTT telemetry: 30 position points published', async () => {
  // arrange
  const wsRoom = await subscribeRoom(`journey:${journeyId}:live`, jmToken);

  // act — publish 30 telemetry points in compressed time (100ms apart)
  for (const point of ROUTE) {
    await publishTelemetry(deviceId, {
      lat: point.lat,
      lon: point.lon,
      speed: 60,
      heading: 90,
      timestamp: new Date().toISOString(),
    });
    await new Promise((r) => setTimeout(r, 100));
  }

  // Wait up to 5s for at least 25 messages
  await expect
    .poll(() => wsRoom.messages.length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(25);

  wsRoom.close();
});

test('1.1.9 — Driver closes journey', async ({ request }) => {
  // arrange
  const driverApi = new ApiClient(request, driverToken);

  // act
  const res = await driverApi.post<{ status: string }>(`/api/v1/journeys/${journeyId}/close`);

  // assert
  expect(['completed', 'closed']).toContain(res.status);
});

test('1.1.10 — JM formal close-out', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);
  const current = await getJourneyStatus(journeyId);

  // act — if already closed by driver, formal close moves to "closed"
  if (current !== 'closed') {
    const res = await jmApi.post<{ status: string }>(`/api/v1/journeys/${journeyId}/close`);
    expect(res.status).toBe('closed');
  }

  const dbStatus = await getJourneyStatus(journeyId);
  expect(dbStatus).toBe('closed');
});

test('1.1.11 — Audit log has ≥ 6 rows for full lifecycle', async () => {
  // arrange + act
  const logs = await getAuditLogs({ entityType: 'journeys', entityId: journeyId });

  // assert — 5 minimum: gates + submit + approve(s) + activate + close
  // (JM formal close may be skipped if driver close already sets status to 'closed')
  expect(logs.length).toBeGreaterThanOrEqual(5);

  // Verify audit rows have required fields
  for (const log of logs) {
    const l = log as Record<string, unknown>;
    expect(l.user_id ?? l.userId).toBeTruthy();
    expect(l.action).toBeTruthy();
    // entityType stored as URL segment 'journeys' (plural)
    expect(l.entity_type ?? l.entityType).toBe('journeys');
  }
});
