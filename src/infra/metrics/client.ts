import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// Collect Node.js default metrics (CPU, memory, GC, etc.)
collectDefaultMetrics({ register });

// ─── Custom Metrics ───────────────────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: 'fleetops_http_requests_total',
  help: 'Total HTTP requests by method, route, status',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'fleetops_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const activeVehicles = new Gauge({
  name: 'fleetops_active_vehicles',
  help: 'Number of vehicles with active live state in Redis',
  registers: [register],
});

export const activeJourneys = new Gauge({
  name: 'fleetops_active_journeys',
  help: 'Number of journeys in active/pending_approval status',
  registers: [register],
});

export const mqttMessagesTotal = new Counter({
  name: 'fleetops_mqtt_messages_total',
  help: 'Total MQTT messages processed',
  labelNames: ['topic'],
  registers: [register],
});

export const notificationsSentTotal = new Counter({
  name: 'fleetops_notifications_sent_total',
  help: 'Total notifications sent by channel',
  labelNames: ['channel', 'status'],
  registers: [register],
});

export const queueJobsTotal = new Counter({
  name: 'fleetops_queue_jobs_total',
  help: 'Total BullMQ jobs by queue and outcome',
  labelNames: ['queue', 'outcome'],
  registers: [register],
});

export const panicEventsTotal = new Counter({
  name: 'fleetops_panic_events_total',
  help: 'Total panic events triggered',
  registers: [register],
});

export const wsConnectionsGauge = new Gauge({
  name: 'fleetops_ws_connections',
  help: 'Current WebSocket connections',
  registers: [register],
});
