import { eq, and, isNull, ilike, or, lt, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { drivers } from '../../infra/db/schema/drivers.js';
import { devices } from '../../infra/db/schema/devices.js';
import { driverNfcCards } from '../../infra/db/schema/nfc-cards.js';
import { VEHICLE_STATUS_TRANSITIONS, type VehicleStatus } from '../../infra/db/schema/vehicles.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors.js';
import { paginationMeta } from '../../shared/pagination.js';
import type {
  CreateVehicleInput, UpdateVehicleInput, UpdateVehicleStatusInput,
  CreateDriverInput, UpdateDriverInput,
  CreateDeviceInput, UpdateDeviceInput,
} from './fleet.schema.js';

// ═══════════════════════════════════════════
// VEHICLES
// ═══════════════════════════════════════════

export async function listVehicles(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; type?: string; projectId?: string; search?: string;
}) {
  const conditions = [eq(vehicles.orgId, tenantId), isNull(vehicles.deletedAt)];

  if (query.status) conditions.push(eq(vehicles.status, query.status));
  if (query.type) conditions.push(eq(vehicles.type, query.type));
  if (query.projectId) conditions.push(eq(vehicles.projectId, query.projectId));
  if (query.search) {
    conditions.push(
      or(
        ilike(vehicles.plateNo, `%${query.search}%`),
        ilike(vehicles.fleetNo, `%${query.search}%`),
        ilike(vehicles.make, `%${query.search}%`),
        ilike(vehicles.model, `%${query.search}%`),
      )!,
    );
  }
  if (query.cursor) conditions.push(lt(vehicles.id, query.cursor));

  const rows = await db
    .select()
    .from(vehicles)
    .where(and(...conditions))
    .orderBy(vehicles.createdAt)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getVehicle(tenantId: string, vehicleId: string) {
  const rows = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.orgId, tenantId), isNull(vehicles.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Vehicle', vehicleId);
  return rows[0];
}

export async function createVehicle(tenantId: string, input: CreateVehicleInput) {
  const [vehicle] = await db
    .insert(vehicles)
    .values({ ...input, orgId: tenantId })
    .returning();
  return vehicle;
}

export async function updateVehicle(tenantId: string, vehicleId: string, input: UpdateVehicleInput) {
  const existing = await getVehicle(tenantId, vehicleId);

  const [updated] = await db
    .update(vehicles)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(vehicles.id, existing.id))
    .returning();

  return updated;
}

export async function updateVehicleStatus(
  tenantId: string,
  vehicleId: string,
  input: UpdateVehicleStatusInput,
) {
  const existing = await getVehicle(tenantId, vehicleId);
  const currentStatus = existing.status as VehicleStatus;
  const newStatus = input.status;

  // Validate status transition
  const allowedTargets = VEHICLE_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTargets?.includes(newStatus)) {
    throw new ConflictError(
      `Cannot transition vehicle from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedTargets?.join(', ') || 'none'}`,
    );
  }

  // Conditional status requires expiry date
  if (newStatus === 'conditional' && !input.conditionalExpiry) {
    throw new BadRequestError('Conditional status requires conditionalExpiry date');
  }

  const [updated] = await db
    .update(vehicles)
    .set({
      status: newStatus,
      conditionalExpiry: newStatus === 'conditional' ? new Date(input.conditionalExpiry!) : null,
      updatedAt: new Date(),
    })
    .where(eq(vehicles.id, existing.id))
    .returning();

  return updated;
}

// ═══════════════════════════════════════════
// DRIVERS
// ═══════════════════════════════════════════

export async function listDrivers(tenantId: string, query: {
  cursor?: string; limit: number; status?: string; search?: string;
}) {
  const conditions = [eq(drivers.orgId, tenantId), isNull(drivers.deletedAt)];

  if (query.status) conditions.push(eq(drivers.status, query.status));
  if (query.search) {
    conditions.push(
      or(
        ilike(drivers.name, `%${query.search}%`),
        ilike(drivers.employeeId, `%${query.search}%`),
        ilike(drivers.licenseNo, `%${query.search}%`),
      )!,
    );
  }
  if (query.cursor) conditions.push(lt(drivers.id, query.cursor));

  const rows = await db
    .select()
    .from(drivers)
    .where(and(...conditions))
    .orderBy(drivers.createdAt)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getDriver(tenantId: string, driverId: string) {
  const rows = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.id, driverId), eq(drivers.orgId, tenantId), isNull(drivers.deletedAt)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Driver', driverId);
  return rows[0];
}

