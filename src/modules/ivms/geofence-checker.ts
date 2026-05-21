/**
 * Geofence checker — PostGIS-backed containment tests with two-tier optimization.
 *
 * Tier 1: In-memory per-org bounding boxes (fast reject, no DB round-trip).
 * Tier 2: PostGIS ST_Contains for actual polygon intersection.
 *
 * Entry/exit tracking: last known geofence IDs per vehicle stored in Redis.
 */
import { sql } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { redis } from '../../infra/redis/client.js';
import type { ClassifiedEvent } from './event-classifier.js';

interface GeofenceRow extends Record<string, unknown> {
  id: string;
  name: string;
  type: string;
}

interface OrgBbox {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

// In-memory bounding box cache keyed by orgId
const orgBboxCache = new Map<string, OrgBbox>();
// Refresh every 5 minutes
let lastBboxRefresh = 0;
const BBOX_TTL_MS = 5 * 60 * 1000;

async function refreshBboxCache() {
  const now = Date.now();
  if (now - lastBboxRefresh < BBOX_TTL_MS) return;
  lastBboxRefresh = now;

  const rows = await db.execute<{ org_id: string; min_lon: string; max_lon: string; min_lat: string; max_lat: string }>(sql`
    SELECT
      org_id,
      MIN(ST_XMin(geom)) AS min_lon,
      MAX(ST_XMax(geom)) AS max_lon,
      MIN(ST_YMin(geom)) AS min_lat,
      MAX(ST_YMax(geom)) AS max_lat
    FROM geofences
    WHERE active = TRUE AND deleted_at IS NULL
    GROUP BY org_id
  `);

  orgBboxCache.clear();
  for (const row of rows.rows) {
    orgBboxCache.set(row.org_id, {
      minLon: Number(row.min_lon),
      maxLon: Number(row.max_lon),
      minLat: Number(row.min_lat),
      maxLat: Number(row.max_lat),
    });
  }
}

function pointInBbox(lon: number, lat: number, bbox: OrgBbox): boolean {
  return lon >= bbox.minLon && lon <= bbox.maxLon && lat >= bbox.minLat && lat <= bbox.maxLat;
}

/**
 * Check geofences for a telemetry point.
 * Returns events to emit (geofence_entry and/or geofence_exit).
 */
export async function checkGeofences(
  vehicleId: string,
  deviceId: string,
  orgId: string,
  lat: number,
  lon: number,
  journeyId?: string,
  driverId?: string,
): Promise<ClassifiedEvent[]> {
  const events: ClassifiedEvent[] = [];

  // Refresh bbox cache if stale
  await refreshBboxCache();

  // Tier 1: bounding box fast reject
  const bbox = orgBboxCache.get(orgId);
  if (bbox && !pointInBbox(lon, lat, bbox)) {
    // Point outside all geofences for this org — still need to check for exits
    const prevKey = `geofence:vehicle:${vehicleId}`;
    const prevGeofences = await redis.smembers(prevKey);
    if (prevGeofences.length > 0) {
      // Emit exits for all previously entered geofences
      for (const gfJson of prevGeofences) {
        const gf = JSON.parse(gfJson) as GeofenceRow;
        events.push(buildEvent(vehicleId, deviceId, lat, lon, driverId, journeyId, 'geofence_exit', gf));
      }
      await redis.del(prevKey);
    }
    return events;
  }

  // Tier 2: PostGIS containment check
  const result = await db.execute<GeofenceRow>(sql`
    SELECT id, name, type
    FROM geofences
    WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326))
      AND org_id = ${orgId}
      AND active = TRUE
      AND deleted_at IS NULL
  `);

  const currentGeofenceIds = new Set(result.rows.map(r => r.id));
  const prevKey = `geofence:vehicle:${vehicleId}`;

  // Get previously entered geofences
  const prevMembers = await redis.smembers(prevKey);
  const prevGeofenceIds = new Set(prevMembers.map(m => (JSON.parse(m) as GeofenceRow).id));

  // Emit geofence_entry for newly entered geofences
  for (const gf of result.rows) {
    if (!prevGeofenceIds.has(gf.id)) {
      events.push(buildEvent(vehicleId, deviceId, lat, lon, driverId, journeyId, 'geofence_entry', gf));
    }
  }

  // Emit geofence_exit for previously entered geofences now exited
  for (const prevJson of prevMembers) {
    const prevGf = JSON.parse(prevJson) as GeofenceRow;
    if (!currentGeofenceIds.has(prevGf.id)) {
      events.push(buildEvent(vehicleId, deviceId, lat, lon, driverId, journeyId, 'geofence_exit', prevGf));
    }
  }

  // Update Redis set with current geofences (expire after 2 hours of inactivity)
  if (result.rows.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.del(prevKey);
    for (const gf of result.rows) {
      pipeline.sadd(prevKey, JSON.stringify(gf));
    }
    pipeline.expire(prevKey, 7200);
    await pipeline.exec();
  } else {
    await redis.del(prevKey);
  }

  return events;
}

function buildEvent(
  vehicleId: string,
  deviceId: string,
  lat: number,
  lon: number,
  driverId: string | undefined,
  journeyId: string | undefined,
  eventType: 'geofence_entry' | 'geofence_exit',
  gf: GeofenceRow,
): ClassifiedEvent {
  return {
    vehicleId,
    deviceId,
    driverId,
    journeyId,
    eventType,
    severity: gf.type === 'red_zone' ? 'critical' : 'warning',
    lat,
    lon,
    speed: 0,
    details: { geofenceId: gf.id, geofenceName: gf.name, geofenceType: gf.type },
    recordedAt: new Date(),
  };
}

/**
 * Check route deviation for an active journey.
 * Returns a deviation event if the vehicle is outside the corridor for > 3 consecutive frames.
 */
export async function checkRouteDeviation(
  vehicleId: string,
  deviceId: string,
  journeyId: string,
  lat: number,
  lon: number,
  driverId?: string,
): Promise<ClassifiedEvent | null> {
  // Check if point is outside corridor
  const result = await db.execute<{ deviated: boolean }>(sql`
    SELECT NOT ST_Contains(corridor, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)) AS deviated
    FROM journey_route_corridors
    WHERE journey_id = ${journeyId}
    LIMIT 1
  `);

  if (!result.rows[0]) return null; // No corridor generated yet

  const isDeviated = result.rows[0].deviated;
  const counterKey = `deviation:${journeyId}`;

  if (isDeviated) {
    const count = await redis.incr(counterKey);
    await redis.expire(counterKey, 60);

    if (count >= 3) {
      // Reset counter to avoid repeated events
      await redis.set(counterKey, '0', 'EX', 60);
      return {
        vehicleId,
        deviceId,
        driverId,
        journeyId,
        eventType: 'deviation',
        severity: 'warning',
        lat,
        lon,
        speed: 0,
        details: { consecutiveFrames: count },
        recordedAt: new Date(),
      };
    }
  } else {
    // Back on route — reset counter
    await redis.del(counterKey);
  }

  return null;
}
