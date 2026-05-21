import type { FastifyInstance } from 'fastify';
import { db } from '../../infra/db/client.js';
import { auditLogs } from '../../infra/db/schema/index.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Automatic audit logging via Fastify onResponse hook.
 * Logs every mutation (POST/PUT/PATCH/DELETE) with user, action, status.
 * No manual audit calls needed in route handlers.
 */
export function registerAuditHook(app: FastifyInstance) {
  // Capture entity ID from POST/PUT response bodies before they're sent
  app.addHook('onSend', async (request, _reply, payload) => {
    if (request.method !== 'POST' && request.method !== 'PUT') return payload;
    try {
      const raw = typeof payload === 'string' ? payload : null;
      if (raw) {
        const body = JSON.parse(raw);
        const id = body?.data?.id ?? body?.id;
        if (id && isUuid(String(id))) {
          (request as any)._auditEntityId = String(id);
        }
      }
    } catch { /* ignore parse errors */ }
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    if (!MUTATION_METHODS.has(request.method)) return;

    // Skip health checks and auth endpoints from audit
    if (request.url === '/health') return;

    const userId = (request as any).user?.sub ?? null;
    const orgId = (request as any).user?.orgId ?? null;

    // Extract entity type from URL pattern: /api/v1/{entity}/...
    const urlParts = request.url.split('/').filter(Boolean);
    const entityType = urlParts[2] ?? 'unknown'; // e.g., 'vehicles', 'journeys'
    // Prefer response-captured ID (for creations), fall back to URL segment
    const entityId = (request as any)._auditEntityId ?? (urlParts[3] && isUuid(urlParts[3]) ? urlParts[3] : null);

    try {
      await db.insert(auditLogs).values({
        userId,
        action: `${request.method} ${request.url}`,
        entityType,
        entityId,
        statusCode: reply.statusCode,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        orgId,
      });
    } catch (err) {
      // Audit failure should never crash the app — log and continue
      app.log.error({ err, url: request.url }, 'Audit log write failed');
    }
  });
}

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
