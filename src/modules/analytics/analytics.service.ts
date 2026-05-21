import { sql, eq, and, gte, lte, count, isNull, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { journeys } from '../../infra/db/schema/journeys.js';
import { events } from '../../infra/db/schema/events.js';
import { incidents, driverScores } from '../../infra/db/schema/hse.js';
import { organizations } from '../../infra/db/schema/organizations.js';

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

export interface SiteBreakdownRow {
  site: string;
  veh: number;
  goPct: number;
  jour: number;
  onTimePct: number;
  inc: number;
  avgScore: number;
}

export async function getSiteBreakdown(tenantId: string): Promise<SiteBreakdownRow[]> {
  // Group vehicles by projectId, join org name directly — avoids N-level hierarchy issues
  const vehByProject = await db.select({
    projectId: vehicles.projectId,
    orgName: organizations.name,
    total: count(),
    go: sql<number>`count(*) filter (where ${vehicles.status} in ('available', 'conditional'))`,
  }).from(vehicles)
    .innerJoin(organizations, eq(vehicles.projectId, organizations.id))
    .where(and(eq(vehicles.orgId, tenantId), isNull(vehicles.deletedAt)))
    .groupBy(vehicles.projectId, organizations.name);

  if (vehByProject.length === 0) return [];

  // Avg driver score across tenant (same for all sites)
  const scoreRows = await db.select({ avg: sql<number>`avg(${driverScores.totalScore})` })
    .from(driverScores)
    .where(eq(driverScores.orgId, tenantId));
  const avgScore = Math.round(Number(scoreRows[0]?.avg ?? 0) * 10) / 10;

  const results: SiteBreakdownRow[] = [];

  for (const row of vehByProject) {
    const veh = Number(row.total ?? 0);
    const goCount = Number(row.go ?? 0);

    // Get vehicle IDs for this project
    const vehIds = await db.select({ id: vehicles.id })
      .from(vehicles)
      .where(and(eq(vehicles.projectId, row.projectId!), isNull(vehicles.deletedAt)));

    if (vehIds.length === 0) continue;
    const idList = vehIds.map(v => `'${v.id}'`).join(',');

    const jourRows = await db.select({
      total: count(),
      onTime: sql<number>`count(*) filter (where ${journeys.status} in ('completed', 'closed') and ${journeys.actualArrival} <= ${journeys.plannedArrival})`,
    }).from(journeys)
      .where(and(
        sql`${journeys.vehicleId} in (${sql.raw(idList)})`,
        isNull(journeys.deletedAt),
      ));

    const incRows = await db.select({ cnt: count() })
      .from(incidents)
      .where(and(
        sql`${incidents.vehicleId} in (${sql.raw(idList)})`,
        sql`${incidents.status} != 'closed'`,
        isNull(incidents.deletedAt),
      ));

    const jour = Number(jourRows[0]?.total ?? 0);
    const onTime = Number(jourRows[0]?.onTime ?? 0);
    const inc = Number(incRows[0]?.cnt ?? 0);

    results.push({
      site: row.orgName,
      veh,
      goPct: veh > 0 ? Math.round((goCount / veh) * 100) : 0,
      jour,
      onTimePct: jour > 0 ? Math.round((onTime / jour) * 100) : 0,
      inc,
      avgScore,
    });
  }

  return results.sort((a, b) => b.veh - a.veh);
}

export async function getLtiDays(tenantId: string): Promise<{ daysSinceLti: number; lastLtiDate: string | null }> {
  // LTI = Lost Time Injury = T3 incident that was closed
  const rows = await db.select({ closedAt: incidents.closedAt })
    .from(incidents)
    .where(and(
      eq(incidents.orgId, tenantId),
      eq(incidents.tier, 3),
      sql`${incidents.status} = 'closed'`,
      isNull(incidents.deletedAt),
    ))
    .orderBy(desc(incidents.closedAt))
    .limit(1);

  if (!rows[0]?.closedAt) {
    // No T3 incidents closed — use org creation date as baseline (safe default)
    return { daysSinceLti: 365, lastLtiDate: null };
  }

  const ms = Date.now() - new Date(rows[0].closedAt).getTime();
  const daysSinceLti = Math.floor(ms / 86400_000);
  return { daysSinceLti, lastLtiDate: rows[0].closedAt.toISOString() };
}

export async function getOperationalRisks(tenantId: string): Promise<Array<{
  type: string; severity: string; count: number; description: string;
}>> {
  const risks: Array<{ type: string; severity: string; count: number; description: string }> = [];

  const incidentRows = await db.select({ cnt: count() }).from(incidents)
    .where(and(eq(incidents.orgId, tenantId), sql`${incidents.status} != 'closed'`, isNull(incidents.deletedAt)));
  const activeIncidents = Number(incidentRows[0]?.cnt ?? 0);
  if (activeIncidents > 0) {
    risks.push({ type: 'active_incident', severity: 'critical', count: activeIncidents, description: `${activeIncidents} active HSE incident(s)` });
  }

  const hseHoldRows = await db.select({ cnt: count() }).from(vehicles)
    .where(sql`${vehicles.status} = 'hse_hold'`);
  const hseHold = Number(hseHoldRows[0]?.cnt ?? 0);
  if (hseHold > 0) {
    risks.push({ type: 'hse_hold', severity: 'high', count: hseHold, description: `${hseHold} vehicle(s) on HSE hold` });
  }

  const noGoRows = await db.select({ cnt: count() }).from(vehicles)
    .where(sql`${vehicles.status} = 'no_go'`);
  const noGo = Number(noGoRows[0]?.cnt ?? 0);
  if (noGo > 0) {
    risks.push({ type: 'no_go_vehicles', severity: 'medium', count: noGo, description: `${noGo} vehicle(s) in no-go status` });
  }

  return risks;
}
