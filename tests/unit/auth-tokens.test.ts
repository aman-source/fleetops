import { describe, it, expect, beforeAll } from 'vitest';

// Set required env before importing auth service
beforeAll(() => {
  process.env['JWT_SECRET'] = 'test-jwt-secret-min-16-chars';
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-min-16';
  process.env['JWT_ACCESS_EXPIRY'] = '15m';
  process.env['JWT_REFRESH_EXPIRY'] = '7d';
  process.env['DATABASE_URL'] = 'postgresql://x:x@localhost/x';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['MINIO_ACCESS_KEY'] = 'x';
  process.env['MINIO_SECRET_KEY'] = 'x';
  process.env['MFA_ISSUER'] = 'FleetOps';
  process.env['METRICS_USER'] = 'metrics';
  process.env['METRICS_PASS'] = 'test';
  process.env['SMS_PROVIDER'] = 'none';
  process.env['WHATSAPP_PROVIDER'] = 'none';
});

describe('JWT token generation and verification', () => {
  it('generates a valid access token that verifies correctly', async () => {
    const { generateTokenPair, verifyAccessToken } = await import('../../src/modules/auth/auth.service.js');

    const payload = {
      sub: 'user-id-123',
      email: 'test@artech.om',
      name: 'Test User',
      role: 'driver',
      permissions: ['journey:create'],
      orgId: 'org-id-456',
    };

    const tokens = generateTokenPair(payload);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    const decoded = verifyAccessToken(tokens.accessToken);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.permissions).toEqual(payload.permissions);
  });

  it('throws UnauthorizedError on invalid token', async () => {
    const { verifyAccessToken } = await import('../../src/modules/auth/auth.service.js');
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });
});
