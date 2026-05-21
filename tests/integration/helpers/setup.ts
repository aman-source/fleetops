/**
 * Integration test setup.
 * Tests run against real Postgres + Redis from docker-compose.test.yml.
 *
 * Start services: pnpm test:e2e:up (seeds DB too)
 * Then: DATABASE_URL=... REDIS_URL=... pnpm test
 */

// Set test env defaults if not already provided by CI/runner
process.env['DATABASE_URL'] ??= 'postgresql://fleetops:fleetops_secret@localhost:5433/fleetops_test';
process.env['REDIS_URL'] ??= 'redis://localhost:6380';
process.env['MQTT_URL'] ??= 'mqtt://localhost:1884';
process.env['MINIO_ENDPOINT'] ??= 'localhost';
process.env['MINIO_PORT'] ??= '9003';
process.env['MINIO_ACCESS_KEY'] ??= 'fleetops_minio';
process.env['MINIO_SECRET_KEY'] ??= 'fleetops_minio_secret';
process.env['MINIO_BUCKET'] ??= 'fleetops-test';
process.env['MINIO_USE_SSL'] ??= 'false';
process.env['JWT_SECRET'] ??= 'test-jwt-secret-min-16-chars';
process.env['JWT_REFRESH_SECRET'] ??= 'test-refresh-secret-min-16';
process.env['JWT_ACCESS_EXPIRY'] ??= '15m';
process.env['JWT_REFRESH_EXPIRY'] ??= '7d';
process.env['LOG_LEVEL'] ??= 'warn';
process.env['SMS_PROVIDER'] ??= 'none';
process.env['WHATSAPP_PROVIDER'] ??= 'none';
process.env['NODE_ENV'] ??= 'test';
process.env['MFA_ISSUER'] ??= 'FleetOps Test';
process.env['METRICS_USER'] ??= 'metrics';
process.env['METRICS_PASS'] ??= 'test';

export {};
