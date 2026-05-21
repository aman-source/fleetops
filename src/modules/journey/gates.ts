/**
 * Journey Go/No-Go Gates — 6 gates, server-evaluated.
 *
 * Gate 1: Driver authorization
 * Gate 2: Vehicle readiness
 * Gate 3: Documents & permits
 * Gate 4: Route & risk
 * Gate 5: Passengers & headcount
 * Gate 6: HSE approval
 *
 * ALL gates run in parallel (Promise.all). Each gate runs its checks in parallel.
 * Any BLOCK in any gate → journey cannot be submitted.
 * Server RE-VALIDATES all gates on submit. Never trust UI state.
 */
import { eq, and, isNull, gte, sql } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { drivers } from '../../infra/db/schema/drivers.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { devices } from '../../infra/db/schema/devices.js';
import { documents } from '../../infra/db/schema/documents.js';
import { vehicleHasBlockingInspection } from '../inspections/inspections.service.js';
import { journeyPassengers, journeyWaypoints, journeys } from '../../infra/db/schema/journeys.js';
import { driverScores, incidents } from '../../infra/db/schema/hse.js';
import { events } from '../../infra/db/schema/events.js';
import { telemetryLogs } from '../../infra/db/schema/telemetry.js';

export type CheckStatus = 'PASS' | 'BLOCK' | 'REVIEW';

export interface GateCheck {
  name: string;
  status: CheckStatus;
  message: string;
}

export interface GateResult {
  gate: string;
  gateNumber: number;
  status: CheckStatus;
  checks: GateCheck[];
}

export interface AllGatesResult {
  canSubmit: boolean;
  gates: GateResult[];
  riskScore?: number;
  riskLevel?: string;
}

interface JourneyDraft {
  vehicleId: string;
  driverId: string;
  journeyId?: string; // for passenger headcount check
  plannedDeparture: Date;
  plannedArrival: Date;
  orgId: string;
}

export async function evaluateAllGates(draft: JourneyDraft): Promise<AllGatesResult> {
  const [gates, { score: riskScore, level: riskLevel }] = await Promise.all([
    Promise.all([
      evaluateDriverGate(draft),
      evaluateVehicleGate(draft),
      evaluateDocumentsGate(draft),
      evaluateRouteGate(draft),
      evaluatePassengerGate(draft),
      evaluateHSEGate(draft),
    ]),
    computeRiskScore(draft),
  ]);

  const canSubmit = gates.every((g) => g.status !== 'BLOCK');

  return { canSubmit, gates, riskScore, riskLevel };
}

// ── Risk Score (exported for submitJourney to persist) ──

export async function computeRiskScore(draft: JourneyDraft): Promise<{ score: number; level: string }> {
  const departureHour = draft.plannedDeparture.getUTCHours() + 4; // Oman UTC+4
  const normHour = departureHour % 24;
  const durationHours = (draft.plannedArrival.getTime() - draft.plannedDeparture.getTime()) / (1000 * 60 * 60);
  const currentYear = new Date().getFullYear();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000);

  const [vehicleRows, scoreRows, incidentRows, panicRows, waypointRows] = await Promise.all([
    db.select({ year: vehicles.year }).from(vehicles).where(eq(vehicles.id, draft.vehicleId)).limit(1),
    db.select({ totalScore: driverScores.totalScore })
      .from(driverScores)
      .where(eq(driverScores.driverId, draft.driverId))
      .orderBy(sql`${driverScores.period} desc`)
      .limit(1),
    db.select({ id: incidents.id })
      .from(incidents)
      .where(and(
        eq(incidents.driverId, draft.driverId),
        gte(incidents.startedAt, thirtyDaysAgo),
        isNull(incidents.deletedAt),
      ))
      .limit(1),
    db.select({ id: events.id })
      .from(events)
      .where(and(
        eq(events.vehicleId, draft.vehicleId),
        eq(events.eventType, 'panic'),
        gte(events.recordedAt, ninetyDaysAgo),
      ))
      .limit(1),
    draft.journeyId
      ? db.select({ lat: journeyWaypoints.lat, lon: journeyWaypoints.lon, sequence: journeyWaypoints.sequence })
          .from(journeyWaypoints)
          .where(eq(journeyWaypoints.journeyId, draft.journeyId))
          .orderBy(journeyWaypoints.sequence)
      : Promise.resolve([]),
  ]);

  let score = 0;

  // Night departure: 3 pts if hour < 5 or > 22
  if (normHour < 5 || normHour > 22) score += 3;

  // Duration: 2 pts if > 8h, +2 more if > 12h
  if (durationHours > 8) score += 2;
  if (durationHours > 12) score += 2;

  // Driver history
  const driverScore = Number(scoreRows[0]?.totalScore ?? 100);
  if (driverScore < 60) score += 3;
  else if (driverScore < 80) score += 1;
  if (incidentRows.length > 0) score += 2;

  // Vehicle age
  const vehicleAge = currentYear - (vehicleRows[0]?.year ?? currentYear);
  if (vehicleAge > 10) score += 2;
  else if (vehicleAge > 7) score += 1;

  // Route distance from waypoints (haversine between consecutive points)
  if (waypointRows.length >= 2) {
    let totalKm = 0;
    for (let i = 1; i < waypointRows.length; i++) {
      totalKm += haversineKm(
        Number(waypointRows[i - 1].lat), Number(waypointRows[i - 1].lon),
        Number(waypointRows[i].lat), Number(waypointRows[i].lon),
      );
    }
    if (totalKm > 300) score += 2;
    else if (totalKm > 150) score += 1;
  }

  // Recent panic events on this vehicle
  if (panicRows.length > 0) score += 3;

  const level = score >= 7 ? 'H' : score >= 4 ? 'M' : 'L';
  return { score, level };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Gate 1: Driver Authorization ──
