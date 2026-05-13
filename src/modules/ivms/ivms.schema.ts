import { z } from 'zod';
import { EVENT_TYPES, EVENT_SEVERITIES, EVENT_ACTION_STATUSES } from '../../infra/db/schema/events.js';

export const eventQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  vehicleId: z.string().uuid().optional(),
  journeyId: z.string().uuid().optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  severity: z.enum(EVENT_SEVERITIES).optional(),
  actionStatus: z.enum(EVENT_ACTION_STATUSES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const telemetryQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  limit: z.coerce.number().int().min(1).max(5000).default(1000),
});

export const liveQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional(),
});
