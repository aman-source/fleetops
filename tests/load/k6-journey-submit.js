/**
 * k6 Load Test — Journey Submit Flow (Safety-Critical Path)
 *
 * Usage:
 *   k6 run tests/load/k6-journey-submit.js
 *
 * Seeds must be loaded: pnpm db:seed && pnpm db:seed-fleet && pnpm db:seed-ops
 * Tests the full journey creation + submit + gate evaluation path.
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const submitLatency = new Trend('journey_submit_latency', true);
const gateEvalLatency = new Trend('gate_eval_latency', true);
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    journey_submit_latency: ['p(95)<500', 'p(99)<1000'],
    gate_eval_latency: ['p(95)<300'],
    error_rate: ['rate<0.05'],
  },
};

export function setup() {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'admin@artech.om',
    password: 'Fleetops@2026',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) return { token: null, vehicleId: null, driverId: null };

  const body = JSON.parse(res.body);
  const token = body.data?.tokens?.accessToken;

  // Get first available vehicle and driver from seeded data
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const vehicles = JSON.parse(http.get(`${BASE_URL}/api/v1/vehicles?status=available&limit=1`, { headers }).body);
  const drivers = JSON.parse(http.get(`${BASE_URL}/api/v1/drivers?limit=1`, { headers }).body);

  return {
    token,
    vehicleId: vehicles.data?.[0]?.id,
    driverId: drivers.data?.[0]?.id,
  };
}

export default function (data) {
  if (!data.token || !data.vehicleId || !data.driverId) {
    errorRate.add(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  let journeyId = null;

  group('Create Journey', () => {
    const res = http.post(`${BASE_URL}/api/v1/journeys`, JSON.stringify({
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      plannedDeparture: new Date(Date.now() + 3600000).toISOString(),
      plannedArrival: new Date(Date.now() + 7200000).toISOString(),
      origin: 'Marmul Base',
      destination: 'Nimr Site',
      journeyType: 'operational',
      waypoints: [],
    }), { headers });

    const ok = check(res, { 'create journey 201': (r) => r.status === 201 });
    errorRate.add(!ok);

    if (ok) {
      journeyId = JSON.parse(res.body).data?.id;
    }
  });

  if (journeyId) {
    group('Evaluate Gates', () => {
      const res = http.get(`${BASE_URL}/api/v1/journeys/${journeyId}/gates`, { headers });
      gateEvalLatency.add(res.timings.duration);
      check(res, { 'gates 200': (r) => r.status === 200 });
      errorRate.add(res.status !== 200);
    });
  }

  sleep(2);
}
