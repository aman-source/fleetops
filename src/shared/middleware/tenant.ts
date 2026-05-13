import type { FastifyRequest, FastifyReply } from 'fastify';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string;
  }
}

/**
 * Tenant scoping middleware.
 * Extracts org_id from JWT and attaches to request.
 * Every DB query in handlers should use request.tenantId for scoping.
 */
export async function tenantScope(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  request.tenantId = request.user.orgId;
}
