/**
 * k6 Load Test — FleetOps API
 *
 * Usage:
 *   k6 run tests/load/k6-fleet-api.js
 *   k6 run --vus 50 --duration 2m tests/load/k6-fleet-api.js
 *
 * Targets:
 *   p95 < 200ms on all list endpoints
 *   p99 < 500ms on journey submit
 *   Error rate < 1%
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@artech.om';
const ADMIN_PASS = __ENV.ADMIN_PASS || 'Fleetops@2026';

// Custom metrics
const journeyListLatency = new Trend('journey_list_latency', true);
const vehicleListLatency = new Trend('vehicle_list_latency', true);
const liveFleetLatency = new Trend('live_fleet_latency', true);
const errorRate = new Rate('error_rate');
const requestsTotal = new Counter('requests_total');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '1m', target: 50 },   // Sustained load
    { duration: '30s', target: 100 }, // Spike
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    error_rate: ['rate<0.01'],
    journey_list_latency: ['p(95)<200'],
    vehicle_list_latency: ['p(95)<150'],
    live_fleet_latency: ['p(95)<100'],
  },
};

let authToken = null;

export function setup() {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) {
    console.error(`Login failed: ${res.status} ${res.body}`);
    return { token: null };
  }

  const body = JSON.parse(res.body);
  return { token: body.data?.tokens?.accessToken };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    ...(data.token ? { 'Authorization': `Bearer ${data.token}` } : {}),
  };

  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health ok': (r) => r.status === 200 });
    requestsTotal.add(1);
    errorRate.add(res.status !== 200);
  });

  group('Vehicle List', () => {
    const res = http.get(`${BASE_URL}/api/v1/vehicles?limit=25`, { headers });
    vehicleListLatency.add(res.timings.duration);
    check(res, { 'vehicles 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    errorRate.add(res.status !== 200);
  });

  group('Journey List', () => {
    const res = http.get(`${BASE_URL}/api/v1/journeys?limit=25`, { headers });
    journeyListLatency.add(res.timings.duration);
    check(res, { 'journeys 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    errorRate.add(res.status !== 200);
  });

  group('Live Fleet State', () => {
    const res = http.get(`${BASE_URL}/api/v1/fleet/live`, { headers });
    liveFleetLatency.add(res.timings.duration);
    check(res, { 'live 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    errorRate.add(res.status !== 200);
  });

  group('Analytics KPIs', () => {
    const res = http.get(`${BASE_URL}/api/v1/analytics/kpis`, { headers });
    check(res, { 'kpis 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    errorRate.add(res.status !== 200);
  });

  sleep(1);
}
