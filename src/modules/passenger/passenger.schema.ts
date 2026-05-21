import { z } from 'zod';
import { REQUEST_STATUSES, REQUEST_PRIORITIES, TRIP_TYPES, POOL_STATUSES } from '../../infra/db/schema/passenger.js';

export const createRequestSchema = z.object({
  pickupLocationId: z.string().uuid().optional(),
  dropLocationId: z.string().uuid().optional(),
  pickupName: z.string().optional(),
  dropName: z.string().optional(),
  requestedTime: z.string().datetime(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  tripType: z.enum(TRIP_TYPES).optional(),
  notes: z.string().optional(),
});

export const updateRequestSchema = createRequestSchema.partial();

export const requestQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(REQUEST_STATUSES).optional(),
  userId: z.string().uuid().optional(),
});

export const createPoolSchema = z.object({
  requestIds: z.array(z.string().uuid()).min(1),
  shiftTime: z.string().datetime().optional(),
  pickupArea: z.string().optional(),
  dropArea: z.string().optional(),
});

export const assignPoolSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
});

export const boardingSchema = z.object({
  passengerId: z.string().optional(), // UUID, email, or employee ID depending on method
  method: z.enum(['nfc', 'qr', 'employee_id', 'manual']),
  lat: z.number().optional(),
  lon: z.number().optional(),
  exceptionNote: z.string().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
