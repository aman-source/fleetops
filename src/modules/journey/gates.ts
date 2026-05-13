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
import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { drivers } from '../../infra/db/schema/drivers.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { devices } from '../../infra/db/schema/devices.js';
import { documents } from '../../infra/db/schema/documents.js';
import { journeyPassengers } from '../../infra/db/schema/journeys.js';

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
  const gates = await Promise.all([
    evaluateDriverGate(draft),
    evaluateVehicleGate(draft),
    evaluateDocumentsGate(draft),
    evaluateRouteGate(draft),
    evaluatePassengerGate(draft),
    evaluateHSEGate(draft),
  ]);

  const canSubmit = gates.every((g) => g.status !== 'BLOCK');

  return { canSubmit, gates };
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
  const isNight = departureHour >= 22 || departureHour < 5;
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

  // TODO: Route deviation corridor check against PostGIS approved routes
  // TODO: Weather check integration
  // TODO: Communication dead-zone check

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
  // Compute basic risk score
  const departureHour = draft.plannedDeparture.getUTCHours() + 4;
  const isNight = departureHour >= 22 || departureHour < 5;
  const durationHours = (draft.plannedArrival.getTime() - draft.plannedDeparture.getTime()) / (1000 * 60 * 60);

  let riskScore = 0;
  if (isNight) riskScore += 3;
  if (durationHours > 8) riskScore += 2;
  if (durationHours > 12) riskScore += 2;

  const riskLevel = riskScore >= 5 ? 'H' : riskScore >= 3 ? 'M' : 'L';

  const checks: GateCheck[] = [
    {
      name: 'Risk assessment',
      status: riskLevel === 'H' ? 'REVIEW' : 'PASS',
      message: `Risk level: ${riskLevel} (score: ${riskScore})`,
    },
    {
      name: 'HSE approval required',
      status: riskLevel === 'H' ? 'REVIEW' : 'PASS',
      message: riskLevel === 'H' ? 'High risk — requires HSE sign-off' : 'Standard risk — no HSE override needed',
    },
  ];

  // TODO: Check driver fatigue (recent journey hours in last 24h)
  // TODO: Check vehicle incident history

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
