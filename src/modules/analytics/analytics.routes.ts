import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess } from '../../shared/response.js';
import * as service from './analytics.service.js';

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /analytics/kpis
  app.get('/analytics/kpis', { preHandler: [authorize('analytics:read')] }, async (request, reply) => {
    const query = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    }).parse(request.query);

    const kpis = await service.getKPIs(request.tenantId, query.from, query.to);
    return sendSuccess(reply, kpis);
  });

  // GET /analytics/fleet-readiness
  app.get('/analytics/fleet-readiness', async (request, reply) => {
    const data = await service.getFleetReadiness(request.tenantId);
    return sendSuccess(reply, data);
  });

  // GET /analytics/journeys
  app.get('/analytics/journeys', async (request, reply) => {
    const query = z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }).parse(request.query);

    const data = await service.getJourneyStats(request.tenantId, query.from, query.to);
    return sendSuccess(reply, data);
  });
}
