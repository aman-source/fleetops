import { z } from 'zod';
import { JOURNEY_STATUSES } from '../../infra/db/schema/journeys.js';

export const createJourneySchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  purpose: z.string().optional(),
  plannedDeparture: z.string().datetime(),
  plannedArrival: z.string().datetime(),
  emergencyContact: z.string().optional(),
  waypoints: z.array(z.object({
    sequence: z.number().int().min(1),
    name: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    plannedArrival: z.string().datetime().optional(),
  })).optional(),
  passengers: z.array(z.object({
    passengerName: z.string().min(1),
    employeeId: z.string().optional(),
    department: z.string().optional(),
    pickupPoint: z.string().optional(),
  })).optional(),
});

export const updateJourneySchema = z.object({
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  purpose: z.string().optional(),
  plannedDeparture: z.string().datetime().optional(),
  plannedArrival: z.string().datetime().optional(),
  emergencyContact: z.string().optional(),
});

export const journeyQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(JOURNEY_STATUSES).optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const rejectSchema = z.object({
  reason: z.string().min(1),
});

export const addPassengerSchema = z.object({
  passengerName: z.string().min(1),
  passengerId: z.string().uuid().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  pickupPoint: z.string().optional(),
});

export type CreateJourneyInput = z.infer<typeof createJourneySchema>;
export type UpdateJourneyInput = z.infer<typeof updateJourneySchema>;
