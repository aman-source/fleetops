import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.js';
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
    return sendSuccess(reply, result);
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
}
