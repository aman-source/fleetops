import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.js';
import { exportCsv } from '../../shared/csv.js';
import {
  createRequestSchema, updateRequestSchema, requestQuerySchema,
  createPoolSchema, assignPoolSchema, boardingSchema,
} from './passenger.schema.js';
import * as service from './passenger.service.js';

export async function passengerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /passenger/requests
  app.get('/passenger/requests', async (request, reply) => {
    const q = request.query as Record<string, string>;
    if (q.format === 'csv') {
      const query = requestQuerySchema.parse({ ...q, limit: 50000 });
      const result = await service.listRequests(request.tenantId, query);
      return exportCsv(reply, ['Request No', 'Passenger', 'Status', 'Pickup Location', 'Destination', 'Requested For'],
        result.items as Record<string, unknown>[],
        'passenger-requests.csv',
        { 'Request No': 'requestNo', 'Passenger': 'passengerId', 'Status': 'status', 'Pickup Location': 'pickupLocation', 'Destination': 'destination', 'Requested For': 'requestedFor' });
    }
    const query = requestQuerySchema.parse(request.query);
    const result = await service.listRequests(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  // GET /passenger/requests/:id
  app.get('/passenger/requests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await service.getRequest(request.tenantId, id);
    return sendSuccess(reply, req);
  });

  // POST /passenger/requests
  app.post('/passenger/requests', { preHandler: [authorize('passenger:request')] }, async (request, reply) => {
    const input = createRequestSchema.parse(request.body);
    const req = await service.createRequest(request.tenantId, request.user.sub, input);
    return sendCreated(reply, req);
  });

  // PATCH /passenger/requests/:id
  app.patch('/passenger/requests/:id', { preHandler: [authorize('passenger:request')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateRequestSchema.parse(request.body);
    const req = await service.updateRequest(request.tenantId, id, request.user.sub, input);
    return sendSuccess(reply, req);
  });

  // DELETE /passenger/requests/:id
  app.delete('/passenger/requests/:id', { preHandler: [authorize('passenger:request')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.cancelRequest(request.tenantId, id, request.user.sub);
    return sendNoContent(reply);
  });

  // GET /passenger/pools
  app.get('/passenger/pools', { preHandler: [authorize('passenger:pool')] }, async (request, reply) => {
    const pools = await service.listPools(request.tenantId);
    return sendSuccess(reply, pools);
  });

  // POST /passenger/pools
  app.post('/passenger/pools', { preHandler: [authorize('passenger:pool')] }, async (request, reply) => {
    const input = createPoolSchema.parse(request.body);
    const pool = await service.createPool(request.tenantId, request.user.sub, input);
    return sendCreated(reply, pool);
  });

  // POST /passenger/pools/:id/assign
  app.post('/passenger/pools/:id/assign', { preHandler: [authorize('passenger:pool')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = assignPoolSchema.parse(request.body);
    const pool = await service.assignPool(request.tenantId, id, input);
    return sendSuccess(reply, pool);
  });

  // POST /passenger/pools/auto-build — auto-pool all approved un-pooled requests
  app.post('/passenger/pools/auto-build', { preHandler: [authorize('passenger:pool')] }, async (request, reply) => {
    const pools = await service.autoPool(request.tenantId);
    // Return first pool with requests for API consumers; also include all pool IDs
    const firstPool = pools[0] ?? null;
    return sendSuccess(reply, firstPool
      ? { id: firstPool.id, requests: firstPool.requests, created: pools.length, pools: pools.map(p => p.id) }
      : { id: null, requests: [], created: 0, pools: [] });
  });

  // POST /passenger/boarding/:journeyId
  app.post('/passenger/boarding/:journeyId', { preHandler: [authorize('passenger:request')] }, async (request, reply) => {
    const { journeyId } = request.params as { journeyId: string };
    const input = boardingSchema.parse(request.body);
    const event = await service.recordBoarding(request.tenantId, journeyId, input);
    return sendCreated(reply, event);
  });
}
