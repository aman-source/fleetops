import type { FastifyInstance } from 'fastify';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.js';
import { exportCsv } from '../../shared/csv.js';
import { db } from '../../infra/db/client.js';
import { journeys, journeyWaypoints } from '../../infra/db/schema/journeys.js';
import {
  createJourneySchema, updateJourneySchema, journeyQuerySchema,
  rejectSchema, addPassengerSchema,
} from './journey.schema.js';
import * as service from './journey.service.js';

export async function journeyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /journeys
  app.get('/journeys', async (request, reply) => {
    const q = request.query as Record<string, string>;
    if (q.format === 'csv') {
      const query = journeyQuerySchema.parse({ ...q, limit: 50000 });
      const result = await service.listJourneys(request.tenantId, query);
      return exportCsv(reply, ['Journey No', 'Status', 'Vehicle', 'Driver', 'Planned Departure', 'Risk Level'],
        result.items as Record<string, unknown>[],
        'journeys.csv',
        { 'Journey No': 'journeyNo', 'Status': 'status', 'Vehicle': 'vehicleId', 'Driver': 'driverId', 'Planned Departure': 'plannedDeparture', 'Risk Level': 'riskLevel' });
    }
    const query = journeyQuerySchema.parse(request.query);
    const result = await service.listJourneys(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  // GET /journeys/:id
  app.get('/journeys/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const journey = await service.getJourney(request.tenantId, id);
    return sendSuccess(reply, journey);
  });

  // POST /journeys
  app.post('/journeys', { preHandler: [authorize('journey:create')] }, async (request, reply) => {
    const input = createJourneySchema.parse(request.body);
    const journey = await service.createJourney(request.tenantId, request.user.sub, input);
    return sendCreated(reply, journey);
  });

  // PATCH /journeys/:id
  app.patch('/journeys/:id', { preHandler: [authorize('journey:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateJourneySchema.parse(request.body);
    const journey = await service.updateJourney(request.tenantId, id, input);
    return sendSuccess(reply, journey);
  });

  // GET /journeys/:id/gates — evaluate all 6 Go/No-Go gates
  app.get('/journeys/:id/gates', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gates = await service.evaluateGates(request.tenantId, id);
    return sendSuccess(reply, gates);
  });

  // POST /journeys/:id/submit — submit for approval (RE-VALIDATES ALL GATES)
  app.post('/journeys/:id/submit', { preHandler: [authorize('journey:submit')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.submitJourney(request.tenantId, id, request.user.sub);
    return sendSuccess(reply, result.journey);
  });

  // POST /journeys/:id/approve
  app.post('/journeys/:id/approve', { preHandler: [authorize('journey:approve')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const journey = await service.approveJourney(request.tenantId, id, request.user.sub, request.user.role);
    return sendSuccess(reply, journey);
  });

  // POST /journeys/:id/reject
  app.post('/journeys/:id/reject', { preHandler: [authorize('journey:approve')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = rejectSchema.parse(request.body);
    const journey = await service.rejectJourney(request.tenantId, id, request.user.sub, reason);
    return sendSuccess(reply, journey);
  });

  // POST /journeys/:id/activate — driver starts trip
  app.post('/journeys/:id/activate', { preHandler: [authorize('journey:activate')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const journey = await service.activateJourney(request.tenantId, id);
    return sendSuccess(reply, journey);
  });

  // POST /journeys/:id/close
  app.post('/journeys/:id/close', async (request, reply) => {
    const { id } = request.params as { id: string };
    const journey = await service.closeJourney(request.tenantId, id, request.user.sub);
    return sendSuccess(reply, journey);
  });

  // GET /journeys/:id/approvals
  app.get('/journeys/:id/approvals', async (request, reply) => {
    const { id } = request.params as { id: string };
    const approvals = await service.getApprovals(request.tenantId, id);
    return sendSuccess(reply, approvals);
  });

  // GET /journeys/:id/passengers
  app.get('/journeys/:id/passengers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const passengers = await service.getPassengers(request.tenantId, id);
    return sendSuccess(reply, passengers);
  });

  // POST /journeys/:id/passengers
  app.post('/journeys/:id/passengers', { preHandler: [authorize('journey:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = addPassengerSchema.parse(request.body);
    const pax = await service.addPassenger(request.tenantId, id, input);
    return sendCreated(reply, pax);
  });

  // DELETE /journeys/:id/passengers/:paxId
  app.delete('/journeys/:id/passengers/:paxId', { preHandler: [authorize('journey:update')] }, async (request, reply) => {
    const { id, paxId } = request.params as { id: string; paxId: string };
    await service.removePassenger(request.tenantId, id, paxId);
    return sendNoContent(reply);
  });

  // GET /journeys/map-data — active journeys with waypoints for map display
  app.get('/journeys/map-data', async (request, reply) => {
    const activeJourneys = await db
      .select({ id: journeys.id, journeyNo: journeys.journeyNo, status: journeys.status, vehicleId: journeys.vehicleId, directionsRoute: journeys.directionsRoute })
      .from(journeys)
      .where(and(
        eq(journeys.orgId, request.tenantId),
        inArray(journeys.status, ['active', 'approved', 'delayed', 'deviated', 'emergency']),
        isNull(journeys.deletedAt),
      ))
      .limit(200);

    if (!activeJourneys.length) return sendSuccess(reply, []);

    const journeyIds = activeJourneys.map(j => j.id);
    const wpRows = await db
      .select({ journeyId: journeyWaypoints.journeyId, sequence: journeyWaypoints.sequence, name: journeyWaypoints.name, lat: journeyWaypoints.lat, lon: journeyWaypoints.lon })
      .from(journeyWaypoints)
      .where(inArray(journeyWaypoints.journeyId, journeyIds))
      .orderBy(journeyWaypoints.journeyId, journeyWaypoints.sequence);

    const wpByJourney = wpRows.reduce<Record<string, typeof wpRows>>((acc, wp) => {
      if (!acc[wp.journeyId]) acc[wp.journeyId] = [];
      acc[wp.journeyId].push(wp);
      return acc;
    }, {});

    return sendSuccess(reply, activeJourneys.map(j => ({
      id: j.id,
      journeyNo: j.journeyNo,
      status: j.status,
      vehicleId: j.vehicleId,
      directionsRoute: j.directionsRoute ?? null,
      waypoints: (wpByJourney[j.id] ?? []).map(wp => ({ sequence: wp.sequence, name: wp.name, lat: Number(wp.lat), lon: Number(wp.lon) })),
    })));
  });
}
