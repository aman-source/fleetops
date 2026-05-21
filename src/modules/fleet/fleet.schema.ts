import { z } from 'zod';
import { VEHICLE_STATUSES, VEHICLE_TYPES } from '../../infra/db/schema/vehicles.js';
import { DRIVER_STATUSES, LICENSE_CLASSES } from '../../infra/db/schema/drivers.js';
import { DEVICE_TYPES } from '../../infra/db/schema/devices.js';

// Oman plate format: 12-A-3471
const plateRegex = /^\d{1,2}-[A-Z]-\d{3,4}$/;
const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
const nfcRegex = /^[0-9A-F]{2}(:[0-9A-F]{2}){3,6}$/i;

// ── Vehicle ──
export const createVehicleSchema = z.object({
  plateNo: z.string().regex(plateRegex, 'Oman plate format: 12-A-3471'),
  fleetNo: z.string().optional(),
  vin: z.string().regex(vinRegex, 'VIN must be 17 chars, no I/O/Q').optional(),
  engineNo: z.string().optional(),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1990).max(2030),
  type: z.enum(VEHICLE_TYPES),
  seatCount: z.number().int().min(1).max(60),
  owner: z.string().optional(),
  projectId: z.string().uuid().optional(),
  baseLocation: z.string().optional(),
  odometer: z.number().int().min(0).optional(),
  engineHours: z.number().int().min(0).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const updateVehicleStatusSchema = z.object({
  status: z.enum(VEHICLE_STATUSES),
  conditionalExpiry: z.string().datetime().optional(),
  reason: z.string().min(1),
});

// ── Driver ──
export const createDriverSchema = z.object({
  employeeId: z.string().optional(),
  name: z.string().min(1),
  licenseNo: z.string().min(1),
  licenseClass: z.enum(LICENSE_CLASSES),
  licenseExpiry: z.string().date(),
  ddcExpiry: z.string().date().optional(),
  medicalExpiry: z.string().date().optional(),
  authorizedTypes: z.array(z.enum(VEHICLE_TYPES)).optional(),
});

export const updateDriverSchema = createDriverSchema.partial();

export const assignNfcSchema = z.object({
  nfcCardUid: z.string().regex(nfcRegex, 'NFC UID format: 04:E2:1F:8B'),
});

// ── Device ──
export const createDeviceSchema = z.object({
  type: z.enum(DEVICE_TYPES),
  serialNo: z.string().min(1),
  imei: z.string().optional(),
  simNo: z.string().optional(),
  apn: z.string().optional(),
  vehicleId: z.string().uuid().optional(),
  firmware: z.string().optional(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

// ── Query ──
export const vehicleQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50000).default(25),
  status: z.enum(VEHICLE_STATUSES).optional(),
  type: z.enum(VEHICLE_TYPES).optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const driverQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(DRIVER_STATUSES).optional(),
  search: z.string().optional(),
});

export const deviceQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  type: z.enum(DEVICE_TYPES).optional(),
  vehicleId: z.string().uuid().optional(),
  healthStatus: z.string().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type UpdateVehicleStatusInput = z.infer<typeof updateVehicleStatusSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
