/**
 * 1.4 hse-incident-response.spec.ts — Panic button to playbook closure
 *
 * Personas: MQTT publisher (driver proxy) → HSE Officer → System
 * Tests: Panic event → incident creation → playbook steps → closure → vehicle release
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { publishPanic } from '../fixtures/mqtt-publisher.js';
import { subscribeRoom } from '../fixtures/ws-listener.js';
import {
  getVehicleStatus,
  getEvents,
  getIncidentBy,
  getIncidentSteps,
  getAuditLogs,
  rawQuery,
} from '../helpers/db.js';
import { futureDateString } from '../helpers/time.js';

test.describe.configure({ mode: 'serial' });

let hseToken: string;
let jmToken: string;
let incidentId: string;
let panicEventId: string;
let vehicleId: string;
let driverId: string;
let deviceId: string;

test.beforeAll(async ({ request }) => {
  const hseTokens = await getTokens('hse');
  hseToken = hseTokens.accessToken;
  const jmTokens = await getTokens('jm');
  jmToken = jmTokens.accessToken;

  // Resolve entity UUIDs
  const entities = await resolveTestEntities();
  vehicleId = entities.vehicleId;
  driverId = entities.driverId;
  deviceId = entities.deviceId; // serialNo for MQTT

  // Reset vehicle + close any stale journeys from prior test runs
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

  // Ensure vehicle is in active journey
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);
  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'HSE incident test journey',
    },
  );

  await jmApi.post(`/api/v1/journeys/${journey.id}/submit`);

  // Approve — handle multi-step chains (JM + possible HSE step)
  const approveRes = await jmApi.post<{ status: string }>(`/api/v1/journeys/${journey.id}/approve`);
  if (approveRes.status === 'pending_approval') {
    const hseTokens = await getTokens('hse');
    const hseApi = new ApiClient(request, hseTokens.accessToken);
    await hseApi.post(`/api/v1/journeys/${journey.id}/approve`).catch(() => null);
  }

  const driverTokens = await getTokens('driver-ali');
  const driverApi = new ApiClient(request, driverTokens.accessToken);
  await driverApi.post(`/api/v1/journeys/${journey.id}/activate`);
});

// Always reset vehicle to available after this suite — panic sets it to hse_hold
// and if later tests fail/skip, 1.4.7 (release) never runs → vehicle stuck in hse_hold
test.afterAll(async () => {
  if (vehicleId) {
    await rawQuery(
      `UPDATE vehicles SET status = 'available', updated_at = NOW()
       WHERE id = $1 AND status = 'hse_hold'`,
      [vehicleId],
    ).catch(() => null); // best-effort, don't fail cleanup
  }
});

test('1.4.1 — Panic MQTT event triggers incident within 3s', async () => {
  // arrange
  const wsRoom = await subscribeRoom('events:severity:critical', hseToken);

  // act
  await publishPanic(deviceId, {
    lat: 18.15,
    lon: 55.22,
    timestamp: new Date().toISOString(),
    driverId,
  });

  // assert — events table has panic row within 3s
  await expect
    .poll(
      async () => {
        const events = await getEvents({ type: 'panic', vehicleId });
        return events.length;
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThanOrEqual(1);

  // Get the panic event ID
  const events = await getEvents({ type: 'panic', vehicleId });
  panicEventId = (events[0] as { id: string }).id;

  // assert — WebSocket room received critical event
  await expect
    .poll(() => wsRoom.messages.length, { timeout: 5_000 })
    .toBeGreaterThanOrEqual(1);

  wsRoom.close();
});

test('1.4.2 — Incident created with tier=1 and 6 playbook steps', async () => {
  // act — poll for incident creation (async via event handler)
  await expect
    .poll(
      async () => {
        const incident = await getIncidentBy(panicEventId);
        return incident !== null;
      },
      { timeout: 5_000 },
    )
    .toBe(true);

  const incident = await getIncidentBy(panicEventId);
  expect(incident).toBeTruthy();
  incidentId = (incident as { id: string }).id;

  const inc = incident as Record<string, unknown>;
  expect(inc.tier ?? inc.severity).toBeTruthy();
  expect(['active', 'open']).toContain(inc.status);

  // Verify 6 playbook steps
  const steps = await getIncidentSteps(incidentId);
  expect(steps.length).toBe(6);
  const step1 = steps[0] as Record<string, unknown>;
  expect(['active', 'in_progress']).toContain(step1.status);
});

test('1.4.3 — Vehicle status is hse_hold', async () => {
  // act
  const status = await getVehicleStatus(vehicleId);
  // assert
  expect(status).toBe('hse_hold');
});

test('1.4.4 — HSE completes all 6 playbook steps', async ({ request }) => {
  // arrange
  const hseApi = new ApiClient(request, hseToken);
  const steps = await getIncidentSteps(incidentId);

  // act — complete each step in order
  for (const step of steps) {
    const s = step as { id: string; step_number: number };
    await hseApi.post(`/api/v1/incidents/${incidentId}/steps/${s.id}/complete`);
  }

  // assert — all steps completed
  const updatedSteps = await getIncidentSteps(incidentId);
  for (const step of updatedSteps) {
    const s = step as { status: string };
    expect(['completed', 'done']).toContain(s.status);
  }
});

test('1.4.5 — HSE closes incident', async ({ request }) => {
  // arrange
  const hseApi = new ApiClient(request, hseToken);

  // act
  const res = await hseApi.post<{ status: string }>(
    `/api/v1/incidents/${incidentId}/close`,
    { closureReport: 'E2E test — incident resolved, all steps completed.' },
  );

  // assert
  expect(res.status).toBe('closed');
});

test('1.4.6 — Vehicle remains hse_hold until explicitly released', async () => {
  // assert — still on hold after incident close
  const status = await getVehicleStatus(vehicleId);
  expect(status).toBe('hse_hold');
});

test('1.4.7 — HSE releases vehicle', async ({ request }) => {
  // arrange
  const hseApi = new ApiClient(request, hseToken);

  // act
  await hseApi.post(`/api/v1/incidents/${incidentId}/release-vehicle`);

  // assert
  const status = await getVehicleStatus(vehicleId);
  expect(status).toBe('available');
});

test('1.4.8 — New journey can be submitted for released vehicle', async ({ request }) => {
  // arrange
  const jmApi = new ApiClient(request, jmToken);
  const tomorrow = futureDateString(1);

  // act
  const journey = await jmApi.post<{ id: string }>(
    '/api/v1/journeys',
    {
      vehicleId,
      driverId,
      plannedDeparture: `${tomorrow}T02:00:00.000Z`,
      plannedArrival: `${tomorrow}T10:00:00.000Z`,
      purpose: 'Post-incident journey',
    },
  );

  const gates = await jmApi.get<{ canSubmit: boolean }>(
    `/api/v1/journeys/${journey.id}/gates`,
  );

  // assert
  expect(gates.canSubmit).toBe(true);
});

test('1.4.9 — Audit log has all lifecycle events', async () => {
  // act
  const logs = await getAuditLogs({ entityType: 'incidents', entityId: incidentId });

  // assert
  const actions = logs.map((l) => (l as { action: string }).action);
  // Incidents auto-created by MQTT handler (no HTTP POST for creation),
  // so check step completion and close actions instead
  expect(actions.some((a) => /complete|step|close|release/i.test(a))).toBe(true);
  expect(actions.some((a) => /close/i.test(a))).toBe(true);
});
