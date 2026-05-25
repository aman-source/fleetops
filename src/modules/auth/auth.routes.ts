import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, logoutSchema, mfaVerifySchema, mfaEnableSchema, mfaDisableSchema } from './auth.schema.js';
import { login, refresh, logout, getMe, mfaSetup, mfaEnable, mfaDisable, mfaVerifyLogin } from './auth.service.js';
import { sendSuccess, sendNoContent } from '../../shared/response.js';
import { authenticate } from '../../shared/middleware/authenticate.js';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/login — stricter rate limit: 5 attempts per minute per IP
  app.post('/auth/login', {
    config: {
      rateLimit: {
        // In test env use very high limit so E2E specs don't exhaust each other's quota
        max: process.env.NODE_ENV === 'production' ? 5 : 10000,
        timeWindow: '1 minute',
        keyGenerator: (request) => request.ip,
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too many login attempts. Try again in 1 minute.',
          code: 'RATE_LIMITED',
        }),
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await login(body.email, body.password, request.ip, request.headers['user-agent']);

    if (result.mfaRequired) {
      return sendSuccess(reply, { mfaRequired: true, mfaToken: result.mfaToken }, 200);
    }

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

  // POST /auth/mfa/verify — complete login when MFA is required
  app.post('/auth/mfa/verify', {
    config: {
      rateLimit: {
        max: process.env.NODE_ENV === 'production' ? 5 : 10000,
        timeWindow: '1 minute',
        keyGenerator: (request) => request.ip,
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too many attempts. Try again in 1 minute.',
          code: 'RATE_LIMITED',
        }),
      },
    },
  }, async (request, reply) => {
    const body = mfaVerifySchema.parse(request.body);
    const result = await mfaVerifyLogin(body.mfaToken, body.totp, request.ip, request.headers['user-agent']);
    return sendSuccess(reply, { user: result.user, tokens: result.tokens });
  });

  // POST /auth/mfa/setup — generate secret + QR for authenticated user
  app.post('/auth/mfa/setup', { preHandler: [authenticate] }, async (request, reply) => {
    const result = await mfaSetup(request.user.sub);
    return sendSuccess(reply, result);
  });

  // POST /auth/mfa/enable — verify TOTP and activate MFA
  app.post('/auth/mfa/enable', { preHandler: [authenticate] }, async (request, reply) => {
    const body = mfaEnableSchema.parse(request.body);
    await mfaEnable(request.user.sub, body.secret, body.totp);
    return sendNoContent(reply);
  });

  // POST /auth/mfa/disable — deactivate MFA
  app.post('/auth/mfa/disable', { preHandler: [authenticate] }, async (request, reply) => {
    const body = mfaDisableSchema.parse(request.body);
    await mfaDisable(request.user.sub, body.totp);
    return sendNoContent(reply);
  });
}
