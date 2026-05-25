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
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { journeys } from '../../infra/db/schema/journeys.js';
import { users } from '../../infra/db/schema/users.js';
import { roles } from '../../infra/db/schema/roles.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { updateLiveState, type VehicleLiveState } from './live-state.js';
import { classifyTelemetry, classifyPanic, type TelemetryPoint, type ClassifiedEvent } from './event-classifier.js';
import { checkGeofences, checkRouteDeviation } from './geofence-checker.js';
import { createPanicIncident } from '../hse/hse.service.js';
import { queueNotification } from '../notifications/notifications.service.js';

// Device ID → vehicle ID mapping cache (refreshed from DB)
const deviceVehicleMap = new Map<string, { vehicleId: string; orgId: string; deviceUuid: string; plateNo: string; vehicleType: string }>();

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
  mapping: { vehicleId: string; orgId: string; deviceUuid: string },
  data: Record<string, unknown>,
) {
  const point: TelemetryPoint = {
    vehicleId: mapping.vehicleId,
    deviceId: mapping.deviceUuid, // use UUID for DB storage
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

  // If journeyId not in payload, look up the most recently activated journey for this vehicle
  if (!point.journeyId) {
    const activeJourney = await db.select({ id: journeys.id })
      .from(journeys)
      .where(and(eq(journeys.vehicleId, mapping.vehicleId), eq(journeys.status, 'active')))
      .orderBy(desc(journeys.createdAt))
      .limit(1);
    if (activeJourney[0]) point.journeyId = activeJourney[0].id;
  }

  // 1. Update Redis live state
  const liveState: VehicleLiveState = {
    ...point,
    orgId: mapping.orgId,
    plateNo: mapping.plateNo,
    vehicleType: mapping.vehicleType,
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

  // 4a. Geofence entry/exit checks (non-blocking — errors logged, never thrown)
  try {
    const geofenceEvents = await checkGeofences(
      point.vehicleId, point.deviceId, mapping.orgId,
      point.lat, point.lon, point.journeyId, point.driverId,
    );
    for (const event of geofenceEvents) {
      await storeAndPublishEvent(app, event, mapping.orgId);
    }
  } catch (err) {
    app.log.error({ err }, 'Geofence check failed');
  }

  // 4b. Route deviation check for active journeys
  if (point.journeyId) {
    try {
      const deviationEvent = await checkRouteDeviation(
        point.vehicleId, point.deviceId, point.journeyId,
        point.lat, point.lon, point.driverId,
      );
      if (deviationEvent) {
        await storeAndPublishEvent(app, deviationEvent, mapping.orgId);
        // Flip journey status to deviated
        await db.update(journeys).set({ status: 'deviated', updatedAt: new Date() })
          .where(and(eq(journeys.id, point.journeyId), eq(journeys.status, 'active')));
      }
    } catch (err) {
      app.log.error({ err }, 'Route deviation check failed');
    }
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
  mapping: { vehicleId: string; orgId: string; deviceUuid: string },
  data: Record<string, unknown>,
) {
  app.log.warn({ vehicleId: mapping.vehicleId, deviceId }, 'PANIC EVENT RECEIVED');

  const point: TelemetryPoint = {
    vehicleId: mapping.vehicleId,
    deviceId: mapping.deviceUuid, // use UUID for DB storage (events.device_id is UUID)
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
  // 1. Immediate DB write (not async) — returns inserted event id
  const eventId = await storeAndPublishEvent(app, panicEvent, mapping.orgId);

  // 2. Immediate Redis publish to critical channel
  await redis.publish('events:severity:critical', JSON.stringify(panicEvent));

  // 3. Create incident from panic event
  try {
    await createPanicIncident({
      eventId: eventId ?? crypto.randomUUID(),
      vehicleId: mapping.vehicleId,
      driverId: point.driverId,
      journeyId: point.journeyId,
      lat: point.lat,
      lon: point.lon,
      situation: 'Panic button activated',
      orgId: mapping.orgId,
    });
  } catch (err) {
    app.log.error({ err }, 'Failed to create panic incident — continuing');
  }

  // 4. Notify HSE, GM, journey_manager roles for the org
  try {
    const notifyRoles = ['hse', 'gm', 'journey_manager'];
    const roleRows = await db.select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.orgId, mapping.orgId), inArray(roles.name, notifyRoles)));

    if (roleRows.length > 0) {
      const roleIds = roleRows.map(r => r.id);
      const userRows = await db.select({ id: users.id })
        .from(users)
        .where(and(eq(users.orgId, mapping.orgId), inArray(users.roleId, roleIds)));

      for (const user of userRows) {
        await queueNotification({
          userId: user.id,
          type: 'panic',
          title: '🚨 Panic Button Activated',
          body: `Vehicle ${mapping.vehicleId} triggered panic at (${point.lat.toFixed(4)}, ${point.lon.toFixed(4)})`,
          channel: 'in_app',
          data: {
            vehicleId: mapping.vehicleId,
            driverId: point.driverId,
            journeyId: point.journeyId,
            lat: point.lat,
            lon: point.lon,
          },
        }, 1);
      }
    }
  } catch (err) {
    app.log.error({ err }, 'Failed to queue panic notifications — continuing');
  }
}

async function handleDeviceEvent(
  app: FastifyInstance,
  deviceId: string,
  mapping: { vehicleId: string; orgId: string; deviceUuid: string },
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
  const healthStatus = String(data.status ?? 'online');

  const [device] = await db.update(devices).set({
    healthStatus,
    gpsQuality: data.gps_quality != null ? Number(data.gps_quality) : undefined,
    batteryPct: data.battery_pct != null ? Number(data.battery_pct) : undefined,
    firmware: data.firmware as string | undefined,
    lastSeen: new Date(),
    updatedAt: new Date(),
  }).where(eq(devices.serialNo, deviceId)).returning({ type: devices.type, vehicleId: devices.vehicleId });

  // Auto-flip vehicle status on device fault
  if (device?.vehicleId && healthStatus === 'fault') {
    const targetStatus = device.type === 'nfc' ? 'nfc_fault' : 'ivms_fault';
    try {
      await db.update(vehicles).set({ status: targetStatus, updatedAt: new Date() })
        .where(and(eq(vehicles.id, device.vehicleId)));
      app.log.warn({ vehicleId: device.vehicleId, deviceType: device.type }, `Vehicle set to ${targetStatus}`);
    } catch (err) {
      app.log.error({ err }, `Failed to flip vehicle to ${targetStatus}`);
    }
  }
}

async function handleNfc(
  app: FastifyInstance,
  _deviceId: string,
  mapping: { vehicleId: string; orgId: string; deviceUuid: string },
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
): Promise<string | undefined> {
  try {
    // DB write — return inserted id
    const [inserted] = await db.insert(eventsTable).values({
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
    }).returning({ id: eventsTable.id });

    // Redis pub/sub fan-out
    const payload = JSON.stringify(event);
    await redis.publish(`events:vehicle:${event.vehicleId}`, payload);

    if (event.journeyId) {
      await redis.publish(`events:journey:${event.journeyId}`, payload);
    }

    if (event.severity === 'critical') {
      await redis.publish('events:severity:critical', payload);
    }

    return inserted?.id;
  } catch (err) {
    app.log.error({ err, event }, 'Event store/publish failed');
    return undefined;
  }
}

async function refreshDeviceMap() {
  const rows = await db
    .select({
      id: devices.id,
      serialNo: devices.serialNo,
      vehicleId: devices.vehicleId,
      orgId: devices.orgId,
      plateNo: vehicles.plateNo,
      vehicleType: vehicles.type,
    })
    .from(devices)
    .leftJoin(vehicles, eq(devices.vehicleId, vehicles.id));

  deviceVehicleMap.clear();
  for (const row of rows) {
    if (row.vehicleId) {
      deviceVehicleMap.set(row.serialNo, {
        vehicleId: row.vehicleId,
        orgId: row.orgId,
        deviceUuid: row.id,
        plateNo: row.plateNo ?? '',
        vehicleType: row.vehicleType ?? 'light',
      });
    }
  }
}
