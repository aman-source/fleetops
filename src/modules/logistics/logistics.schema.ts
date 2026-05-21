import { z } from 'zod';

export const createSegmentSchema = z.object({
  journeyId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  sequence: z.number().int().positive().default(1),
  materialRef: z.string().optional(),
  materialDescription: z.string().min(1),
  quantity: z.number().positive().optional(),
  uom: z.string().optional(),
  loadingLat: z.number().min(-90).max(90).optional(),
  loadingLon: z.number().min(-180).max(180).optional(),
  notes: z.string().optional(),
});

export const updateSegmentSchema = z.object({
  materialDescription: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  uom: z.string().optional(),
  notes: z.string().optional(),
});

export const loadSchema = z.object({
  loadingLat: z.number().min(-90).max(90).optional(),
  loadingLon: z.number().min(-180).max(180).optional(),
  notes: z.string().optional(),
});

export const unloadSchema = z.object({
  unloadingLat: z.number().min(-90).max(90).optional(),
  unloadingLon: z.number().min(-180).max(180).optional(),
  notes: z.string().optional(),
});

export const segmentQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  journeyId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
});

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
export type UpdateSegmentInput = z.infer<typeof updateSegmentSchema>;
export type LoadInput = z.infer<typeof loadSchema>;
export type UnloadInput = z.infer<typeof unloadSchema>;
