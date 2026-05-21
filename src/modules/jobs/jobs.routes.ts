import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.js';
import {
  createJobSchema, updateJobSchema, addWaypointSchema, completeWaypointSchema,
  assignJourneySchema, jobQuerySchema,
} from './jobs.schema.js';
import * as service from './jobs.service.js';

export async function jobRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  app.get('/jobs', async (request, reply) => {
    const query = jobQuerySchema.parse(request.query);
    const result = await service.listJobs(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.post('/jobs', { preHandler: [authorize('job:create')] }, async (request, reply) => {
    const input = createJobSchema.parse(request.body);
    const job = await service.createJob(request.tenantId, request.user.sub, input);
    return sendCreated(reply, job);
  });

  app.get('/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await service.getJob(request.tenantId, id);
    return sendSuccess(reply, job);
  });

  app.patch('/jobs/:id', { preHandler: [authorize('job:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateJobSchema.parse(request.body);
    const job = await service.updateJob(request.tenantId, id, input);
    return sendSuccess(reply, job);
  });

  app.post('/jobs/:id/assign-journey', { preHandler: [authorize('job:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { journeyId } = assignJourneySchema.parse(request.body);
    const job = await service.assignJourney(request.tenantId, id, journeyId);
    return sendSuccess(reply, job);
  });

  app.post('/jobs/:id/waypoints', { preHandler: [authorize('job:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = addWaypointSchema.parse(request.body);
    const wp = await service.addWaypoint(request.tenantId, id, input);
    return sendCreated(reply, wp);
  });

  app.post('/jobs/:id/waypoints/:wpId/complete', { preHandler: [authorize('job:complete')] }, async (request, reply) => {
    const { id, wpId } = request.params as { id: string; wpId: string };
    const input = completeWaypointSchema.parse(request.body);

    // Optional file upload
    let file: { buffer: Buffer; mimetype: string; filename: string } | undefined;
    if (request.isMultipart()) {
      const data = await request.file();
      if (data) {
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) chunks.push(chunk);
        file = { buffer: Buffer.concat(chunks), mimetype: data.mimetype, filename: data.filename };
      }
    }

    const job = await service.completeWaypoint(request.tenantId, id, wpId, request.user.sub, input, file);
    return sendSuccess(reply, job);
  });

  app.post('/jobs/:id/close', { preHandler: [authorize('job:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await service.closeJob(request.tenantId, id);
    return sendSuccess(reply, job);
  });
}
