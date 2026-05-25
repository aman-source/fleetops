import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/response.js';
import * as service from './reports.service.js';
import { REPORT_TYPES } from '../../infra/db/schema/reports.js';

const requestReportSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  params: z.record(z.unknown()).optional(),
});

const createScheduledSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  cronExpression: z.string().min(9), // at minimum '* * * * *'
  params: z.record(z.unknown()).optional(),
  recipientUserIds: z.array(z.string().uuid()).optional(),
});

const updateScheduledSchema = z.object({
  cronExpression: z.string().min(9).optional(),
  enabled: z.boolean().optional(),
  params: z.record(z.unknown()).optional(),
  recipientUserIds: z.array(z.string().uuid()).optional(),
});

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // POST /reports — request on-demand PDF report
  app.post('/reports', { preHandler: [authorize('analytics:write')] }, async (request, reply) => {
    const input = requestReportSchema.parse(request.body);
    const report = await service.requestReport(request.tenantId, request.user.sub, input.reportType, input.params ?? {});
    return sendCreated(reply, report);
  });

  // GET /reports — list reports
  app.get('/reports', async (request, reply) => {
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(100).default(25) }).parse(request.query);
    const items = await service.listReports(request.tenantId, limit);
    return sendSuccess(reply, items);
  });

  // GET /reports/:id — get report status
  app.get('/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await service.getReport(request.tenantId, id);
    return sendSuccess(reply, report);
  });

  // GET /reports/:id/download — presigned download URL
  app.get('/reports/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const url = await service.getReportDownloadUrl(request.tenantId, id);
    return sendSuccess(reply, { url });
  });

  // ─── Scheduled Reports ────────────────────────────────────────────────────

  // POST /reports/scheduled
  app.post('/reports/scheduled', { preHandler: [authorize('analytics:write')] }, async (request, reply) => {
    const input = createScheduledSchema.parse(request.body);
    const sr = await service.createScheduledReport(request.tenantId, request.user.sub, input);
    return sendCreated(reply, sr);
  });

  // GET /reports/scheduled
  app.get('/reports/scheduled', async (request, reply) => {
    const items = await service.listScheduledReports(request.tenantId);
    return sendSuccess(reply, items);
  });

  // PATCH /reports/scheduled/:id
  app.patch('/reports/scheduled/:id', { preHandler: [authorize('analytics:write')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateScheduledSchema.parse(request.body);
    const sr = await service.updateScheduledReport(request.tenantId, id, input);
    return sendSuccess(reply, sr);
  });

  // DELETE /reports/scheduled/:id
  app.delete('/reports/scheduled/:id', { preHandler: [authorize('analytics:write')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteScheduledReport(request.tenantId, id);
    return sendNoContent(reply);
  });
}
