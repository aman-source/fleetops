/**
 * Seed Redis with simulated live vehicle positions.
 * Run: pnpm tsx src/infra/db/seed-redis.ts
 *
 * Scatters all vehicles across Oman oil-field region with realistic GPS,
 * speeds, headings. TTL = 24h so dev sessions don't expire.
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

// Oman oil-field area bounding box
// SW: 17.8N 54.8E  NE: 23.5N 58.0E
const LAT_MIN = 17.9;
const LAT_MAX = 22.5;
const LON_MIN = 54.9;
const LON_MAX = 57.5;

// Key locations — vehicles clustered near real sites
const SITES = [
  { name: 'Marmul',   lat: 18.13, lon: 55.20, weight: 5 },
  { name: 'Nimr',     lat: 19.13, lon: 55.93, weight: 4 },
  { name: 'Fahud',    lat: 22.34, lon: 56.50, weight: 3 },
  { name: 'Qarn Alam',lat: 21.87, lon: 57.04, weight: 2 },
  { name: 'Saih Nihayda', lat: 20.45, lon: 56.12, weight: 2 },
];

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickSite() {
  const totalWeight = SITES.reduce((s, x) => s + x.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const site of SITES) {
    rand -= site.weight;
    if (rand <= 0) return site;
  }
  return SITES[0];
}

function scatterAroundSite(site: { lat: number; lon: number }, radiusDeg = 0.4) {
  return {
    lat: site.lat + randBetween(-radiusDeg, radiusDeg),
    lon: site.lon + randBetween(-radiusDeg, radiusDeg),
  };
}

async function seedRedis() {
  console.log('Fetching vehicles from DB...');
  const rows = await db
    .select({ id: vehicles.id, plateNo: vehicles.plateNo, status: vehicles.status, type: vehicles.type })
    .from(vehicles);

  console.log(`Found ${rows.length} vehicles. Seeding Redis...`);

  const pipeline = redis.pipeline();
  const now = new Date().toISOString();

  for (const v of rows) {
    const site = pickSite();
    const pos = scatterAroundSite(site);

    // Vehicles in maintenance/no-go tend to be stationary at base
    const isStationary = ['under_maintenance', 'no_go', 'hse_hold', 'decommissioned', 'ivms_fault', 'expired_documents'].includes(v.status);
    const speed = isStationary ? 0 : randBetween(0, 95);
    const heading = Math.floor(randBetween(0, 360));
    const ignition = !isStationary && speed > 0;

    const state: Record<string, string> = {
      vehicleId: v.id,
      deviceId: v.id, // use vehicleId as deviceId for dev
      plateNo: v.plateNo,
      vehicleType: v.type,
      lat: String(pos.lat.toFixed(6)),
      lon: String(pos.lon.toFixed(6)),
      speed: String(speed.toFixed(1)),
      heading: String(heading),
      ignition: ignition ? '1' : '0',
      fuelPct: String(Math.floor(randBetween(15, 98))),
      engineRpm: ignition ? String(Math.floor(randBetween(800, 3200))) : '0',
      odometer: String(Math.floor(randBetween(12000, 280000))),
      status: v.status,
      lastSeen: now,
    };

    const hashKey = `${STATE_PREFIX}${v.id}`;
    pipeline.hset(hashKey, state);
    pipeline.expire(hashKey, 86400); // 24h TTL for dev

    pipeline.geoadd(GEO_KEY, pos.lon, pos.lat, v.id);
    pipeline.expire(GEO_KEY, 86400);

    console.log(`  ${v.plateNo.padEnd(12)} ${v.status.padEnd(20)} ${site.name} (${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}) ${speed.toFixed(0)} km/h`);
  }

  await pipeline.exec();
  console.log(`\nDone. Seeded ${rows.length} vehicles into Redis.`);
  process.exit(0);
}

seedRedis().catch(err => {
  console.error(err);
  process.exit(1);
});
