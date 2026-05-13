import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, logoutSchema } from './auth.schema.js';
import { login, refresh, logout, getMe } from './auth.service.js';
import { sendSuccess, sendNoContent } from '../../shared/response.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await login(body.email, body.password, request.ip, request.headers['user-agent']);

    return sendSuccess(reply, {
      user: result.user,
      tokens: result.tokens,
    }, 200);
  });

  // POST /auth/refresh
  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const tokens = await refresh(body.refreshToken);

    return sendSuccess(reply, { tokens });
  });

  // POST /auth/logout
  app.post('/auth/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const body = logoutSchema.parse(request.body);
    const accessToken = request.headers.authorization?.replace('Bearer ', '') ?? '';
    await logout(accessToken, body.refreshToken);

    return sendNoContent(reply);
  });

  // GET /auth/me
  app.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await getMe(request.user.sub);
    return sendSuccess(reply, { user });
  });
}