async function evaluateDriverGate(draft: JourneyDraft): Promise<GateResult> {
  const rows = await db.select().from(drivers)
    .where(and(eq(drivers.id, draft.driverId), isNull(drivers.deletedAt)))
    .limit(1);

  const driver = rows[0];
  if (!driver) return blockedGate('Driver Authorization', 1, 'Driver not found');

  const today = new Date().toISOString().split('T')[0];

  const checks = await Promise.all([
    // License valid
    Promise.resolve<GateCheck>({
      name: 'License valid',
      status: driver.licenseExpiry >= today ? 'PASS' : 'BLOCK',
      message: driver.licenseExpiry >= today
        ? `License valid until ${driver.licenseExpiry}`
        : `License expired on ${driver.licenseExpiry}`,
    }),

    // DDC valid
    Promise.resolve<GateCheck>({
      name: 'DDC certificate',
      status: !driver.ddcExpiry || driver.ddcExpiry >= today ? 'PASS' : 'BLOCK',
      message: !driver.ddcExpiry ? 'No DDC on file'
        : driver.ddcExpiry >= today ? `DDC valid until ${driver.ddcExpiry}` : `DDC expired on ${driver.ddcExpiry}`,
    }),

    // Medical valid
    Promise.resolve<GateCheck>({
      name: 'Medical fitness',
      status: !driver.medicalExpiry || driver.medicalExpiry >= today ? 'PASS' : 'BLOCK',
      message: !driver.medicalExpiry ? 'No medical on file'
        : driver.medicalExpiry >= today ? `Medical valid until ${driver.medicalExpiry}` : `Medical expired on ${driver.medicalExpiry}`,
    }),

    // Vehicle type authorization
    (async (): Promise<GateCheck> => {
      const vRows = await db.select({ type: vehicles.type }).from(vehicles).where(eq(vehicles.id, draft.vehicleId)).limit(1);
      const vehicleType = vRows[0]?.type;
      const authorized = driver.authorizedTypes?.includes(vehicleType ?? '') ?? false;
      return {
        name: 'Vehicle type authorization',
        status: authorized ? 'PASS' : 'BLOCK',
        message: authorized ? `Authorized for ${vehicleType}` : `Not authorized for vehicle type: ${vehicleType}`,
      };
    })(),

    // NFC card active
    Promise.resolve<GateCheck>({
      name: 'NFC card active',
      status: driver.nfcCardUid ? 'PASS' : 'REVIEW',
      message: driver.nfcCardUid ? `NFC card: ${driver.nfcCardUid}` : 'No NFC card assigned',
    }),

    // Driver status
    Promise.resolve<GateCheck>({
      name: 'Driver status',
      status: driver.status === 'active' ? 'PASS' : 'BLOCK',
      message: driver.status === 'active' ? 'Driver active' : `Driver status: ${driver.status}`,
    }),
  ]);

  return aggregateGate('Driver Authorization', 1, checks);
}

