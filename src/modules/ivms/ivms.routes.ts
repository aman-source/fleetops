import type { FastifyInstance } from 'fastify';
import { eq, and, lt, gte, lte, desc } from 'drizzle-orm';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess } from '../../shared/response.js';
import { db } from '../../infra/db/client.js';
import { events } from '../../infra/db/schema/events.js';
import { telemetryLogs } from '../../infra/db/schema/telemetry.js';
import { paginationMeta } from '../../shared/pagination.js';
import { getAllLiveStates, getLiveState, getVehiclesInRadius, isStale } from './live-state.js';
import { eventQuerySchema, telemetryQuerySchema, liveQuerySchema } from './ivms.schema.js';
import { getWsStats } from '../../infra/ws/server.js';

export async function ivmsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /fleet/live — all vehicles live positions from Redis
  app.get('/fleet/live', async (request, reply) => {
    const query = liveQuerySchema.parse(request.query);

    let states;
    if (query.lat != null && query.lon != null && query.radiusKm != null) {
      // Geospatial query — vehicles within radius
      const vehicleIds = await getVehiclesInRadius(query.lon, query.lat, query.radiusKm);
      const promises = vehicleIds.map((id) => getLiveState(id));
      const results = await Promise.all(promises);
      states = results.filter(Boolean);
    } else {
      states = await getAllLiveStates();
    }

    // Annotate stale status
    const annotated = states.map((s) => ({
      ...s,
      online: s ? !isStale(s.lastSeen) : false,
    }));

    return sendSuccess(reply, annotated);
  });

  // GET /fleet/live/:vehicleId — single vehicle live state
  app.get('/fleet/live/:vehicleId', async (request, reply) => {
    const { vehicleId } = request.params as { vehicleId: string };
    const state = await getLiveState(vehicleId);

    if (!state) {
      return sendSuccess(reply, { vehicleId, online: false, message: 'No live data' });
    }

    return sendSuccess(reply, { ...state, online: !isStale(state.lastSeen) });
  });

  // GET /events — paginated event list from Postgres
  app.get('/events', async (request, reply) => {
    const query = eventQuerySchema.parse(request.query);
    const conditions = [eq(events.orgId, request.tenantId)];

    if (query.vehicleId) conditions.push(eq(events.vehicleId, query.vehicleId));
    if (query.journeyId) conditions.push(eq(events.journeyId, query.journeyId));
    if (query.eventType) conditions.push(eq(events.eventType, query.eventType));
    if (query.severity) conditions.push(eq(events.severity, query.severity));
    if (query.actionStatus) conditions.push(eq(events.actionStatus, query.actionStatus));
    if (query.from) conditions.push(gte(events.recordedAt, new Date(query.from)));
    if (query.to) conditions.push(lte(events.recordedAt, new Date(query.to)));
    if (query.cursor) conditions.push(lt(events.id, query.cursor));

    const rows = await db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.recordedAt))
      .limit(query.limit);

    return sendSuccess(reply, rows, 200, paginationMeta(rows, query.limit));
  });

  // GET /telemetry/:vehicleId — historical telemetry for a vehicle
  app.get('/telemetry/:vehicleId', async (request, reply) => {
    const { vehicleId } = request.params as { vehicleId: string };
    const query = telemetryQuerySchema.parse(request.query);

    const rows = await db
      .select()
      .from(telemetryLogs)
      .where(and(
        eq(telemetryLogs.vehicleId, vehicleId),
        gte(telemetryLogs.recordedAt, new Date(query.from)),
        lte(telemetryLogs.recordedAt, new Date(query.to)),
      ))
      .orderBy(telemetryLogs.recordedAt)
      .limit(query.limit);

    return sendSuccess(reply, rows);
  });

  // GET /ws/stats — WebSocket connection stats (admin only)
  app.get('/ws/stats', async (_request, reply) => {
    return sendSuccess(reply, getWsStats());
  });
}
