import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { sendSuccess, sendNoContent } from '../../shared/response.js';
import * as service from './notifications.service.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /notifications
  app.get('/notifications', async (request, reply) => {
    const query = z.object({
      cursor: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }).parse(request.query);

    const result = await service.listNotifications(request.user.sub, query);
    return sendSuccess(reply, result.items, 200, result.meta);
  });

  // PATCH /notifications/:id/read
  app.patch('/notifications/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.markRead(request.user.sub, id);
    return sendNoContent(reply);
  });

  // GET /notifications/preferences
  app.get('/notifications/preferences', async (request, reply) => {
    const prefs = await service.getPreferences(request.user.sub);
    return sendSuccess(reply, prefs);
  });

  // PUT /notifications/preferences
  app.put('/notifications/preferences', async (request, reply) => {
    const schema = z.array(z.object({
      eventType: z.string(),
      channels: z.array(z.string()),
      enabled: z.boolean(),
    }));
    const prefs = schema.parse(request.body);
    await service.updatePreferences(request.user.sub, prefs);
    return sendNoContent(reply);
  });
}
