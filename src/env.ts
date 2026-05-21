import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3000),

  // Postgres
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // MQTT
  MQTT_URL: z.string().default('mqtt://localhost:1883'),

  // MinIO / S3
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('fleetops'),
  MINIO_USE_SSL: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),

  // JWT
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Email (SMTP) — optional, feature disabled if missing
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('FleetOps <noreply@fleetops.local>'),

  // SMS — Twilio or none
  SMS_PROVIDER: z.enum(['twilio', 'none']).default('none'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  // WhatsApp
  WHATSAPP_PROVIDER: z.enum(['twilio', 'none']).default('none'),

  // Push — Expo
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // Monitoring
  METRICS_USER: z.string().default('metrics'),
  METRICS_PASS: z.string().default('fleetops-metrics'),

  // MFA
  MFA_ISSUER: z.string().default('FleetOps'),

  // Mapbox (server-side: map matching, route optimization)
  MAPBOX_TOKEN: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const missing = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${errors?.join(', ')}`)
      .join('\n');

    console.error(`\n❌ Invalid environment variables:\n${missing}\n`);
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
