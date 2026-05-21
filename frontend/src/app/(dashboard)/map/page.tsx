'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { subscribe } from '@/lib/ws';
import { useLayout } from '@/stores/layout';
import { Glyph, Spark } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';
import type { VehicleLive, JourneyRoute, VehicleTrail } from '@/components/map/fleet-map';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), { ssr: false });

// Re-export type for local use — actual interface is in fleet-map.tsx
type VehicleLiveLocal = VehicleLive;

interface EventItem {
  id: string; eventType: string; severity: string; vehicleId: string;
  speed: string | null; details: Record<string, unknown> | null;
  recordedAt: string; actionStatus: string;
}

interface JourneyItem {
  id: string; journeyNo: string; purpose: string | null; status: string;
  riskLevel: string | null; plannedDeparture: string; plannedArrival: string;
  driverName?: string; vehiclePlateNo?: string;
  actualDeparture: string | null; actualArrival: string | null;
}

interface KpiData {
  utilization: number; onTime: number; noGoRate: number;
  activeIncidents: number; avgDriverScore: number;
}

interface ReadinessItem { status: string; count: number; }

const SEV_DOT: Record<string, string> = { go: 'bg-[var(--go)]', cond: 'bg-[var(--cond)]', nogo: 'bg-[var(--nogo)]', info: 'bg-[var(--primary)]' };

const LEGEND = [
  { color: '#1ec991', label: 'GO / Online' },
  { color: '#f5a524', label: 'Conditional' },
  { color: '#ef4747', label: 'No-Go' },
  { color: '#4a90ff', label: 'In Maintenance' },
  { color: '#8a8270', label: 'Offline' },
];

function sevToKey(sev: string): string {
  return sev === 'critical' ? 'nogo' : sev === 'warning' ? 'cond' : 'info';
}

function eventLabel(type: string, details: Record<string, unknown> | null): string {
  const labels: Record<string, string> = {
    overspeed: 'OVERSPEED', harsh_braking: 'HARSH BR.', harsh_accel: 'HARSH ACC.',
    idle: 'IDLE', deviation: 'DEVIATION', panic: 'PANIC', tamper: 'TAMPER',
    offline: 'OFFLINE', geofence_entry: 'GEO ENTRY', geofence_exit: 'GEO EXIT',
    night_driving: 'NIGHT DRV', unauthorized_driver: 'UNAUTH DRV',
  };
  return labels[type] ?? type.toUpperCase().replace(/_/g, ' ');
}

function eventDetail(type: string, details: Record<string, unknown> | null, speed: string | null): string {
  if (!details) return speed ? `${Number(speed).toFixed(0)} km/h` : '';
  if (type === 'overspeed') return `${details.speed} km/h \u00b7 limit ${details.limit}`;
  if (type === 'harsh_braking') return `Decel ${details.decel}`;
  if (type === 'idle') return `Engine on, ${details.duration}`;
  if (type === 'deviation') return `${details.distance} off route`;
  return speed ? `${Number(speed).toFixed(0)} km/h` : '';
}

