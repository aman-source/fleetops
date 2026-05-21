import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import { exportCsv } from '../../shared/csv.js';
import {
  createWOSchema, updateWOSchema, releaseSchema, woQuerySchema,
  addPartSchema, createTireSchema, updateTireSchema, tireQuerySchema,
} from './maintenance.schema.js';
import * as service from './maintenance.service.js';

export async function maintenanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // ═══════════════════════════════════════
  // WORK ORDERS
  // ═══════════════════════════════════════

  app.get('/work-orders', async (request, reply) => {
    const q = request.query as Record<string, string>;
    if (q.format === 'csv') {
      const query = woQuerySchema.parse({ ...q, limit: 50000 });
      const result = await service.listWorkOrders(request.tenantId, query);
      return exportCsv(reply, ['WO No', 'Vehicle', 'Type', 'Status', 'Priority', 'Assigned To', 'Created At'],
        result.items as Record<string, unknown>[],
        'work-orders.csv',
        { 'WO No': 'woNo', 'Vehicle': 'vehicleId', 'Type': 'type', 'Status': 'status', 'Priority': 'priority', 'Assigned To': 'assignedTo', 'Created At': 'createdAt' });
    }
    const query = woQuerySchema.parse(request.query);
    const result = await service.listWorkOrders(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.get('/work-orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const wo = await service.getWorkOrder(request.tenantId, id);
    return sendSuccess(reply, wo);
  });

  app.post('/work-orders', { preHandler: [authorize('maintenance:create')] }, async (request, reply) => {
    const input = createWOSchema.parse(request.body);
    const wo = await service.createWorkOrder(request.tenantId, request.user.sub, input);
    return sendCreated(reply, wo);
  });

  app.patch('/work-orders/:id', { preHandler: [authorize('maintenance:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateWOSchema.parse(request.body);
    const wo = await service.updateWorkOrder(request.tenantId, id, request.user.sub, input);
    return sendSuccess(reply, wo);
  });

  // POST /work-orders/:id/release — GO / CONDITIONAL / NO-GO
  app.post('/work-orders/:id/release', { preHandler: [authorize('maintenance:release')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = releaseSchema.parse(request.body);
    const wo = await service.releaseVehicle(request.tenantId, id, request.user.sub, input);
    return sendSuccess(reply, wo);
  });

  // POST /work-orders/:id/hse-approve
  app.post('/work-orders/:id/hse-approve', { preHandler: [authorize('hse:approve')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const wo = await service.hseApprove(request.tenantId, id, request.user.sub);
    return sendSuccess(reply, wo);
  });

  // POST /work-orders/:id/parts
  app.post('/work-orders/:id/parts', { preHandler: [authorize('maintenance:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = addPartSchema.parse(request.body);
    const part = await service.addPart(request.tenantId, id, request.user.sub, input);
    return sendCreated(reply, part);
  });

  // POST /work-orders/:id/photos
  app.post('/work-orders/:id/photos', { preHandler: [authorize('maintenance:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parts = request.parts();
    let label: string | undefined;
    let file: { buffer: Buffer; mimetype: string; filename: string } | undefined;

    for await (const part of parts as any) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        file = { buffer: Buffer.concat(chunks), mimetype: part.mimetype, filename: part.filename };
      } else if (part.fieldname === 'label') {
        label = part.value;
      }
    }

    if (!file) {
      return reply.status(400).send({ error: 'File required', code: 'FILE_REQUIRED' });
    }

    const photo = await service.addPhoto(request.tenantId, id, request.user.sub, label, file);
    return sendCreated(reply, photo);
  });

  // GET /work-orders/:id/activity
  app.get('/work-orders/:id/activity', async (request, reply) => {
    const { id } = request.params as { id: string };
    const activity = await service.getActivity(request.tenantId, id);
    return sendSuccess(reply, activity);
  });

  // ═══════════════════════════════════════
  // TIRES
  // ═══════════════════════════════════════

  app.get('/tires', async (request, reply) => {
    const query = tireQuerySchema.parse(request.query);
    const result = await service.listTires(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.post('/tires', { preHandler: [authorize('maintenance:create')] }, async (request, reply) => {
    const input = createTireSchema.parse(request.body);
    const tire = await service.createTire(request.tenantId, input);
    return sendCreated(reply, tire);
  });

  app.patch('/tires/:id', { preHandler: [authorize('maintenance:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateTireSchema.parse(request.body);
    const tire = await service.updateTire(request.tenantId, id, input);
    return sendSuccess(reply, tire);
  });
}
