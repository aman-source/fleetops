import { z } from 'zod';

export const createJobSchema = z.object({
  jobType: z.enum(['delivery', 'pickup', 'service', 'inspection', 'survey', 'maintenance']),
  purpose: z.string().min(1).optional(),
  workOrderRef: z.string().optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLon: z.number().min(-180).max(180).optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
});

export const updateJobSchema = z.object({
  jobType: z.enum(['delivery', 'pickup', 'service', 'inspection', 'survey', 'maintenance']).optional(),
  purpose: z.string().min(1).optional(),
  workOrderRef: z.string().optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLon: z.number().min(-180).max(180).optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
});

export const assignJourneySchema = z.object({
  journeyId: z.string().uuid(),
});

export const addWaypointSchema = z.object({
  sequence: z.number().int().positive(),
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  plannedArrival: z.string().datetime().optional(),
  proofType: z.enum(['signature', 'photo', 'nfc_scan', 'none']).default('none'),
  notes: z.string().optional(),
});

export const completeWaypointSchema = z.object({
  deviceLat: z.number().min(-90).max(90).optional(),
  deviceLon: z.number().min(-180).max(180).optional(),
  notes: z.string().optional(),
});

export const jobQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  journeyId: z.string().uuid().optional(),
  jobType: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type AddWaypointInput = z.infer<typeof addWaypointSchema>;
export type CompleteWaypointInput = z.infer<typeof completeWaypointSchema>;