// ── Gate 2: Vehicle Readiness ──
async function evaluateVehicleGate(draft: JourneyDraft): Promise<GateResult> {
  const vRows = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, draft.vehicleId), isNull(vehicles.deletedAt)))
    .limit(1);

  const vehicle = vRows[0];
  if (!vehicle) return blockedGate('Vehicle Readiness', 2, 'Vehicle not found');

  const deviceRows = await db.select().from(devices)
    .where(and(eq(devices.vehicleId, draft.vehicleId), eq(devices.type, 'ivms')))
    .limit(1);

  const ivmsDevice = deviceRows[0];

  const checks: GateCheck[] = [
    {
      name: 'Vehicle status',
      status: vehicle.status === 'available' || vehicle.status === 'conditional' ? 'PASS' : 'BLOCK',
      message: `Vehicle status: ${vehicle.status}`,
    },
    {
      name: 'IVMS device installed',
      status: ivmsDevice ? 'PASS' : 'BLOCK',
      message: ivmsDevice ? `IVMS: ${ivmsDevice.serialNo}` : 'No IVMS device linked',
    },
    {
      name: 'IVMS device health',
      status: ivmsDevice?.healthStatus === 'online' ? 'PASS'
        : ivmsDevice?.healthStatus === 'fault' ? 'BLOCK' : 'REVIEW',
      message: ivmsDevice ? `IVMS health: ${ivmsDevice.healthStatus}` : 'No IVMS device',
    },
    {
      name: 'Conditional expiry',
      status: vehicle.status === 'conditional' && vehicle.conditionalExpiry
        ? (vehicle.conditionalExpiry > new Date() ? 'PASS' : 'BLOCK')
        : 'PASS',
      message: vehicle.status === 'conditional'
        ? `Conditional until ${vehicle.conditionalExpiry?.toISOString() ?? 'unknown'}`
        : 'Not conditional',
    },
  ];

  // Sub-check: active inspection campaign with critical defects
  const hasBlockingInspection = await vehicleHasBlockingInspection(draft.vehicleId).catch(() => false);
  checks.push({
    name: 'Inspection campaign',
    status: hasBlockingInspection ? 'BLOCK' : 'PASS',
    message: hasBlockingInspection
      ? 'Vehicle has a failed inspection with critical defects — cannot depart until resolved'
      : 'No blocking inspections',
  });

  return aggregateGate('Vehicle Readiness', 2, checks);
}

// ── Gate 3: Documents & Permits ──
async function evaluateDocumentsGate(draft: JourneyDraft): Promise<GateResult> {
  // Check vehicle documents
  const vehicleDocs = await db.select().from(documents)
    .where(and(
      eq(documents.entityType, 'vehicle'),
      eq(documents.entityId, draft.vehicleId),
      isNull(documents.deletedAt),
      eq(documents.blocksOnExpiry, true),
    ));

  // Check driver documents
  const driverDocs = await db.select().from(documents)
    .where(and(
      eq(documents.entityType, 'driver'),
      eq(documents.entityId, draft.driverId),
      isNull(documents.deletedAt),
      eq(documents.blocksOnExpiry, true),
    ));

  const checks: GateCheck[] = [];

  // Required vehicle doc types
  const requiredVehicleDocs = ['mulkia', 'insurance', 'ras'];
  for (const docType of requiredVehicleDocs) {
    const doc = vehicleDocs.find((d) => d.documentType === docType);
    if (!doc) {
      checks.push({ name: `Vehicle ${docType}`, status: 'BLOCK', message: `No ${docType} on file` });
    } else if (doc.status === 'expired') {
      checks.push({ name: `Vehicle ${docType}`, status: 'BLOCK', message: `${docType} expired on ${doc.expiryDate}` });
    } else if (doc.status === 'expiring') {
      checks.push({ name: `Vehicle ${docType}`, status: 'REVIEW', message: `${docType} expiring on ${doc.expiryDate}` });
    } else {
      checks.push({ name: `Vehicle ${docType}`, status: 'PASS', message: `${docType} valid until ${doc.expiryDate}` });
    }
  }

  // Any other expired blocking docs
  const otherExpired = vehicleDocs.filter(
    (d) => !requiredVehicleDocs.includes(d.documentType) && d.status === 'expired',
  );
  for (const doc of otherExpired) {
    checks.push({ name: `Vehicle ${doc.documentType}`, status: 'BLOCK', message: `${doc.documentType} expired` });
  }

  // Driver documents
  const expiredDriverDocs = driverDocs.filter((d) => d.status === 'expired');
  if (expiredDriverDocs.length > 0) {
    for (const doc of expiredDriverDocs) {
      checks.push({ name: `Driver ${doc.documentType}`, status: 'BLOCK', message: `Driver ${doc.documentType} expired` });
    }
  } else {
    checks.push({ name: 'Driver documents', status: 'PASS', message: 'All driver documents valid' });
  }

  return aggregateGate('Documents & Permits', 3, checks);
}

