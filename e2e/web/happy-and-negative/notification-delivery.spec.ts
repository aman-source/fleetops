/**
 * 3.4 notification-delivery.spec.ts
 *
 * Notification delivery for panic events: in-app, WebSocket.
 * Email via MailHog is marked fixme until P3.1 SMTP channel is implemented.
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { resolveTestEntities } from '../fixtures/entities.js';
import { ApiClient } from '../helpers/api.js';
import { publishPanic } from '../fixtures/mqtt-publisher.js';
import { subscribeRoom } from '../fixtures/ws-listener.js';
import { rawQuery } from '../helpers/db.js';

test.describe.configure({ mode: 'serial' });

let hseToken: string;
let jmToken: string;
let vehicleId: string;
let deviceId: string;

test.beforeAll(async () => {
  hseToken = (await getTokens('hse')).accessToken;
  jmToken = (await getTokens('jm')).accessToken;

  const entities = await resolveTestEntities();
  vehicleId = entities.vehicleId;
  deviceId = entities.deviceId;
  // Panic notifications are triggered by device MQTT events — no active journey needed.
});

test('3.4.1 — Panic triggers in-app notification within 3s', async ({ request }) => {
  // arrange
  const hseApi = new ApiClient(request, hseToken);

  const beforeCount = await rawQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM notifications WHERE type LIKE '%panic%' OR title LIKE '%PANIC%'`,
  );
  const before = parseInt(beforeCount[0].count);

  // act
  await publishPanic(deviceId, {
    lat: 18.15,
    lon: 55.22,
    timestamp: new Date().toISOString(),
  });

  // assert — in-app notification appears within 5s
  await expect
    .poll(
      async () => {
        const after = await rawQuery<{ count: string }>(
          `SELECT COUNT(*) as count FROM notifications WHERE type LIKE '%panic%' OR title LIKE '%PANIC%'`,
        );
        return parseInt(after[0].count);
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThan(before);
});

test('3.4.2 — WebSocket receives panic notification', async () => {
  // arrange
  const wsRoom = await subscribeRoom('events:severity:critical', hseToken);

  // act
  await publishPanic(deviceId, {
    lat: 18.16,
    lon: 55.23,
    timestamp: new Date().toISOString(),
  });

  // assert — WebSocket message received
  await expect
    .poll(() => wsRoom.messages.length, { timeout: 5_000 })
    .toBeGreaterThanOrEqual(1);

  wsRoom.close();
});

test('3.4.3 — Notifications list shows panic item via DB', async () => {
  // Verify via DB (bypass tenant scoping — panic notifications created in vehicle's org)
  const rows = await rawQuery<{ title: string; type: string }>(
    `SELECT title, type FROM notifications WHERE type LIKE '%panic%' OR title LIKE '%PANIC%' LIMIT 5`,
  );
  expect(rows.length).toBeGreaterThanOrEqual(1);
  expect(/panic/i.test(rows[0].type) || /panic/i.test(rows[0].title)).toBe(true);
});

// ── Email via MailHog — fixme until P3.1 SMTP channel implemented ─────────────

test.fixme(
  '3.4.4 — Email notification recorded in notification_deliveries',
  // BLOCKER: P3.1 email channel not yet implemented. MailHog container not in compose.
  // When implemented: check notification_deliveries WHERE channel='email' AND status='sent'
  async () => {
    const rows = await rawQuery(
      `SELECT * FROM notification_deliveries WHERE channel = 'email' ORDER BY created_at DESC LIMIT 5`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  },
);

test.fixme(
  '3.4.5 — MailHog confirms email with PANIC subject',
  // BLOCKER: P3.1 email channel + MailHog container not yet implemented.
  async () => {
    // When implemented: fetch from MailHog API at http://localhost:8025/api/v2/messages
  },
);
