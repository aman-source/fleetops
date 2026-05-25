import type { FastifyInstance } from 'fastify';
import { eq, and, lt, gte, lte, desc, inArray } from 'drizzle-orm';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess } from '../../shared/response.js';
import { exportCsv } from '../../shared/csv.js';
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

    // Filter by tenant + annotate stale status
    const annotated = states
      .filter(s => !s.orgId || s.orgId === request.tenantId)
      .map((s) => ({
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

    if (state.orgId && state.orgId !== request.tenantId) {
      return reply.status(404).send({ error: 'Vehicle not found', code: 'NOT_FOUND' });
    }

    return sendSuccess(reply, { ...state, online: !isStale(state.lastSeen) });
  });

  // GET /events — paginated event list from Postgres
  app.get('/events', async (request, reply) => {
    const q = request.query as Record<string, string>;
    if (q.format === 'csv') {
      const query = eventQuerySchema.parse({ ...q, limit: 50000 });
      const conditions = [eq(events.orgId, request.tenantId)];
      if (query.vehicleId) conditions.push(eq(events.vehicleId, query.vehicleId));
      if (query.journeyId) conditions.push(eq(events.journeyId, query.journeyId));
      if (query.eventType) conditions.push(eq(events.eventType, query.eventType));
      if (query.severity) conditions.push(eq(events.severity, query.severity));
      if (query.from) conditions.push(gte(events.recordedAt, new Date(query.from)));
      if (query.to) conditions.push(lte(events.recordedAt, new Date(query.to)));
      const rows = await db.select().from(events).where(and(...conditions)).orderBy(desc(events.recordedAt)).limit(query.limit);
      return exportCsv(reply, ['Event Type', 'Severity', 'Vehicle', 'Driver', 'Lat', 'Lon', 'Recorded At'],
        rows as Record<string, unknown>[],
        'events.csv',
        { 'Event Type': 'eventType', 'Severity': 'severity', 'Vehicle': 'vehicleId', 'Driver': 'driverId', 'Lat': 'lat', 'Lon': 'lon', 'Recorded At': 'recordedAt' });
    }
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

    // Ensure vehicle belongs to tenant
    const [vehicle] = await db.select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.orgId, request.tenantId)))
      .limit(1);
    if (!vehicle) {
      return reply.status(404).send({ error: 'Vehicle not found', code: 'NOT_FOUND' });
    }

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

  // GET /fleet/trails — last 30 min GPS trail for all online vehicles (for map)
  app.get('/fleet/trails', async (request, reply) => {
    const states = await getAllLiveStates();
    if (!states.length) return sendSuccess(reply, []);

    const vehicleIds = states
      .filter(s => !isStale(s.lastSeen) && (!s.orgId || s.orgId === request.tenantId))
      .map(s => s.vehicleId);
    if (!vehicleIds.length) return sendSuccess(reply, []);

    const since = new Date(Date.now() - 30 * 60 * 1000);
    const rows = await db
      .select({ vehicleId: telemetryLogs.vehicleId, lat: telemetryLogs.lat, lon: telemetryLogs.lon, recordedAt: telemetryLogs.recordedAt })
      .from(telemetryLogs)
      .where(and(inArray(telemetryLogs.vehicleId, vehicleIds), gte(telemetryLogs.recordedAt, since)))
      .orderBy(telemetryLogs.recordedAt)
      .limit(vehicleIds.length * 60);

    const grouped = rows.reduce<Record<string, { lat: string | null; lon: string | null; recordedAt: Date }[]>>((acc, r) => {
      if (!acc[r.vehicleId]) acc[r.vehicleId] = [];
      acc[r.vehicleId].push({ lat: r.lat, lon: r.lon, recordedAt: r.recordedAt });
      return acc;
    }, {});

    return sendSuccess(reply, Object.entries(grouped).map(([vehicleId, points]) => ({ vehicleId, points })));
  });

  // GET /ws/stats — WebSocket connection stats (admin only)
  app.get('/ws/stats', async (_request, reply) => {
    return sendSuccess(reply, getWsStats());
  });
}
