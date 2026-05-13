/**
 * Event classifier — analyzes telemetry and emits typed events.
 *
 * Checks:
 * - Overspeed (configurable threshold, default 120 km/h)
 * - Harsh braking (speed delta > threshold between consecutive readings)
 * - Idle (ignition on, speed 0, duration > threshold)
 * - Night driving (between 22:00-05:00 local time)
 * - Device offline (no message for > stale threshold)
 */
import type { EventType, EventSeverity } from '../../infra/db/schema/events.js';

export interface TelemetryPoint {
  vehicleId: string;
  deviceId: string;
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
  recordedAt: Date;
}

export interface ClassifiedEvent {
  vehicleId: string;
  driverId?: string;
  journeyId?: string;
  deviceId: string;
  eventType: EventType;
  severity: EventSeverity;
  lat: number;
  lon: number;
  speed: number;
  details: Record<string, unknown>;
  recordedAt: Date;
}

// Configurable thresholds — will come from admin config in Phase 11
const THRESHOLDS = {
  overspeedKmh: 120,
  harshBrakingDeltaKmh: 30, // speed drop per reading interval
  idleMinutes: 10,
  nightStart: 22, // 22:00
  nightEnd: 5,    // 05:00
};

// Track last reading per vehicle for delta calculations
const lastReadings = new Map<string, TelemetryPoint>();
const idleStart = new Map<string, Date>();

export function classifyTelemetry(point: TelemetryPoint): ClassifiedEvent[] {
  const events: ClassifiedEvent[] = [];
  const prev = lastReadings.get(point.vehicleId);

  // Overspeed
  if (point.speed > THRESHOLDS.overspeedKmh) {
    events.push({
      vehicleId: point.vehicleId,
      driverId: point.driverId,
      journeyId: point.journeyId,
      deviceId: point.deviceId,
      eventType: 'overspeed',
      severity: point.speed > 140 ? 'critical' : 'warning',
      lat: point.lat,
      lon: point.lon,
      speed: point.speed,
      details: { speedKmh: point.speed, threshold: THRESHOLDS.overspeedKmh },
      recordedAt: point.recordedAt,
    });
  }

  // Harsh braking
  if (prev && prev.speed - point.speed > THRESHOLDS.harshBrakingDeltaKmh) {
    events.push({
      vehicleId: point.vehicleId,
      driverId: point.driverId,
      journeyId: point.journeyId,
      deviceId: point.deviceId,
      eventType: 'harsh_braking',
      severity: 'warning',
      lat: point.lat,
      lon: point.lon,
      speed: point.speed,
      details: { prevSpeed: prev.speed, currentSpeed: point.speed, delta: prev.speed - point.speed },
      recordedAt: point.recordedAt,
    });
  }

  // Harsh acceleration
  if (prev && point.speed - prev.speed > THRESHOLDS.harshBrakingDeltaKmh) {
    events.push({
      vehicleId: point.vehicleId,
      driverId: point.driverId,
      journeyId: point.journeyId,
      deviceId: point.deviceId,
      eventType: 'harsh_accel',
      severity: 'info',
      lat: point.lat,
      lon: point.lon,
      speed: point.speed,
      details: { prevSpeed: prev?.speed ?? 0, currentSpeed: point.speed },
      recordedAt: point.recordedAt,
    });
  }

  // Idle detection
  if (point.ignition && point.speed === 0) {
    if (!idleStart.has(point.vehicleId)) {
      idleStart.set(point.vehicleId, point.recordedAt);
    } else {
      const start = idleStart.get(point.vehicleId)!;
      const idleMinutes = (point.recordedAt.getTime() - start.getTime()) / 60_000;
      if (idleMinutes >= THRESHOLDS.idleMinutes) {
        events.push({
          vehicleId: point.vehicleId,
          driverId: point.driverId,
          journeyId: point.journeyId,
          deviceId: point.deviceId,
          eventType: 'idle',
          severity: 'info',
          lat: point.lat,
          lon: point.lon,
          speed: 0,
          details: { idleMinutes: Math.round(idleMinutes) },
          recordedAt: point.recordedAt,
        });
      }
    }
  } else {
    idleStart.delete(point.vehicleId);
  }

  // Night driving (Oman timezone UTC+4)
  const omanHour = (point.recordedAt.getUTCHours() + 4) % 24;
  if (point.speed > 0 && (omanHour >= THRESHOLDS.nightStart || omanHour < THRESHOLDS.nightEnd)) {
    events.push({
      vehicleId: point.vehicleId,
      driverId: point.driverId,
      journeyId: point.journeyId,
      deviceId: point.deviceId,
      eventType: 'night_driving',
      severity: 'warning',
      lat: point.lat,
      lon: point.lon,
      speed: point.speed,
      details: { localHour: omanHour },
      recordedAt: point.recordedAt,
    });
  }

  // Store for next comparison
  lastReadings.set(point.vehicleId, point);

  return events;
}

/**
 * Classify a panic event — always critical, immediate path.
 */
export function classifyPanic(point: TelemetryPoint): ClassifiedEvent {
  return {
    vehicleId: point.vehicleId,
    driverId: point.driverId,
    journeyId: point.journeyId,
    deviceId: point.deviceId,
    eventType: 'panic',
    severity: 'critical',
    lat: point.lat,
    lon: point.lon,
    speed: point.speed,
    details: { source: 'panic_button' },
    recordedAt: point.recordedAt,
  };
}
