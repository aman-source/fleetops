/**
 * MQTT subscriber — connects to Mosquitto, subscribes to device topics,
 * normalizes payloads, feeds into the real-time pipeline.
 *
 * Topics:
 *   fleet/{deviceId}/telemetry  — position, speed, ignition, fuel
 *   fleet/{deviceId}/event      — device-generated events
 *   fleet/{deviceId}/panic      — panic button press (immediate path)
 *   fleet/{deviceId}/nfc        — NFC card tap (driver auth)
 *   fleet/{deviceId}/health     — device health status
 */
import type { FastifyInstance } from 'fastify';
import { getMqttClient } from '../../infra/mqtt/client.js';
import { redis } from '../../infra/redis/client.js';
import { db } from '../../infra/db/client.js';
import { telemetryLogs } from '../../infra/db/schema/telemetry.js';
import { events as eventsTable } from '../../infra/db/schema/events.js';
import { devices } from '../../infra/db/schema/devices.js';
import { eq } from 'drizzle-orm';
import { updateLiveState, type VehicleLiveState } from './live-state.js';
import { classifyTelemetry, classifyPanic, type TelemetryPoint, type ClassifiedEvent } from './event-classifier.js';

// Device ID → vehicle ID mapping cache (refreshed from DB)
const deviceVehicleMap = new Map<string, { vehicleId: string; orgId: string }>();

export async function initMqttSubscriber(app: FastifyInstance) {
  const client = getMqttClient();

  // Load device→vehicle mapping
  await refreshDeviceMap();

  // Subscribe to all device topics
  client.subscribe('fleet/+/telemetry', { qos: 1 });
  client.subscribe('fleet/+/panic', { qos: 1 });
  client.subscribe('fleet/+/event', { qos: 1 });
  client.subscribe('fleet/+/health', { qos: 1 });
  client.subscribe('fleet/+/nfc', { qos: 1 });

  app.log.info('MQTT subscribed to fleet/+/telemetry, fleet/+/panic, fleet/+/event, fleet/+/health, fleet/+/nfc');

  client.on('message', async (topic, payload) => {
    try {
      const parts = topic.split('/');
      const deviceId = parts[1];
      const messageType = parts[2];

      const mapping = deviceVehicleMap.get(deviceId);
      if (!mapping) {
        app.log.warn({ deviceId, topic }, 'Unknown device ID — skipping');
        return;
      }

      const data = JSON.parse(payload.toString());

      switch (messageType) {
        case 'telemetry':
          await handleTelemetry(app, deviceId, mapping, data);
          break;
        case 'panic':
          await handlePanic(app, deviceId, mapping, data);
          break;
        case 'event':
          await handleDeviceEvent(app, deviceId, mapping, data);
          break;
        case 'health':
          await handleHealth(app, deviceId, data);
          break;
        case 'nfc':
          await handleNfc(app, deviceId, mapping, data);
          break;
      }
    } catch (err) {
      app.log.error({ err, topic }, 'MQTT message processing error');
    }
  });
}

async function handleTelemetry(
  app: FastifyInstance,
  deviceId: string,
  mapping: { vehicleId: string; orgId: string },
  data: Record<string, unknown>,
) {
  const point: TelemetryPoint = {
    vehicleId: mapping.vehicleId,
    deviceId,
    driverId: data.driver_id as string | undefined,
    journeyId: data.journey_id as string | undefined,
    lat: Number(data.lat),
    lon: Number(data.lon),
    speed: Number(data.speed ?? 0),
    heading: Number(data.heading ?? 0),
    ignition: Boolean(data.ignition),
    fuelPct: data.fuel_pct != null ? Number(data.fuel_pct) : undefined,
    engineRpm: data.engine_rpm != null ? Number(data.engine_rpm) : undefined,
    odometer: data.odometer != null ? Number(data.odometer) : undefined,
    engineHours: data.engine_hours != null ? Number(data.engine_hours) : undefined,
    recordedAt: new Date(data.recorded_at as string || Date.now()),
  };

  // 1. Update Redis live state
  const liveState: VehicleLiveState = {
    ...point,
    status: 'active',
    lastSeen: new Date().toISOString(),
  };
  await updateLiveState(liveState);

  // 2. Write to Postgres (async — don't block pipeline)
  db.insert(telemetryLogs).values({
    vehicleId: point.vehicleId,
    deviceId: point.deviceId,
    driverId: point.driverId,
    journeyId: point.journeyId,
    lat: String(point.lat),
    lon: String(point.lon),
    speed: point.speed != null ? String(point.speed) : null,
    heading: point.heading != null ? String(point.heading) : null,
    ignition: point.ignition,
    fuelPct: point.fuelPct,
    engineRpm: point.engineRpm,
    odometer: point.odometer,
    engineHours: point.engineHours,
    rawPayload: data,
    recordedAt: point.recordedAt,
  }).catch((err) => app.log.error({ err }, 'Telemetry DB write failed'));

  // 3. Classify events
  const classifiedEvents = classifyTelemetry(point);

  // 4. Store events + publish
  for (const event of classifiedEvents) {
    await storeAndPublishEvent(app, event, mapping.orgId);
  }

  // 5. Publish live update to Redis pub/sub → WebSocket
  await redis.publish('fleet:live', JSON.stringify(liveState));
  await redis.publish(`vehicle:${mapping.vehicleId}`, JSON.stringify(liveState));

  if (point.journeyId) {
    await redis.publish(`journey:${point.journeyId}:live`, JSON.stringify(liveState));
  }
}

