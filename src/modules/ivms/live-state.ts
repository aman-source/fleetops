/**
 * Redis live vehicle state.
 *
 * Two Redis structures:
 * 1. GeoSet `fleet:positions` — GEOADD for spatial queries (nearest vehicle, viewport)
 * 2. Hash `fleet:state:{vehicleId}` — full live state per vehicle
 *
 * Updated on every MQTT telemetry message. Read by WebSocket + REST.
 */
import { redis } from '../../infra/redis/client.js';

const GEO_KEY = 'fleet:positions';
const STATE_PREFIX = 'fleet:state:';
const STALE_THRESHOLD_SECONDS = 60;

export interface VehicleLiveState {
  vehicleId: string;
  deviceId: string;
  orgId: string;
  plateNo?: string;
  vehicleType?: string;
  driverId?: string;
  journeyId?: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  fuelPct?: number;
  engineRpm?: number;
  odometer?: number;
  engineHours?: number;
  status: string;
  lastSeen: string; // ISO 8601
}

export async function updateLiveState(state: VehicleLiveState): Promise<void> {
  const pipeline = redis.pipeline();

  // Update geospatial position
  pipeline.geoadd(GEO_KEY, state.lon, state.lat, state.vehicleId);

  // Update full state hash
  const hashKey = `${STATE_PREFIX}${state.vehicleId}`;
  pipeline.hset(hashKey, {
    vehicleId: state.vehicleId,
    deviceId: state.deviceId,
    orgId: state.orgId,
    plateNo: state.plateNo ?? '',
    vehicleType: state.vehicleType ?? '',
    driverId: state.driverId ?? '',
    journeyId: state.journeyId ?? '',
    lat: String(state.lat),
    lon: String(state.lon),
    speed: String(state.speed),
    heading: String(state.heading),
    ignition: state.ignition ? '1' : '0',
    fuelPct: String(state.fuelPct ?? ''),
    engineRpm: String(state.engineRpm ?? ''),
    odometer: String(state.odometer ?? ''),
    engineHours: String(state.engineHours ?? ''),
    status: state.status,
    lastSeen: state.lastSeen,
  });

  // Set TTL — auto-cleanup if device goes silent
  pipeline.expire(hashKey, STALE_THRESHOLD_SECONDS * 5);

  await pipeline.exec();
}

export async function getLiveState(vehicleId: string): Promise<VehicleLiveState | null> {
  const data = await redis.hgetall(`${STATE_PREFIX}${vehicleId}`);
  if (!data.vehicleId) return null;

  return {
    vehicleId: data.vehicleId,
    deviceId: data.deviceId,
    orgId: data.orgId ?? '',
    plateNo: data.plateNo || undefined,
    vehicleType: data.vehicleType || undefined,
    driverId: data.driverId || undefined,
    journeyId: data.journeyId || undefined,
    lat: parseFloat(data.lat),
    lon: parseFloat(data.lon),
    speed: parseFloat(data.speed),
    heading: parseFloat(data.heading),
    ignition: data.ignition === '1',
    fuelPct: data.fuelPct ? parseInt(data.fuelPct, 10) : undefined,
    engineRpm: data.engineRpm ? parseInt(data.engineRpm, 10) : undefined,
    odometer: data.odometer ? parseInt(data.odometer, 10) : undefined,
    engineHours: data.engineHours ? parseInt(data.engineHours, 10) : undefined,
    status: data.status,
    lastSeen: data.lastSeen,
  };
}

export async function getAllLiveStates(): Promise<VehicleLiveState[]> {
  // Scan for all fleet:state:* keys
  const states: VehicleLiveState[] = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${STATE_PREFIX}*`, 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of keys) {
        pipeline.hgetall(key);
      }
      const results = await pipeline.exec();

      if (results) {
        for (const [err, data] of results) {
          if (!err && data && typeof data === 'object' && 'vehicleId' in (data as object)) {
            const d = data as Record<string, string>;
            states.push({
              vehicleId: d.vehicleId,
              deviceId: d.deviceId,
              orgId: d.orgId ?? '',
              plateNo: d.plateNo || undefined,
              vehicleType: d.vehicleType || undefined,
              driverId: d.driverId || undefined,
              journeyId: d.journeyId || undefined,
              lat: parseFloat(d.lat),
              lon: parseFloat(d.lon),
              speed: parseFloat(d.speed),
              heading: parseFloat(d.heading),
              ignition: d.ignition === '1',
              fuelPct: d.fuelPct ? parseInt(d.fuelPct, 10) : undefined,
              engineRpm: d.engineRpm ? parseInt(d.engineRpm, 10) : undefined,
              odometer: d.odometer ? parseInt(d.odometer, 10) : undefined,
              engineHours: d.engineHours ? parseInt(d.engineHours, 10) : undefined,
              status: d.status,
              lastSeen: d.lastSeen,
            });
          }
        }
      }
    }
  } while (cursor !== '0');

  return states;
}

/**
 * Geospatial query — vehicles within bounding box or radius.
 */
export async function getVehiclesInRadius(
  lon: number, lat: number, radiusKm: number, count = 50,
): Promise<string[]> {
  const results = await redis.geosearch(
    GEO_KEY, 'FROMLONLAT', lon, lat, 'BYRADIUS', radiusKm, 'km', 'ASC', 'COUNT', count,
  );
  return results as string[];
}

export async function getVehiclesInBox(
  lon: number, lat: number, widthKm: number, heightKm: number,
): Promise<string[]> {
  const results = await redis.geosearch(
    GEO_KEY, 'FROMLONLAT', lon, lat, 'BYBOX', widthKm, heightKm, 'km',
  );
  return results as string[];
}

export function isStale(lastSeen: string): boolean {
  const elapsed = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  return elapsed > STALE_THRESHOLD_SECONDS;
}
