import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { env } from './env.js';
import { ZodError } from 'zod';
import { AppError } from './shared/errors.js';
import { checkDbHealth, closeDb } from './infra/db/client.js';
import { redis, redisSub, checkRedisHealth, closeRedis } from './infra/redis/client.js';
import { connectMqtt, checkMqttHealth, closeMqtt } from './infra/mqtt/client.js';
import { ensureBucket, checkStorageHealth } from './infra/storage/s3.js';
import { checkQueueHealth, closeQueues } from './infra/queue/bull.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { fleetRoutes } from './modules/fleet/fleet.routes.js';
import { documentRoutes } from './modules/documents/documents.routes.js';
import { startExpiryWorker } from './modules/documents/documents.expiry.js';
import { ivmsRoutes } from './modules/ivms/ivms.routes.js';
import { journeyRoutes } from './modules/journey/journey.routes.js';
import { maintenanceRoutes } from './modules/maintenance/maintenance.routes.js';
import { hseRoutes } from './modules/hse/hse.routes.js';
import { passengerRoutes } from './modules/passenger/passenger.routes.js';
import { notificationRoutes } from './modules/notifications/notifications.routes.js';
import { startNotificationWorker } from './modules/notifications/notifications.service.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { initMqttSubscriber } from './modules/ivms/mqtt-subscriber.js';
import { initWebSocket } from './infra/ws/server.js';
import { registerAuditHook } from './shared/middleware/audit.js';

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
  },
});

// ── Plugins ──
await app.register(cors, { origin: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// ── Error Handler ──
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { issues: error.flatten().fieldErrors },
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  // Fastify validation errors
  if (error instanceof Error && 'validation' in error) {
    const fastifyError = error as Error & { validation: unknown };
    return reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: { issues: fastifyError.validation },
    });
  }

  app.log.error(error);
  return reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

// ── Health Check ──
app.get('/health', async (_request, reply) => {
  const [dbOk, redisOk, mqttOk, storageOk, queueOk] = await Promise.all([
    checkDbHealth(),
    checkRedisHealth(),
    Promise.resolve(checkMqttHealth()),
    checkStorageHealth(),
    checkQueueHealth(),
  ]);

  const status = dbOk && redisOk && mqttOk && storageOk && queueOk ? 'healthy' : 'degraded';
  const httpStatus = status === 'healthy' ? 200 : 503;

  return reply.status(httpStatus).send({
    data: {
      status,
      timestamp: new Date().toISOString(),
      services: {
        postgres: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
        mqtt: mqttOk ? 'up' : 'down',
        storage: storageOk ? 'up' : 'down',
        queue: queueOk ? 'up' : 'down',
      },
    },
  });
});

// ── Audit Hook ──
registerAuditHook(app);

// ── Routes ──
await app.register(authRoutes, { prefix: '/api/v1' });
await app.register(fleetRoutes, { prefix: '/api/v1' });
await app.register(documentRoutes, { prefix: '/api/v1' });
await app.register(ivmsRoutes, { prefix: '/api/v1' });
await app.register(journeyRoutes, { prefix: '/api/v1' });
await app.register(maintenanceRoutes, { prefix: '/api/v1' });
await app.register(hseRoutes, { prefix: '/api/v1' });
await app.register(passengerRoutes, { prefix: '/api/v1' });
await app.register(notificationRoutes, { prefix: '/api/v1' });
await app.register(analyticsRoutes, { prefix: '/api/v1' });
await app.register(adminRoutes, { prefix: '/api/v1' });

// ── WebSocket ──
await initWebSocket(app);

// ── API Root ──
app.get('/api/v1', async () => ({
  data: {
    name: 'Fleetops API',
    version: '0.1.0',
    environment: env.NODE_ENV,
  },
}));

// ── Bootstrap ──
async function start() {
  try {
    // Connect infrastructure
    app.log.info('Connecting to Redis...');
    await redis.connect();
    await redisSub.connect();

    app.log.info('Connecting to MQTT broker...');
    await connectMqtt();

    app.log.info('Ensuring S3 bucket exists...');
    await ensureBucket();

    app.log.info('Verifying Postgres...');
    const dbOk = await checkDbHealth();
    if (!dbOk) throw new Error('Cannot connect to Postgres');

    // Start MQTT subscriber (real-time pipeline)
    app.log.info('Starting MQTT subscriber...');
    await initMqttSubscriber(app);

    // Start background workers
    app.log.info('Starting document expiry worker...');
    startExpiryWorker();

    app.log.info('Starting notification worker...');
    startNotificationWorker();

    // Start server
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`Fleetops API running on ${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.fatal(err);
    process.exit(1);
  }
}

// ── Graceful Shutdown ──
async function shutdown(signal: string) {
  app.log.info(`Received ${signal}. Shutting down...`);
  await app.close();
  await closeMqtt();
  await closeRedis();
  await closeQueues();
  await closeDb();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

export { app };
