import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess, sendCreated } from '../../shared/response.js';
import {
  createDocumentSchema, updateDocumentSchema, documentQuerySchema, expiringQuerySchema,
} from './documents.schema.js';
import * as service from './documents.service.js';

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /documents
  app.get('/documents', async (request, reply) => {
    const query = documentQuerySchema.parse(request.query);
    const result = await service.listDocuments(request.tenantId, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  // GET /documents/expiring
  app.get('/documents/expiring', async (request, reply) => {
    const query = expiringQuerySchema.parse(request.query);
    const items = await service.listExpiring(request.tenantId, query.days, query.limit);
    return sendSuccess(reply, items);
  });

  // POST /documents
  app.post('/documents', { preHandler: [authorize('documents:create')] }, async (request, reply) => {
    // Handle multipart file upload
    const contentType = request.headers['content-type'] ?? '';

    let input: ReturnType<typeof createDocumentSchema.parse>;
    let file: { buffer: Buffer; mimetype: string; filename: string } | undefined;

    if (contentType.includes('multipart/form-data')) {
      const parts = request.parts();
      const fields: Record<string, string> = {};

      for await (const part of parts as any) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          // Validate file size (max 10MB) and type
          if (buffer.length > 10 * 1024 * 1024) {
            return reply.status(400).send({
              error: 'File too large. Maximum 10MB.',
              code: 'FILE_TOO_LARGE',
            });
          }

          const allowedMimes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
          if (!allowedMimes.includes(part.mimetype)) {
            return reply.status(400).send({
              error: 'Invalid file type. Allowed: JPEG, PNG, HEIC, PDF.',
              code: 'INVALID_FILE_TYPE',
            });
          }

          file = { buffer, mimetype: part.mimetype, filename: part.filename };
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      input = createDocumentSchema.parse(fields);
    } else {
      input = createDocumentSchema.parse(request.body);
    }

    const doc = await service.createDocument(request.tenantId, input, file);
    return sendCreated(reply, doc);
  });

  // PATCH /documents/:id
  app.patch('/documents/:id', { preHandler: [authorize('documents:create')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const contentType = request.headers['content-type'] ?? '';

    let input: ReturnType<typeof updateDocumentSchema.parse>;
    let file: { buffer: Buffer; mimetype: string; filename: string } | undefined;

    if (contentType.includes('multipart/form-data')) {
      const parts = request.parts();
      const fields: Record<string, string> = {};

      for await (const part of parts as any) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          file = { buffer: Buffer.concat(chunks), mimetype: part.mimetype, filename: part.filename };
        } else {
          fields[part.fieldname] = part.value;
        }
      }

      input = updateDocumentSchema.parse(fields);
    } else {
      input = updateDocumentSchema.parse(request.body);
    }

    const doc = await service.updateDocument(request.tenantId, id, input, file);
    return sendSuccess(reply, doc);
  });
}
