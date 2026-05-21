import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import {
  createCampaignSchema, campaignQuerySchema, updateAssignmentSchema, submitAssignmentSchema,
} from './inspections.schema.js';
import * as service from './inspections.service.js';

export async function inspectionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  app.get('/inspections/campaigns', async (request, reply) => {
    const query = campaignQuerySchema.parse(request.query);
    const result = await service.listCampaigns(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.post('/inspections/campaigns', { preHandler: [authorize('inspection:create')] }, async (request, reply) => {
    const input = createCampaignSchema.parse(request.body);
    const campaign = await service.createCampaign(request.tenantId, request.user.sub, request.user.role ?? '', input);
    return sendCreated(reply, campaign);
  });

  app.post('/inspections/campaigns/:id/schedule', { preHandler: [authorize('inspection:create')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await service.scheduleCampaign(request.tenantId, id);
    return sendSuccess(reply, campaign);
  });

  app.post('/inspections/campaigns/:id/activate', { preHandler: [authorize('inspection:create')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await service.activateCampaign(request.tenantId, id);
    return sendSuccess(reply, campaign);
  });

  app.get('/inspections/campaigns/:id/assignments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const assignments = await service.listAssignments(request.tenantId, id);
    return sendSuccess(reply, assignments);
  });

  app.patch('/inspections/assignments/:id', { preHandler: [authorize('inspection:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateAssignmentSchema.parse(request.body);
    const assignment = await service.updateAssignment(request.tenantId, id, input);
    return sendSuccess(reply, assignment);
  });

  app.post('/inspections/assignments/:id/submit', { preHandler: [authorize('inspection:complete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = submitAssignmentSchema.parse(request.body);
    const assignment = await service.submitAssignment(request.tenantId, id, input);
    return sendSuccess(reply, assignment);
  });

  app.get('/inspections/campaigns/:id/report', async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await service.getCampaignReport(request.tenantId, id);
    return sendSuccess(reply, report);
  });
}
