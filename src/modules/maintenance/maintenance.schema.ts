import { z } from 'zod';
import { WO_ISSUE_TYPES, WO_PRIORITIES, WO_STATUSES, RELEASE_DECISIONS, TIRE_STATUSES } from '../../infra/db/schema/maintenance.js';

// ── Work Orders ──
export const createWOSchema = z.object({
  vehicleId: z.string().uuid(),
  issueType: z.enum(WO_ISSUE_TYPES),
  priority: z.enum(WO_PRIORITIES).optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  bay: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  odometerAt: z.number().int().min(0).optional(),
  engineHoursAt: z.number().int().min(0).optional(),
  targetHours: z.number().min(0).optional(),
});

export const updateWOSchema = z.object({
  priority: z.enum(WO_PRIORITIES).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  bay: z.string().optional(),
  technicianId: z.string().uuid().optional(),
  status: z.enum(WO_STATUSES).optional(),
});

export const releaseSchema = z.object({
  decision: z.enum(RELEASE_DECISIONS),
  reason: z.string().min(1),
  releaseExpiry: z.string().datetime().optional(), // required for 'conditional'
});

export const woQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(WO_STATUSES).optional(),
  vehicleId: z.string().uuid().optional(),
  priority: z.enum(WO_PRIORITIES).optional(),
  issueType: z.enum(WO_ISSUE_TYPES).optional(),
});

// ── Parts ──
export const addPartSchema = z.object({
  partNumber: z.string().min(1),
  partName: z.string().min(1),
  oemAftermarket: z.enum(['oem', 'aftermarket']).optional(),
  supplier: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  warrantyMonths: z.number().int().min(0).optional(),
  oldPartDisposed: z.boolean().optional(),
  costBaisa: z.number().int().min(0).optional(),
});

// ── Tires ──
export const createTireSchema = z.object({
  serialNo: z.string().min(1),
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  vehicleId: z.string().uuid().optional(),
  axlePosition: z.string().optional(),
  installDate: z.string().date().optional(),
  installOdometer: z.number().int().min(0).optional(),
  treadDepthMm: z.number().min(0).optional(),
  pressurePsi: z.number().min(0).optional(),
});

export const updateTireSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  axlePosition: z.string().optional(),
  treadDepthMm: z.number().min(0).optional(),
  pressurePsi: z.number().min(0).optional(),
  status: z.enum(TIRE_STATUSES).optional(),
  disposalReason: z.string().optional(),
});

export const tireQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  vehicleId: z.string().uuid().optional(),
  status: z.enum(TIRE_STATUSES).optional(),
});

export type CreateWOInput = z.infer<typeof createWOSchema>;
export type UpdateWOInput = z.infer<typeof updateWOSchema>;
export type ReleaseInput = z.infer<typeof releaseSchema>;
export type AddPartInput = z.infer<typeof addPartSchema>;
export type CreateTireInput = z.infer<typeof createTireSchema>;
export type UpdateTireInput = z.infer<typeof updateTireSchema>;
