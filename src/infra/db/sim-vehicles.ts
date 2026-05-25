/**
 * Dev vehicle simulator — keeps 20 vehicles "live" in Redis with fresh positions.
 * Run: pnpm tsx src/infra/db/sim-vehicles.ts
 * Updates every 15s with slight GPS drift + fresh lastSeen → vehicles stay online.
 */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { vehicles } from './schema/vehicles.js';
import Redis from 'ioredis';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://fleetops:fleetops_secret@localhost:5432/fleetops' });
const db = drizzle(pool);
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

const GEO_KEY = 'fleet:positions';
const STATE_PREFIX = 'fleet:state:';

// Per-vehicle state — persists across ticks
const vehicleState: Record<string, { lat: number; lon: number; speed: number; heading: number; status: string; plateNo: string; vehicleType: string; ignition: boolean }> = {};

function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }
function rand(min: number, max: number) { return min + Math.random() * (max - min); }

// Initialize from DB once
async function init() {
  const rows = await db.select({ id: vehicles.id, plateNo: vehicles.plateNo, status: vehicles.status, type: vehicles.type }).from(vehicles);

  // Spread vehicles across 5 Oman sites
  const SITES = [
    { lat: 18.13, lon: 55.20 }, // Marmul
    { lat: 19.13, lon: 55.93 }, // Nimr
    { lat: 22.34, lon: 56.50 }, // Fahud
    { lat: 21.87, lon: 57.04 }, // Qarn Alam
    { lat: 20.45, lon: 56.12 }, // Saih Nihayda
  ];

  rows.forEach((v, i) => {
    const site = SITES[i % SITES.length];
    const isStationary = ['under_maintenance', 'no_go', 'hse_hold', 'decommissioned', 'ivms_fault', 'expired_documents'].includes(v.status);
vehicleState[v.id] = {
      lat: site.lat + rand(-0.3, 0.3),
      lon: site.lon + rand(-0.3, 0.3),
      speed: isStationary ? 0 : rand(10, 90),
      heading: Math.floor(rand(0, 360)),
      status: v.status,
      plateNo: v.plateNo,
      vehicleType: (v as {type?: string}).type ?? "light",
      ignition: !isStationary,
    };
  });

  console.log(`Initialized ${rows.length} vehicles. Starting simulation...`);
}

async function tick() {
  const now = new Date().toISOString();
  const pipeline = redis.pipeline();

  for (const [vehicleId, s] of Object.entries(vehicleState)) {
    const isStationary = ['under_maintenance', 'no_go', 'hse_hold', 'decommissioned', 'ivms_fault', 'expired_documents'].includes(s.status);

    if (!isStationary) {
      // Small GPS drift in heading direction
      const headingRad = (s.heading * Math.PI) / 180;
      const distDeg = (s.speed / 3600) * 15 / 111; // 15s of travel in degrees
      s.lat = clamp(s.lat + Math.cos(headingRad) * distDeg, 17.5, 23.5);
      s.lon = clamp(s.lon + Math.sin(headingRad) * distDeg, 54.5, 58.5);

      // Occasional heading change
      if (Math.random() < 0.15) s.heading = (s.heading + rand(-30, 30) + 360) % 360;
      // Speed variation
      s.speed = clamp(s.speed + rand(-5, 5), 5, 110);
    }

    const state: Record<string, string> = {
      vehicleId,
      deviceId: vehicleId,
      plateNo: s.plateNo,
      vehicleType: s.vehicleType ?? "light",
      lat: String(s.lat.toFixed(6)),
      lon: String(s.lon.toFixed(6)),
      speed: String(s.speed.toFixed(1)),
      heading: String(Math.round(s.heading)),
      ignition: s.ignition ? '1' : '0',
      fuelPct: String(Math.floor(rand(15, 98))),
      engineRpm: s.ignition ? String(Math.floor(rand(800, 3200))) : '0',
      odometer: String(Math.floor(rand(12000, 280000))),
      status: s.status,
      lastSeen: now,
    };

    const hashKey = `${STATE_PREFIX}${vehicleId}`;
    pipeline.hset(hashKey, state);
    pipeline.expire(hashKey, 120); // 2min TTL — refreshed every 15s
    pipeline.geoadd(GEO_KEY, s.lon, s.lat, vehicleId);
  }

  pipeline.expire(GEO_KEY, 120);
  await pipeline.exec();
  process.stdout.write(`\r[${new Date().toLocaleTimeString()}] Tick — ${Object.keys(vehicleState).length} vehicles updated`);
}

async function run() {
  await init();
  await tick(); // immediate first tick

  setInterval(async () => {
    await tick().catch(console.error);
  }, 15_000);
}

run().catch(err => { console.error(err); process.exit(1); });
