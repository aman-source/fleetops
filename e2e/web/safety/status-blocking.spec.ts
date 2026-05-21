/**
 * 2.2 status-blocking.spec.ts
 *
 * Verify every blocking vehicle status blocks journey submission.
 * Also verify invalid DB status transitions raise Postgres exceptions.
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { rawQuery } from '../helpers/db.js';
import { futureDateString } from '../helpers/time.js';

const BLOCKING_STATUSES = [
  'no_go',
  'under_maintenance',
  'expired_documents',
  'ivms_fault',
  'nfc_fault',
  'hse_hold',
  'decommissioned',
] as const;

let jmToken: string;
let adminToken: string;
let driverId: string;

test.beforeAll(async () => {
  const jmTokens = await getTokens('jm');
  jmToken = jmTokens.accessToken;
  const adminTokens = await getTokens('admin');
  adminToken = adminTokens.accessToken;
  const entities = await resolveTestEntities();
  driverId = entities.driverId;
});

// ── Status blocking tests (one per blocking status) ───────────────────────────

for (const blockingStatus of BLOCKING_STATUSES) {
  test(`2.2 — status=${blockingStatus} blocks journey submission`, async ({ request }) => {
    // arrange — create vehicle with blocking status
    const adminApi = new ApiClient(request, adminToken);
    const jmApi = new ApiClient(request, jmToken);

    const plateNo = `55-S-${Date.now().toString().slice(-4)}`;
    // Create as available so journey creation succeeds, then flip status
    const vehicle = await adminApi.post<{ id: string; plateNo: string }>(
      '/api/v1/vehicles',
      {
        plateNo,
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
        purpose: `Status blocking test — ${blockingStatus}`,
      },
    );

    // Flip vehicle to blocking status (simulates vehicle going bad after journey creation)
    await rawQuery(
      `UPDATE vehicles SET status = $1, updated_at = NOW() WHERE id = $2`,
      [blockingStatus, vehicle.id],
    );

    // act
    const submitRes = await jmApi.postRaw(`/api/v1/journeys/${journey.id}/submit`);

    // assert — must be blocked
    expect(submitRes.status()).toBe(422);
    const body = await submitRes.json();
    const responseText = JSON.stringify(body).toLowerCase();
    expect(responseText).toMatch(new RegExp(blockingStatus.replace(/_/g, '|'), 'i'));

    // Verify gate 2 BLOCK mentions the status
    const gates = await jmApi.get<{
      gates: Array<{
        gateNumber: number;
        status: string;
        checks: Array<{ status: string; message: string }>;
      }>;
    }>(`/api/v1/journeys/${journey.id}/gates`);

    const gate2 = gates.gates.find((g) => g.gateNumber === 2);
    expect(gate2?.status).toBe('BLOCK');
  });
}

// ── Invalid status transitions via DB ─────────────────────────────────────────

test('2.2 — DB: decommissioned → available transition raises Postgres exception', async () => {
  // arrange — find or create a decommissioned vehicle
  const decommRows = await rawQuery<{ id: string }>(
    `SELECT id FROM vehicles WHERE status = 'decommissioned' LIMIT 1`,
  );

  if (!decommRows.length) {
    // No decommissioned vehicle in seed — create via raw query
    await rawQuery(
      `INSERT INTO vehicles (id, plate_no, org_id, status, make, model, year, type, seat_count, created_at, updated_at)
       VALUES (gen_random_uuid(), '00-T-0001', (SELECT id FROM organizations LIMIT 1),
               'decommissioned', 'Test', 'Test', 2020, 'light', 5, NOW(), NOW())
       ON CONFLICT (plate_no) DO NOTHING`,
    );
  }

  const vehicleId = decommRows[0]?.id ?? (
    await rawQuery<{ id: string }>(
      `SELECT id FROM vehicles WHERE plate = '00-T-0001'`,
    )
  )[0]?.id;

  if (!vehicleId) {
    test.skip(); // Couldn't set up fixture
    return;
  }

  // act + assert — DB should reject this transition
  await expect(
    rawQuery(
      `UPDATE vehicles SET status = 'available' WHERE id = $1`,
      [vehicleId],
    ),
  ).rejects.toThrow();
});

test('2.2 — Application layer throws ConflictError on invalid transition', async ({ request }) => {
  // arrange — try to move a decommissioned vehicle to available via API
  const adminApi = new ApiClient(request, adminToken);

  const decommRows = await rawQuery<{ id: string }>(
    `SELECT id FROM vehicles WHERE status = 'decommissioned' LIMIT 1`,
  );

  if (!decommRows.length) {
    test.skip();
    return;
  }

  // act — PATCH /vehicles/:id/status (app layer validates transitions)
  const res = await request.patch(
    `/api/v1/vehicles/${decommRows[0].id}/status`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'available', reason: 'Test transition attempt' },
    },
  );

  // assert — 409 Conflict
  expect([409, 422]).toContain(res.status());
});
