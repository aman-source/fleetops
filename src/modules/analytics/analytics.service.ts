import { sql, eq, and, gte, lte, count } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { journeys } from '../../infra/db/schema/journeys.js';
import { events } from '../../infra/db/schema/events.js';
import { incidents } from '../../infra/db/schema/hse.js';
import { workOrders } from '../../infra/db/schema/maintenance.js';
import { redis } from '../../infra/redis/client.js';

const KPI_CACHE_TTL = 60; // seconds

export interface FleetKPIs {
  totalVehicles: number;
  availableVehicles: number;
  utilizationPct: number;
  journeysTotal: number;
  journeysOnTime: number;
  onTimePct: number;
  noGoRate: number;
  activeIncidents: number;
  avgDriverScore: number;
  totalEvents: number;
  criticalEvents: number;
}

export async function getKPIs(tenantId: string, from?: string, to?: string): Promise<FleetKPIs> {
  const cacheKey = `analytics:kpis:${tenantId}:${from ?? 'all'}:${to ?? 'all'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const dateConditions = [];
  if (from) dateConditions.push(gte(journeys.plannedDeparture, new Date(from)));
  if (to) dateConditions.push(lte(journeys.plannedDeparture, new Date(to)));

  // Vehicle counts
  const vehicleCounts = await db.select({
    total: count(),
    available: sql<number>`count(*) filter (where ${vehicles.status} = 'available')`,
    noGo: sql<number>`count(*) filter (where ${vehicles.status} = 'no_go')`,
  }).from(vehicles).where(eq(vehicles.orgId, tenantId));

  const total = Number(vehicleCounts[0]?.total ?? 0);
  const available = Number(vehicleCounts[0]?.available ?? 0);
  const noGoCount = Number(vehicleCounts[0]?.noGo ?? 0);

  // Journey counts
  const journeyCounts = await db.select({
    total: count(),
    completed: sql<number>`count(*) filter (where ${journeys.status} in ('completed', 'closed'))`,
    onTime: sql<number>`count(*) filter (where ${journeys.status} in ('completed', 'closed') and ${journeys.actualArrival} <= ${journeys.plannedArrival})`,
  }).from(journeys).where(and(eq(journeys.orgId, tenantId), ...dateConditions));

  const journeysTotal = Number(journeyCounts[0]?.total ?? 0);
  const journeysOnTime = Number(journeyCounts[0]?.onTime ?? 0);
  const completed = Number(journeyCounts[0]?.completed ?? 0);

  // Events
  const eventCounts = await db.select({
    total: count(),
    critical: sql<number>`count(*) filter (where ${events.severity} = 'critical')`,
  }).from(events).where(eq(events.orgId, tenantId));

  // Active incidents
  const incidentCounts = await db.select({ active: count() })
    .from(incidents)
    .where(and(eq(incidents.orgId, tenantId), sql`${incidents.status} != 'closed'`));

  const kpis: FleetKPIs = {
    totalVehicles: total,
    availableVehicles: available,
    utilizationPct: total > 0 ? Math.round(((total - available) / total) * 100) : 0,
    journeysTotal,
    journeysOnTime,
    onTimePct: completed > 0 ? Math.round((journeysOnTime / completed) * 100) : 0,
    noGoRate: total > 0 ? Math.round((noGoCount / total) * 100) : 0,
    activeIncidents: Number(incidentCounts[0]?.active ?? 0),
    avgDriverScore: 0, // computed separately if needed
    totalEvents: Number(eventCounts[0]?.total ?? 0),
    criticalEvents: Number(eventCounts[0]?.critical ?? 0),
  };

  await redis.setex(cacheKey, KPI_CACHE_TTL, JSON.stringify(kpis));

  return kpis;
}

export async function getFleetReadiness(tenantId: string) {
  const rows = await db.select({
    status: vehicles.status,
    count: count(),
  }).from(vehicles)
    .where(eq(vehicles.orgId, tenantId))
    .groupBy(vehicles.status);

  return rows;
}

export async function getJourneyStats(tenantId: string, from: string, to: string) {
  const rows = await db.select({
    status: journeys.status,
    count: count(),
  }).from(journeys)
    .where(and(
      eq(journeys.orgId, tenantId),
      gte(journeys.plannedDeparture, new Date(from)),
      lte(journeys.plannedDeparture, new Date(to)),
    ))
    .groupBy(journeys.status);

  return rows;
}