async function handlePanic(
  app: FastifyInstance,
  deviceId: string,
  mapping: { vehicleId: string; orgId: string },
  data: Record<string, unknown>,
) {
  app.log.warn({ vehicleId: mapping.vehicleId, deviceId }, 'PANIC EVENT RECEIVED');

  const point: TelemetryPoint = {
    vehicleId: mapping.vehicleId,
    deviceId,
    driverId: data.driver_id as string | undefined,
    journeyId: data.journey_id as string | undefined,
    lat: Number(data.lat),
    lon: Number(data.lon),
    speed: 0,
    heading: 0,
    ignition: true,
    recordedAt: new Date(data.recorded_at as string || Date.now()),
  };

  const panicEvent = classifyPanic(point);

  // PANIC: immediate path — no batching, no queue delay
  // 1. Immediate DB write (not async)
  await storeAndPublishEvent(app, panicEvent, mapping.orgId);

  // 2. Immediate Redis publish to critical channel
  await redis.publish('events:severity:critical', JSON.stringify(panicEvent));

  // 3. TODO Phase 7: Create incident
  // 4. TODO Phase 9: BullMQ priority-1 notification job
}

async function handleDeviceEvent(
  app: FastifyInstance,
  deviceId: string,
  mapping: { vehicleId: string; orgId: string },
  data: Record<string, unknown>,
) {
  const event: ClassifiedEvent = {
    vehicleId: mapping.vehicleId,
    deviceId,
    driverId: data.driver_id as string | undefined,
    journeyId: data.journey_id as string | undefined,
    eventType: data.event_type as ClassifiedEvent['eventType'],
    severity: (data.severity as ClassifiedEvent['severity']) ?? 'info',
    lat: Number(data.lat ?? 0),
    lon: Number(data.lon ?? 0),
    speed: Number(data.speed ?? 0),
    details: (data.details as Record<string, unknown>) ?? {},
    recordedAt: new Date(data.recorded_at as string || Date.now()),
  };

  await storeAndPublishEvent(app, event, mapping.orgId);
}

async function handleHealth(
  app: FastifyInstance,
  deviceId: string,
  data: Record<string, unknown>,
) {
  await db.update(devices).set({
    healthStatus: String(data.status ?? 'online'),
    gpsQuality: data.gps_quality != null ? Number(data.gps_quality) : undefined,
    batteryPct: data.battery_pct != null ? Number(data.battery_pct) : undefined,
    firmware: data.firmware as string | undefined,
    lastSeen: new Date(),
    updatedAt: new Date(),
  }).where(eq(devices.serialNo, deviceId));
}

async function handleNfc(
  app: FastifyInstance,
  _deviceId: string,
  mapping: { vehicleId: string; orgId: string },
  data: Record<string, unknown>,
) {
  // NFC tap — driver identification
  app.log.info({
    vehicleId: mapping.vehicleId,
    cardUid: data.card_uid,
    authorized: data.authorized,
  }, 'NFC card tap');

  if (!data.authorized) {
    const event: ClassifiedEvent = {
      vehicleId: mapping.vehicleId,
      deviceId: _deviceId,
      eventType: 'unauthorized_driver',
      severity: 'critical',
      lat: Number(data.lat ?? 0),
      lon: Number(data.lon ?? 0),
      speed: 0,
      details: { cardUid: data.card_uid },
      recordedAt: new Date(),
    };
    await storeAndPublishEvent(app, event, mapping.orgId);
  }
}

async function storeAndPublishEvent(
  app: FastifyInstance,
  event: ClassifiedEvent,
  orgId: string,
) {
  try {
    // DB write
    await db.insert(eventsTable).values({
      vehicleId: event.vehicleId,
      driverId: event.driverId,
      journeyId: event.journeyId,
      deviceId: event.deviceId,
      eventType: event.eventType,
      severity: event.severity,
      lat: String(event.lat),
      lon: String(event.lon),
      speed: event.speed != null ? String(event.speed) : null,
      details: event.details,
      recordedAt: event.recordedAt,
      orgId,
    });

    // Redis pub/sub fan-out
    const payload = JSON.stringify(event);
    await redis.publish(`events:vehicle:${event.vehicleId}`, payload);

    if (event.journeyId) {
      await redis.publish(`events:journey:${event.journeyId}`, payload);
    }

    if (event.severity === 'critical') {
      await redis.publish('events:severity:critical', payload);
    }
  } catch (err) {
    app.log.error({ err, event }, 'Event store/publish failed');
  }
}

async function refreshDeviceMap() {
  const rows = await db
    .select({ serialNo: devices.serialNo, vehicleId: devices.vehicleId, orgId: devices.orgId })
    .from(devices);

  deviceVehicleMap.clear();
  for (const row of rows) {
    if (row.vehicleId) {
      deviceVehicleMap.set(row.serialNo, { vehicleId: row.vehicleId, orgId: row.orgId });
    }
  }
}
