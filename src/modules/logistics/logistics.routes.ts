import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import {
  createSegmentSchema, updateSegmentSchema, loadSchema, unloadSchema, segmentQuerySchema,
} from './logistics.schema.js';
import * as service from './logistics.service.js';

export async function logisticsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  app.get('/logistics/segments', async (request, reply) => {
    const query = segmentQuerySchema.parse(request.query);
    const result = await service.listSegments(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  app.post('/logistics/segments', { preHandler: [authorize('logistics:create')] }, async (request, reply) => {
    const input = createSegmentSchema.parse(request.body);
    const segment = await service.createSegment(request.tenantId, input);
    return sendCreated(reply, segment);
  });

  app.get('/logistics/segments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const segment = await service.getSegment(request.tenantId, id);
    return sendSuccess(reply, segment);
  });

  app.patch('/logistics/segments/:id', { preHandler: [authorize('logistics:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSegmentSchema.parse(request.body);
    const segment = await service.updateSegment(request.tenantId, id, input);
    return sendSuccess(reply, segment);
  });

  app.post('/logistics/segments/:id/load', { preHandler: [authorize('logistics:load')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = loadSchema.parse(request.body);

    let file: { buffer: Buffer; mimetype: string; filename: string } | undefined;
    if (request.isMultipart()) {
      const data = await request.file();
      if (data) {
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) chunks.push(chunk);
        file = { buffer: Buffer.concat(chunks), mimetype: data.mimetype, filename: data.filename };
      }
    }

    const segment = await service.recordLoad(request.tenantId, id, request.user.sub, input, file);
    return sendSuccess(reply, segment);
  });

  app.post('/logistics/segments/:id/unload', { preHandler: [authorize('logistics:unload')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = unloadSchema.parse(request.body);

    let file: { buffer: Buffer; mimetype: string; filename: string } | undefined;
    if (request.isMultipart()) {
      const data = await request.file();
      if (data) {
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) chunks.push(chunk);
        file = { buffer: Buffer.concat(chunks), mimetype: data.mimetype, filename: data.filename };
      }
    }

    const segment = await service.recordUnload(request.tenantId, id, request.user.sub, input, file);
    return sendSuccess(reply, segment);
  });

  app.post('/logistics/segments/:id/close', { preHandler: [authorize('logistics:close')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const segment = await service.closeSegment(request.tenantId, id, request.user.sub);
    return sendSuccess(reply, segment);
  });

  app.post('/logistics/segments/:id/evidence', { preHandler: [authorize('logistics:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();
    if (!data) throw new Error('No file provided');

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const file = { buffer: Buffer.concat(chunks), mimetype: data.mimetype, filename: data.filename };
    const evidenceType = (request.query as { type?: string }).type ?? 'document';

    const evidence = await service.addEvidence(request.tenantId, id, request.user.sub, evidenceType, file);
    return sendCreated(reply, evidence);
  });
}
