import { z } from 'zod';
import { INCIDENT_STATUSES } from '../../infra/db/schema/hse.js';

export const incidentQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(INCIDENT_STATUSES).optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  tier: z.coerce.number().int().min(1).max(3).optional(),
});

export const completeStepSchema = z.object({
  notes: z.string().optional(),
});

export const closeIncidentSchema = z.object({
  closureReport: z.string().min(1),
});

export const driverScoreQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  period: z.string().optional(), // '2026-05'
  sortBy: z.enum(['totalScore', 'overspeedCount', 'incidentCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
