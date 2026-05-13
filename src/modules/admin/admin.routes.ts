import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import * as service from './admin.service.js';

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /admin/workflows
  app.get('/admin/workflows', { preHandler: [authorize('workflow:read')] }, async (request, reply) => {
    const workflows = await service.listWorkflows(request.tenantId);
    return sendSuccess(reply, workflows);
  });

  // GET /admin/workflows/:id
  app.get('/admin/workflows/:id', { preHandler: [authorize('workflow:read')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const wf = await service.getWorkflow(request.tenantId, id);
    const versions = await service.getWorkflowVersions(request.tenantId, id);
    return sendSuccess(reply, { workflow: wf, versions });
  });

  // POST /admin/workflows
  app.post('/admin/workflows', { preHandler: [authorize('*')] }, async (request, reply) => {
    const input = z.object({
      name: z.string().min(1),
      key: z.string().min(1).regex(/^[A-Z0-9-]+$/, 'Key must be uppercase with hyphens'),
    }).parse(request.body);

    const wf = await service.createWorkflow(request.tenantId, input);
    return sendCreated(reply, wf);
  });

  // PUT /admin/workflows/:id/draft
  app.put('/admin/workflows/:id/draft', { preHandler: [authorize('*')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const draft = z.object({
      nodes: z.array(z.object({
        id: z.string(),
        type: z.string(),
        config: z.record(z.unknown()),
        position: z.object({ x: z.number(), y: z.number() }),
      })),
      edges: z.array(z.object({
        from: z.string(),
        to: z.string(),
        condition: z.string().optional(),
      })),
    }).parse(request.body);

    const version = await service.saveDraft(request.tenantId, id, draft);
    return sendSuccess(reply, version);
  });

  // POST /admin/workflows/:id/publish
  app.post('/admin/workflows/:id/publish', { preHandler: [authorize('*')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const version = await service.publishWorkflow(request.tenantId, id, request.user.sub);
    return sendSuccess(reply, version);
  });
}