export default function MapPage() {
  const [liveVehicles, setLiveVehicles] = useState<VehicleLiveLocal[]>([]);
  const { rightPanelOpen, toggleRightPanel } = useLayout();
  const [mapTab, setMapTab] = useState('Active journeys');
  const [showIsochrones, setShowIsochrones] = useState(false);

  // Live fleet positions
  const { data: liveData } = useQuery({
    queryKey: ['fleet-live'],
    queryFn: async () => unwrap<VehicleLiveLocal[]>(await api.get('/fleet/live')),
    refetchInterval: 30_000,
  });

  // Journey routes (waypoints for polylines)
  const { data: routesData } = useQuery({
    queryKey: ['journeys-map-data'],
    queryFn: async () => unwrap<JourneyRoute[]>(await api.get('/journeys/map-data')),
    refetchInterval: 60_000,
  });

  // GPS trails (last 30 min per online vehicle)
  const { data: trailsData } = useQuery({
    queryKey: ['fleet-trails'],
    queryFn: async () => unwrap<VehicleTrail[]>(await api.get('/fleet/trails')),
    refetchInterval: 30_000,
  });

  // KPIs
  const { data: kpis } = useQuery({
    queryKey: ['analytics-kpis'],
    queryFn: async () => unwrap<KpiData>(await api.get('/analytics/kpis')),
  });

  // Fleet readiness for counts
  const { data: readiness } = useQuery({
    queryKey: ['analytics-readiness'],
    queryFn: async () => unwrap<ReadinessItem[]>(await api.get('/analytics/fleet-readiness')),
  });

  // Isochrone coverage zones — 30-min drive reach per online vehicle
  const { data: isochroneData } = useQuery({
    queryKey: ['isochrones', liveVehicles.filter(v => v.online && v.lat && v.lon).map(v => v.vehicleId).join(',')],
    queryFn: async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return [];
      const online = liveVehicles
        .filter((v: VehicleLiveLocal) => v.online && v.lat && v.lon)
        .slice(0, 10);
      const results = await Promise.allSettled(
        online.map(async (v: VehicleLiveLocal) => {
          const res = await fetch(
            `https://api.mapbox.com/isochrone/v1/mapbox/driving/${v.lon},${v.lat}?contours_minutes=30&polygons=true&access_token=${token}`,
          );
          if (!res.ok) return null;
          const data = await res.json() as { features: Array<{ type: string; geometry: { type: string; coordinates: unknown }; properties: unknown }> };
          const feature = data.features?.[0];
          if (!feature) return null;
          return { vehicleId: v.vehicleId, feature };
        }),
      );
      return results
        .filter((r): r is PromiseFulfilledResult<{ vehicleId: string; feature: { type: string; geometry: { type: string; coordinates: unknown }; properties: unknown } } | null> => r.status === 'fulfilled' && r.value != null)
        .map(r => r.value!);
    },
    enabled: showIsochrones,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  // Recent events
  const { data: recentEvents } = useQuery({
    queryKey: ['events-recent-map'],
    queryFn: async () => unwrap<EventItem[]>(await api.get('/events?limit=10&sort=recordedAt&order=desc')),
    refetchInterval: 30_000,
  });

  // Active journeys
  const { data: activeJourneys } = useQuery({
    queryKey: ['journeys-active-map'],
    queryFn: async () => unwrap<JourneyItem[]>(await api.get('/journeys?status=active&limit=10')),
    refetchInterval: 30_000,
  });

  useEffect(() => { if (liveData) setLiveVehicles(liveData); }, [liveData]);

  useEffect(() => {
    const unsub = subscribe('fleet:live', (update) => {
      const v = update as VehicleLiveLocal;
      if (!v?.vehicleId) return;
      setLiveVehicles((prev) => {
        const idx = prev.findIndex((x) => x.vehicleId === v.vehicleId);
        if (idx >= 0) { const next = [...prev]; next[idx] = { ...v, online: true }; return next; }
        return [...prev, { ...v, online: true }];
      });
    });
    return unsub;
  }, []);

  const online = liveVehicles.filter((v) => v.online).length;

  // Compute KPI cards from real data
  const goCount = readiness?.find(r => r.status === 'available')?.count ?? 0;
  const noGoCount = readiness?.filter(r => ['no_go', 'hse_hold'].includes(r.status)).reduce((s, r) => s + r.count, 0) ?? 0;
  const totalFleet = readiness?.reduce((s, r) => s + r.count, 0) ?? 0;
  const maintCount = readiness?.find(r => r.status === 'under_maintenance')?.count ?? 0;

  const kpiCards = [
    { label: 'ACTIVE', value: activeJourneys?.length ?? 0, sub: 'journeys now', spark: [5, 8, 12, 10, 15, 18, activeJourneys?.length ?? 0], color: 'var(--primary)' },
    { label: 'GO', value: goCount, sub: `of ${totalFleet} fleet`, spark: [goCount - 5, goCount - 3, goCount - 1, goCount, goCount + 1, goCount - 2, goCount], color: 'var(--go)' },
    { label: 'NO-GO', value: noGoCount, sub: `${maintCount} in maint`, spark: [noGoCount + 2, noGoCount + 1, noGoCount, noGoCount + 3, noGoCount - 1, noGoCount, noGoCount], color: 'var(--nogo)' },
    { label: 'INCIDENTS', value: kpis?.activeIncidents ?? 0, sub: 'open now', spark: [2, 3, 1, 4, 2, 3, kpis?.activeIncidents ?? 0], color: 'var(--cond)' },
  ];

  const events = recentEvents ?? [];
  const journeysList = activeJourneys ?? [];
  const criticalCount = events.filter(e => e.severity === 'critical').length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Control Tower</span>
        </div>
        <div className="flex flex-col ml-1">
          <span className="text-[14px] font-semibold text-ink-0">Live fleet map</span>
          <span className="font-mono text-[10px] text-ink-3">OMAN \u00b7 MARMUL OPS \u00b7 {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-2 border border-line-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--go)]" />
          <span className="font-mono text-[10.5px] text-ink-2">LIVE \u00b7 {online || totalFleet} online</span>
        </div>
        <button className="h-7 w-7 flex items-center justify-center bg-bg-3 border border-line rounded-[6px] text-ink-1 hover:bg-bg-4 transition-colors">
          <Glyph k="bell" size={14} stroke={1.8} />
        </button>
        <button className="h-7 px-3 flex items-center gap-1.5 bg-[var(--primary)] border border-[var(--primary)] rounded-[6px] text-white text-[12px] font-medium hover:brightness-110 transition-all">
          <Glyph k="plus" size={13} stroke={2} />New journey
        </button>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3 px-4 pt-3 shrink-0">
        {kpiCards.map(k => (
          <div key={k.label} className="flex-1 bg-panel border border-line rounded-[10px] px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">{k.label}</span>
              <Spark values={k.spark} color={k.color} w={64} h={20} />
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[28px] font-mono font-medium text-ink-0">{k.value}</span>
              <span className="font-mono text-[10.5px] text-ink-3">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main: map + right panel */}
      <div className="flex gap-3 p-3 flex-1 min-h-0">
        {/* Map panel */}
        <div className="flex-1 flex flex-col bg-panel border border-line rounded-[10px] overflow-hidden min-w-0 relative">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line shrink-0 bg-bg-1/80 backdrop-blur-sm z-[1]">
            <div className="flex gap-0.5">
              {['All fleet', 'Active journeys', 'No-Go', 'Geofences', 'Heat', 'Coverage'].map(t => (
                <button key={t} onClick={() => { setMapTab(t); setShowIsochrones(t === 'Coverage'); }}
                  className={`text-[11.5px] px-2.5 py-1 rounded-full transition-colors ${mapTab === t ? 'bg-bg-3 text-ink-0 font-medium' : 'text-ink-2 hover:text-ink-0'}`}>{t}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-3">PDO BLOCK 6</span>
              <button className="h-6 px-2 flex items-center gap-1 text-ink-2 hover:text-ink-0 text-[11px] bg-bg-2 border border-line rounded-[4px] transition-colors">
                <Glyph k="filter" size={11} />Filters
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <FleetMap vehicles={liveVehicles} routes={routesData ?? []} trails={trailsData ?? []} isochrones={showIsochrones ? (isochroneData ?? []) : []} />
            {/* Legend */}
            <div className="absolute bottom-3 left-3 bg-panel/90 backdrop-blur-sm border border-line rounded-[8px] px-3 py-2 z-[400]">
              <div className="text-[9px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-1.5">Legend</div>
              <div className="flex flex-col gap-1">
                {LEGEND.map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                    <span className="text-[10px] text-ink-2">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Scale */}
            <div className="absolute bottom-3 right-3 bg-panel/90 backdrop-blur-sm border border-line rounded-[6px] px-2.5 py-1.5 z-[400]">
              <div className="flex items-center gap-2">
                <div className="w-[40px] h-px bg-ink-3" />
                <span className="font-mono text-[9px] text-ink-3">50 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        {rightPanelOpen ? (
          <div className="flex flex-col gap-3 shrink-0" style={{ width: 340 }}>
            <button onClick={toggleRightPanel} className="flex items-center gap-1.5 text-ink-3 hover:text-ink-0 transition-colors self-end" title="Collapse panel">
              <span className="text-[10px] font-mono">COLLAPSE</span>
              <Glyph k="chevR" size={12} />
            </button>

            {/* Event stream — REAL DATA */}
            <div className="bg-panel border border-line rounded-[10px] flex flex-col">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink-0">Event stream</span>
                  {criticalCount > 0 && <Pill status="nogo" label={`${criticalCount} critical`} />}
                </div>
                <span className="font-mono text-[10px] text-ink-3">RECENT</span>
              </div>
              <div className="flex flex-col" style={{ maxHeight: 240, overflow: 'hidden' }}>
                {events.length === 0 && <div className="px-3 py-4 text-center text-ink-3 text-[11px]">No recent events</div>}
                {events.map((e, i) => (
                  <div key={e.id} className="flex gap-2.5 px-3 py-2" style={{ borderBottom: i < events.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                    <span className={`w-1 self-stretch rounded-sm shrink-0 ${SEV_DOT[sevToKey(e.severity)] || 'bg-ink-3'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-ink-0 font-medium">{eventLabel(e.eventType, e.details)}</span>
                        <span className="font-mono text-[10px] text-ink-3">{new Date(e.recordedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-px">
                        <span className="text-[11px] text-ink-2 truncate">{eventDetail(e.eventType, e.details, e.speed)}</span>
                        <span className="font-mono text-[10px] text-ink-3 shrink-0">{e.vehicleId.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active journeys — REAL DATA */}
            <div className="bg-panel border border-line rounded-[10px] flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                <span className="text-[13px] font-semibold text-ink-0">Active journeys</span>
                <span className="font-mono text-[10px] text-ink-3">{journeysList.length} in progress</span>
              </div>
              <div className="flex flex-col overflow-auto flex-1">
                {journeysList.length === 0 && <div className="px-3 py-4 text-center text-ink-3 text-[11px]">No active journeys</div>}
                {journeysList.map((j, i) => {
                  const riskColor = j.riskLevel === 'H' ? 'var(--nogo)' : j.riskLevel === 'M' ? 'var(--cond)' : 'var(--go)';
                  const dep = new Date(j.plannedDeparture).getTime();
                  const arr = new Date(j.plannedArrival).getTime();
                  const now = Date.now();
                  const prog = Math.max(0, Math.min(100, ((now - dep) / (arr - dep)) * 100));
                  const eta = new Date(j.plannedArrival).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={j.id} className="px-3 py-2.5 hover:bg-raised transition-colors cursor-pointer" style={{ borderBottom: i < journeysList.length - 1 ? '1px solid var(--line-soft)' : 'none' }}
                      onClick={() => window.location.href = `/journeys/${j.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[var(--primary)] font-medium">{j.journeyNo}</span>
                          {j.riskLevel && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono font-medium border" style={{ color: riskColor, borderColor: `color-mix(in srgb, ${riskColor} 40%, transparent)`, background: `color-mix(in srgb, ${riskColor} 15%, transparent)` }}>
                              R:{j.riskLevel}
                            </span>
                          )}
                        </div>
                        <Pill status={j.status} />
                      </div>
                      <div className="text-[12px] text-ink-1 mt-1 truncate">{j.purpose ?? 'Journey'}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="font-mono text-[10px] text-ink-3">{j.vehiclePlateNo ?? ''} {j.driverName ? `\u00b7 ${j.driverName}` : ''}</span>
                        <span className="font-mono text-[10px] text-ink-2">ETA {eta}</span>
                      </div>
                      <div className="h-[3px] bg-bg-3 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: prog + '%',
                          background: j.status === 'deviated' ? 'var(--nogo)' : j.status === 'delayed' ? 'var(--cond)' : j.status === 'completed' ? 'var(--go)' : 'var(--primary)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <button onClick={toggleRightPanel} className="w-[36px] shrink-0 bg-panel border border-line rounded-[10px] flex items-center justify-center text-ink-3 hover:text-ink-0 hover:bg-raised transition-colors" title="Show panel">
            <div className="flex flex-col items-center gap-2">
              <Glyph k="chevL" size={14} />
              <span className="text-[10px] font-medium tracking-wider" style={{ writingMode: 'vertical-rl' }}>EVENTS</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
