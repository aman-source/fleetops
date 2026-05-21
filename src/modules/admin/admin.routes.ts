import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import * as service from './admin.service.js';
import * as checklistService from './checklists.service.js';
import { listExecutions, resumeApproval } from '../workflows/executor.js';
import { runRetentionPolicies } from './retention.service.js';

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

  // GET /admin/workflow-executions
  app.get('/admin/workflow-executions', { preHandler: [authorize('workflow:read')] }, async (request, reply) => {
    const query = z.object({
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
    }).parse(request.query);
    const executions = await listExecutions(request.tenantId, query.entityType, query.entityId);
    return sendSuccess(reply, executions);
  });

  // POST /admin/workflow-executions/:id/approve
  app.post('/admin/workflow-executions/:id/approve', { preHandler: [authorize('journey:approve')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ approved: z.boolean(), reason: z.string().optional() }).parse(request.body);
    await resumeApproval(id, request.user.sub, body.approved, body.reason);
    return sendSuccess(reply, { ok: true });
  });

  // ── Checklist Templates ──

  // GET /admin/checklist-templates
  app.get('/admin/checklist-templates', { preHandler: [authorize('admin:read')] }, async (request, reply) => {
    const templates = await checklistService.listTemplates(request.tenantId);
    return sendSuccess(reply, templates);
  });

  // GET /admin/checklist-templates/:id
  app.get('/admin/checklist-templates/:id', { preHandler: [authorize('admin:read')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await checklistService.getTemplate(request.tenantId, id);
    return sendSuccess(reply, template);
  });

  // POST /admin/checklist-templates
  app.post('/admin/checklist-templates', { preHandler: [authorize('admin:write')] }, async (request, reply) => {
    const body = z.object({ name: z.string().min(1), projectId: z.string().uuid().optional() }).parse(request.body);
    const template = await checklistService.createTemplate(request.tenantId, request.user.sub, body);
    return sendCreated(reply, template);
  });

  // PUT /admin/checklist-templates/:id
  app.put('/admin/checklist-templates/:id', { preHandler: [authorize('admin:write')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      items: z.array(z.object({
        stepNumber: z.number().int().positive(),
        category: z.string().min(1),
        label: z.string().min(1),
        description: z.string().optional(),
        requiresPhoto: z.boolean().optional(),
        isCritical: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })).optional(),
    }).parse(request.body);
    const template = await checklistService.updateTemplate(request.tenantId, id, body);
    return sendSuccess(reply, template);
  });

  // POST /admin/checklist-templates/:id/publish
  app.post('/admin/checklist-templates/:id/publish', { preHandler: [authorize('admin:write')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const template = await checklistService.publishTemplate(request.tenantId, id);
    return sendSuccess(reply, template);
  });

  // POST /admin/retention/run — manually trigger retention (superadmin only)
  app.post('/admin/retention/run', { preHandler: [authorize('*')] }, async (request, reply) => {
    const results = await runRetentionPolicies(request.server.log);
    return sendSuccess(reply, { results });
  });
}