export async function createDriver(tenantId: string, input: CreateDriverInput) {
  const [driver] = await db
    .insert(drivers)
    .values({ ...input, orgId: tenantId })
    .returning();
  return driver;
}

export async function updateDriver(tenantId: string, driverId: string, input: UpdateDriverInput) {
  const existing = await getDriver(tenantId, driverId);

  const [updated] = await db
    .update(drivers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(drivers.id, existing.id))
    .returning();

  return updated;
}

export async function assignNfc(tenantId: string, driverId: string, nfcCardUid: string, issuedBy?: string) {
  const existing = await getDriver(tenantId, driverId);

  // Check NFC not already assigned to another driver
  const conflict = await db
    .select({ id: drivers.id })
    .from(drivers)
    .where(and(eq(drivers.nfcCardUid, nfcCardUid), isNull(drivers.deletedAt)))
    .limit(1);

  if (conflict[0] && conflict[0].id !== existing.id) {
    throw new ConflictError(`NFC card ${nfcCardUid} already assigned to another driver`);
  }

  // Revoke any existing active card for this driver in history table
  await db.update(driverNfcCards)
    .set({ revokedAt: new Date(), revokedBy: issuedBy ?? null, revokeReason: 'New card assigned' })
    .where(and(eq(driverNfcCards.driverId, driverId), isNull(driverNfcCards.revokedAt)));

  // Record in history
  await db.insert(driverNfcCards).values({
    driverId,
    cardUid: nfcCardUid,
    issuedBy: issuedBy ?? null,
  });

  const [updated] = await db
    .update(drivers)
    .set({ nfcCardUid, nfcIssuedAt: new Date(), updatedAt: new Date() })
    .where(eq(drivers.id, existing.id))
    .returning();

  return updated;
}

export async function revokeNfc(tenantId: string, driverId: string, revokedBy?: string) {
  const existing = await getDriver(tenantId, driverId);

  // Record revocation in history
  await db.update(driverNfcCards)
    .set({ revokedAt: new Date(), revokedBy: revokedBy ?? null })
    .where(and(eq(driverNfcCards.driverId, driverId), isNull(driverNfcCards.revokedAt)));

  const [updated] = await db
    .update(drivers)
    .set({ nfcCardUid: null, nfcIssuedAt: null, updatedAt: new Date() })
    .where(eq(drivers.id, existing.id))
    .returning();

  return updated;
}

export async function getNfcHistory(tenantId: string, driverId: string) {
  await getDriver(tenantId, driverId);
  return db.select().from(driverNfcCards)
    .where(eq(driverNfcCards.driverId, driverId))
    .orderBy(desc(driverNfcCards.issuedAt));
}

// ═══════════════════════════════════════════
// DEVICES
// ═══════════════════════════════════════════

export async function listDevices(tenantId: string, query: {
  cursor?: string; limit: number; type?: string; vehicleId?: string; healthStatus?: string;
}) {
  const conditions = [eq(devices.orgId, tenantId)];

  if (query.type) conditions.push(eq(devices.type, query.type));
  if (query.vehicleId) conditions.push(eq(devices.vehicleId, query.vehicleId));
  if (query.healthStatus) conditions.push(eq(devices.healthStatus, query.healthStatus));
  if (query.cursor) conditions.push(lt(devices.id, query.cursor));

  const rows = await db
    .select()
    .from(devices)
    .where(and(...conditions))
    .orderBy(devices.createdAt)
    .limit(query.limit);

  return { items: rows, meta: paginationMeta(rows, query.limit) };
}

export async function getDevice(tenantId: string, deviceId: string) {
  const rows = await db
    .select()
    .from(devices)
    .where(and(eq(devices.id, deviceId), eq(devices.orgId, tenantId)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Device', deviceId);
  return rows[0];
}

export async function createDevice(tenantId: string, input: CreateDeviceInput) {
  const [device] = await db
    .insert(devices)
    .values({ ...input, orgId: tenantId })
    .returning();
  return device;
}

export async function updateDevice(tenantId: string, deviceId: string, input: UpdateDeviceInput) {
  const existing = await getDevice(tenantId, deviceId);

  const [updated] = await db
    .update(devices)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(devices.id, existing.id))
    .returning();

  return updated;
}