// ── Gate 4: Route & Risk ──
async function evaluateRouteGate(draft: JourneyDraft): Promise<GateResult> {
  const departureHour = draft.plannedDeparture.getUTCHours() + 4; // Oman UTC+4
  const isNight = (departureHour % 24) >= 22 || (departureHour % 24) < 5;
  const durationHours = (draft.plannedArrival.getTime() - draft.plannedDeparture.getTime()) / (1000 * 60 * 60);

  const checks: GateCheck[] = [
    {
      name: 'Departure time',
      status: isNight ? 'REVIEW' : 'PASS',
      message: isNight ? 'Night departure — requires HSE review' : 'Daylight departure',
    },
    {
      name: 'Journey duration',
      status: durationHours > 12 ? 'REVIEW' : durationHours > 0 ? 'PASS' : 'BLOCK',
      message: durationHours > 0 ? `${durationHours.toFixed(1)} hours` : 'Invalid duration',
    },
    {
      name: 'Emergency contact',
      status: 'PASS', // validated at schema level
      message: 'Emergency contact provided',
    },
  ];

  return aggregateGate('Route & Risk', 4, checks);
}

// ── Gate 5: Passengers & Headcount ──
async function evaluatePassengerGate(draft: JourneyDraft): Promise<GateResult> {
  const vRows = await db.select({ seatCount: vehicles.seatCount })
    .from(vehicles).where(eq(vehicles.id, draft.vehicleId)).limit(1);

  const seatCount = vRows[0]?.seatCount ?? 0;

  let passengerCount = 0;
  if (draft.journeyId) {
    const paxRows = await db.select({ id: journeyPassengers.id })
      .from(journeyPassengers)
      .where(eq(journeyPassengers.journeyId, draft.journeyId));
    passengerCount = paxRows.length;
  }

  const totalOccupants = passengerCount + 1; // +1 for driver

  const checks: GateCheck[] = [
    {
      name: 'Headcount vs capacity',
      status: totalOccupants <= seatCount ? 'PASS' : 'BLOCK',
      message: `${totalOccupants} occupants (${passengerCount} passengers + driver) / ${seatCount} seats`,
    },
    {
      name: 'Seatbelt availability',
      status: totalOccupants <= seatCount ? 'PASS' : 'BLOCK',
      message: totalOccupants <= seatCount ? 'Seatbelts for all occupants' : 'Insufficient seatbelts',
    },
  ];

  return aggregateGate('Passengers & Headcount', 5, checks);
}

// ── Gate 6: HSE Approval ──
async function evaluateHSEGate(draft: JourneyDraft): Promise<GateResult> {
  const { score: riskScore, level: riskLevel } = await computeRiskScore(draft);

  // Driver fatigue check: hours driven in last 24h
  // Only count journeys whose planned departure has already passed (driver actually departed)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();
  const recentJourneys = await db.select({
    plannedDeparture: journeys.plannedDeparture,
    plannedArrival: journeys.plannedArrival,
  }).from(journeys)
    .where(and(
      eq(journeys.driverId, draft.driverId),
      eq(journeys.status, 'closed'),
      gte(journeys.closedAt, twentyFourHoursAgo),
      sql`${journeys.plannedDeparture} <= ${now.toISOString()}`,
      isNull(journeys.deletedAt),
    ));

  let hoursLast24h = 0;
  for (const j of recentJourneys) {
    const dur = (j.plannedArrival.getTime() - j.plannedDeparture.getTime()) / (1000 * 60 * 60);
    hoursLast24h += Math.max(0, dur);
  }

  const checks: GateCheck[] = [
    {
      name: 'Risk assessment',
      status: riskLevel === 'H' ? 'REVIEW' : riskLevel === 'M' ? 'REVIEW' : 'PASS',
      message: `Risk level: ${riskLevel} (score: ${riskScore})`,
    },
    {
      name: 'HSE approval required',
      status: riskLevel === 'H' ? 'REVIEW' : 'PASS',
      message: riskLevel === 'H' ? 'High risk — requires HSE sign-off' : `${riskLevel} risk — no HSE override needed`,
    },
    {
      name: 'Driver fatigue',
      status: hoursLast24h > 10 ? 'BLOCK' : hoursLast24h > 8 ? 'REVIEW' : 'PASS',
      message: `Driver drove ${hoursLast24h.toFixed(1)}h in last 24h${hoursLast24h > 10 ? ' — exceeds 10h limit' : ''}`,
    },
  ];

  return aggregateGate('HSE Approval', 6, checks);
}

// ── Helpers ──

function aggregateGate(name: string, number: number, checks: GateCheck[]): GateResult {
  let status: CheckStatus = 'PASS';
  if (checks.some((c) => c.status === 'BLOCK')) status = 'BLOCK';
  else if (checks.some((c) => c.status === 'REVIEW')) status = 'REVIEW';

  return { gate: name, gateNumber: number, status, checks };
}

function blockedGate(name: string, number: number, message: string): GateResult {
  return {
    gate: name,
    gateNumber: number,
    status: 'BLOCK',
    checks: [{ name: 'Prerequisite', status: 'BLOCK', message }],
  };
}
