import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { users, sessions, roles, organizations } from '../../infra/db/schema/index.js';
import { redis } from '../../infra/redis/client.js';
import { env } from '../../env.js';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors.js';

const SALT_ROUNDS = 12;
const BLACKLIST_PREFIX = 'token:blacklist:';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  name: string;
  role: string;
  permissions: string[];
  orgId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  permissions: string[];
  orgId: string;
  orgName: string;
  mfaEnabled: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokenPair(payload: JwtPayload): TokenPair {
  const accessExpirySeconds = parseExpiryToSeconds(env.JWT_ACCESS_EXPIRY);
  const refreshExpirySeconds = parseExpiryToSeconds(env.JWT_REFRESH_EXPIRY);

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: accessExpirySeconds,
  });

  const refreshToken = jwt.sign({ sub: payload.sub, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: refreshExpirySeconds,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRY,
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
  return result !== null;
}

export async function blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
  await redis.setex(`${BLACKLIST_PREFIX}${token}`, expiresInSeconds, '1');
}

export async function login(email: string, password: string, ip?: string, userAgent?: string): Promise<{ tokens: TokenPair; user: AuthUser }> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      name: users.name,
      phone: users.phone,
      status: users.status,
      roleId: users.roleId,
      orgId: users.orgId,
      mfaEnabled: users.mfaEnabled,
      roleName: roles.name,
      permissions: roles.permissions,
      orgName: organizations.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .innerJoin(organizations, eq(users.orgId, organizations.id))
    .where(eq(users.email, email))
    .limit(1);

  const user = result[0];
  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (user.status !== 'active') throw new ForbiddenError('Account is locked or inactive');

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) throw new UnauthorizedError('Invalid email or password');

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.roleName,
    permissions: user.permissions ?? [],
    orgId: user.orgId,
  };

  const tokens = generateTokenPair(payload);

  // Parse refresh expiry for session storage
  const refreshExpiryMs = parseExpiry(env.JWT_REFRESH_EXPIRY);
  const expiresAt = new Date(Date.now() + refreshExpiryMs);

  // Store session
  await db.insert(sessions).values({
    userId: user.id,
    refreshToken: tokens.refreshToken,
    expiresAt,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
  });

  // Update last login
  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

  return {
    tokens,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.roleName,
      permissions: user.permissions ?? [],
      orgId: user.orgId,
      orgName: user.orgName,
      mfaEnabled: user.mfaEnabled,
    },
  };
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const decoded = verifyRefreshToken(refreshToken);

  // Find valid session
  const result = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      email: users.email,
      name: users.name,
      status: users.status,
      roleId: users.roleId,
      orgId: users.orgId,
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(sessions.refreshToken, refreshToken), eq(sessions.revoked, false)))
    .limit(1);

  const session = result[0];
  if (!session) throw new UnauthorizedError('Session not found or revoked');
  if (session.status !== 'active') throw new ForbiddenError('Account is locked or inactive');

  // Revoke old session
  await db.update(sessions).set({ revoked: true }).where(eq(sessions.id, session.sessionId));

  const payload: JwtPayload = {
    sub: session.userId,
    email: session.email,
    name: session.name,
    role: session.roleName,
    permissions: session.permissions ?? [],
    orgId: session.orgId,
  };

  const tokens = generateTokenPair(payload);

  // Store new session
  const refreshExpiryMs = parseExpiry(env.JWT_REFRESH_EXPIRY);
  await db.insert(sessions).values({
    userId: session.userId,
    refreshToken: tokens.refreshToken,
    expiresAt: new Date(Date.now() + refreshExpiryMs),
  });

  return tokens;
}

export async function logout(accessToken: string, refreshToken?: string): Promise<void> {
  // Blacklist access token (remaining TTL)
  try {
    const decoded = jwt.decode(accessToken) as { exp?: number } | null;
    if (decoded?.exp) {
      const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingSeconds > 0) {
        await blacklistToken(accessToken, remainingSeconds);
      }
    }
  } catch {
    // Token might already be invalid — that's fine
  }

  // Revoke refresh token session
  if (refreshToken) {
    await db
      .update(sessions)
      .set({ revoked: true })
      .where(eq(sessions.refreshToken, refreshToken));
  }
}

export async function getMe(userId: string): Promise<AuthUser> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      orgId: users.orgId,
      mfaEnabled: users.mfaEnabled,
      roleName: roles.name,
      permissions: roles.permissions,
      orgName: organizations.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .innerJoin(organizations, eq(users.orgId, organizations.id))
    .where(eq(users.id, userId))
    .limit(1);

  const user = result[0];
  if (!user) throw new UnauthorizedError('User not found');

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.roleName,
    permissions: user.permissions ?? [],
    orgId: user.orgId,
    orgName: user.orgName,
    mfaEnabled: user.mfaEnabled,
  };
}

function parseExpiryToSeconds(expiry: string): number {
  const ms = parseExpiry(expiry);
  return Math.floor(ms / 1000);
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}
