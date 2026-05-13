import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, isTokenBlacklisted, type JwtPayload } from '../../modules/auth/auth.service.js';
import { UnauthorizedError } from '../errors.js';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  // Check blacklist (logged-out tokens)
  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    throw new UnauthorizedError('Token has been revoked');
  }

  const payload = verifyAccessToken(token);
  request.user = payload;
}
