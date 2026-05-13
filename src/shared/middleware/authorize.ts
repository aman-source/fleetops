import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../errors.js';

/**
 * RBAC middleware factory.
 * Usage: { preHandler: [authenticate, authorize('journey:create')] }
 * Checks if user's role permissions include the required permission.
 */
export function authorize(...requiredPermissions: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const { permissions, role } = request.user;

    // Admin bypass — has all permissions
    if (role === 'admin') return;

    const hasPermission = requiredPermissions.every((perm) => permissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenError(
        `Missing required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }
  };
}
