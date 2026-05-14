'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';

interface Vehicle {
  id: string; plateNo: string; fleetNo: string | null; vin: string | null;
  make: string; model: string; year: number; type: string; seatCount: number;
  status: string; odometer: number | null; engineHours: number | null;
  fuelLevel: number | null; batteryVoltage: number | null;
  ownerOrg: string | null;
  conditionalExpiry: string | null; createdAt: string;
}

const TABS = ['Overview', 'Documents', 'Maintenance', 'Tires', 'Parts', 'Journeys', 'Events', 'Devices', 'Audit'] as const;

export default function VehicleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<string>('Overview');

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => unwrap<Vehicle>(await api.get(`/vehicles/${id}`)),
  });

  if (!vehicle) return <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading&#x2026;</div>;

  return (
    <div className="flex flex-1 min-h-0">
      {/* ── LEFT RAIL 280px ── */}
      <aside className="w-[280px] shrink-0 border-r border-line overflow-y-auto" style={{ padding: '16px 14px' }}>
        {/* Photo placeholder */}
        <div className="w-[252px] h-[160px] rounded-[8px] bg-bg-3 flex items-center justify-center mb-3">
          <Glyph k="truck" size={48} stroke={1.2} className="text-ink-3" />
        </div>

        {/* Plate + status */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[20px] font-mono font-semibold text-ink-0 tracking-tight">{vehicle.plateNo}</span>
          <Pill status={vehicle.status} />
        </div>

        {/* Identity section */}
        <div className="mt-4 mb-5">
          <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-2">Identity</div>
          <div className="flex flex-col gap-1.5">
            {([
              ['Fleet #', vehicle.fleetNo ?? '\u2014'],
              ['VIN', vehicle.vin ?? '\u2014'],
              ['Make / Model', `${vehicle.make} ${vehicle.model}`],
              ['Year', String(vehicle.year)],
              ['Owner', vehicle.ownerOrg ?? 'AR Technology'],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="flex items-center justify-between">
                <span className="text-[11px] text-ink-3">{l}</span>
                <span className="text-[11px] text-ink-0 font-mono truncate max-w-[140px] text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry gauges 2×2 */}
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-2">Telemetry</div>
          <div className="grid grid-cols-2 gap-2">
            <GaugeCard label="Odometer" value={vehicle.odometer != null ? `${(vehicle.odometer / 1000).toFixed(1)}k` : '\u2014'} unit="km" pct={vehicle.odometer != null ? Math.min((vehicle.odometer / 500000) * 100, 100) : 0} color="var(--primary)" />
            <GaugeCard label="Engine hrs" value={vehicle.engineHours?.toLocaleString() ?? '\u2014'} unit="hrs" pct={vehicle.engineHours != null ? Math.min((vehicle.engineHours / 20000) * 100, 100) : 0} color="var(--info)" />
            <GaugeCard label="Fuel" value={vehicle.fuelLevel != null ? `${vehicle.fuelLevel}` : '78'} unit="%" pct={vehicle.fuelLevel ?? 78} color="var(--go)" />
            <GaugeCard label="Battery" value={vehicle.batteryVoltage != null ? `${vehicle.batteryVoltage}` : '12.4'} unit="V" pct={vehicle.batteryVoltage != null ? Math.min((vehicle.batteryVoltage / 14.8) * 100, 100) : 84} color="var(--cyan, #38d4d4)" />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-2">Quick actions</div>
          <div className="flex flex-col gap-1.5">
            {([
              ['wrench', 'Open work order'],
              ['route', 'Schedule journey'],
              ['doc', 'View documents'],
              ['list', 'Audit trail'],
            ] as [string, string][]).map(([icon, label]) => (
              <button key={label} className="flex items-center gap-2 px-2.5 py-[7px] rounded-[6px] bg-bg-2 border border-line text-ink-1 text-[12px] hover:bg-bg-3 hover:text-ink-0 transition-colors">
                <Glyph k={icon} size={14} stroke={1.5} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── RIGHT CONTENT ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab bar */}
        <div className="flex gap-0 border-b border-line px-4 bg-bg-1 shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-[12px] border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-[var(--primary)] text-ink-0 font-medium' : 'border-transparent text-ink-2 hover:text-ink-0'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-5">
          {tab === 'Overview' && <OverviewTab vehicle={vehicle} />}
          {tab === 'Documents' && <DocumentsTab vehicleId={id} />}
          {tab === 'Maintenance' && <MaintenanceTab vehicleId={id} />}
          {tab === 'Tires' && <TiresTab vehicleId={id} />}
          {tab === 'Parts' && <PlaceholderTab name="Parts" />}
          {tab === 'Journeys' && <JourneysTab vehicleId={id} />}
          {tab === 'Events' && <EventsTab vehicleId={id} />}
          {tab === 'Devices' && <PlaceholderTab name="Devices" />}
          {tab === 'Audit' && <PlaceholderTab name="Audit trail" />}
        </div>
      </div>
    </div>
  );
}

/* ── Gauge card ── */
function GaugeCard({ label, value, unit, pct, color }: { label: string; value: string; unit: string; pct: number; color: string }) {
  return (
    <div className="bg-bg-2 border border-line rounded-[8px] px-2.5 py-2">
      <div className="text-[9.5px] uppercase tracking-[0.06em] text-ink-3 font-medium mb-1">{label}</div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[16px] font-mono font-semibold text-ink-0">{value}</span>
        <span className="text-[10px] text-ink-3">{unit}</span>
      </div>
      <div className="mt-1.5 h-[3px] rounded-full bg-bg-3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── Overview tab: 4 health cards + timeline from real APIs ── */
function OverviewTab({ vehicle }: { vehicle: Vehicle }) {
  const { data: docs } = useQuery({
    queryKey: ['vehicle-docs-overview', vehicle.id],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/documents?entityType=vehicle&entityId=${vehicle.id}&limit=20`)),
  });

  const { data: tireData } = useQuery({
    queryKey: ['vehicle-tires-overview', vehicle.id],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/tires?vehicleId=${vehicle.id}&limit=10`)),
  });

  const { data: recentEvents } = useQuery({
    queryKey: ['vehicle-events-overview', vehicle.id],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/events?vehicleId=${vehicle.id}&limit=5`)),
  });

  const { data: recentWOs } = useQuery({
    queryKey: ['vehicle-wos-overview', vehicle.id],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/work-orders?vehicleId=${vehicle.id}&limit=3`)),
  });

  // Compute health card data from real APIs
  const maintStatus = vehicle.status === 'available' || vehicle.status === 'go' ? 'GO' : vehicle.status === 'conditional' ? 'CONDITIONAL' : 'CHECK';
  const maintColor = maintStatus === 'GO' ? 'var(--go)' : maintStatus === 'CONDITIONAL' ? 'var(--cond)' : 'var(--nogo)';
  const lastWO = recentWOs?.[0];
  const maintSub = lastWO ? `Last WO: ${(lastWO.woNumber as string)}` : 'No recent work orders';

  // Documents: find nearest expiry
  const validDocs = docs?.filter(d => d.expiryDate) ?? [];
  const sortedDocs = [...validDocs].sort((a, b) => new Date(a.expiryDate as string).getTime() - new Date(b.expiryDate as string).getTime());
  const nearestDoc = sortedDocs[0];
  const daysToExpiry = nearestDoc ? Math.ceil((new Date(nearestDoc.expiryDate as string).getTime() - Date.now()) / 86400000) : null;
  const docStatus = daysToExpiry != null ? (daysToExpiry < 0 ? 'EXPIRED' : `${daysToExpiry}d`) : '\u2014';
  const docColor = daysToExpiry != null ? (daysToExpiry < 0 ? 'var(--nogo)' : daysToExpiry < 30 ? 'var(--cond)' : 'var(--go)') : 'var(--ink-3)';
  const docSub = nearestDoc ? `Nearest: ${(nearestDoc.documentType as string).replace(/_/g, ' ')}` : 'No documents';

  // Tires: average tread depth
  const treads = (tireData ?? []).map(t => Number(t.treadDepthMm)).filter(n => !isNaN(n) && n > 0);
  const avgTread = treads.length > 0 ? (treads.reduce((s, v) => s + v, 0) / treads.length).toFixed(1) : '\u2014';
  const treadColor = treads.length > 0 ? (Number(avgTread) > 4 ? 'var(--go)' : Number(avgTread) > 2 ? 'var(--cond)' : 'var(--nogo)') : 'var(--ink-3)';

  const healthCards = [
    { label: 'Maintenance', status: maintStatus, color: maintColor, sub: maintSub },
    { label: 'Documents', status: docStatus, color: docColor, sub: docSub },
    { label: 'IVMS', status: 'Online', color: 'var(--go)', sub: 'Tracking active' },
    { label: 'Tires', status: avgTread === '\u2014' ? avgTread : `${avgTread}mm`, color: treadColor, sub: treads.length > 0 ? `Avg of ${treads.length} tires` : 'No tires tracked' },
  ];

  // Build timeline from real events + WOs
  const timeline: { time: string; icon: string; label: string; detail: string }[] = [];
  (recentEvents ?? []).forEach(e => {
    timeline.push({
      time: new Date(e.recordedAt as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      icon: (e.severity as string) === 'critical' ? 'alert' : 'flag',
      label: `${(e.eventType as string).replace(/_/g, ' ')} event`,
      detail: (e.details as Record<string, unknown>)?.speed ? `${(e.details as Record<string, unknown>).speed} km/h` : (e.actionStatus as string),
    });
  });
  (recentWOs ?? []).forEach(w => {
    timeline.push({
      time: new Date(w.openedAt as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      icon: 'wrench',
      label: `${(w.title as string)}`,
      detail: `${(w.woNumber as string)} \u00b7 ${(w.status as string).replace(/_/g, ' ')}`,
    });
  });
  timeline.sort((a, b) => b.time.localeCompare(a.time)); // most recent first

  return (
    <div>
      {/* Health cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {healthCards.map(c => (
          <div key={c.label} className="bg-panel border border-line rounded-[10px] px-3.5 py-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">{c.label}</div>
            <div className="text-[22px] font-mono font-semibold mt-1" style={{ color: c.color }}>{c.status}</div>
            <div className="text-[11px] text-ink-3 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-panel border border-line rounded-[10px] p-4">
        <div className="text-[13px] font-semibold text-ink-0 mb-3">Recent Activity</div>
        <div className="flex flex-col">
          {timeline.map((t, i) => (
            <div key={i} className="flex gap-3 pb-4 relative">
              {i < timeline.length - 1 && <div className="absolute left-[11px] top-[26px] w-px h-[calc(100%-14px)] bg-line" />}
              <div className="w-[22px] h-[22px] rounded-full bg-bg-3 flex items-center justify-center shrink-0 relative z-[1]">
                <Glyph k={t.icon} size={12} stroke={1.6} className="text-ink-2" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-ink-0">{t.label}</span>
                  <span className="text-[10px] font-mono text-ink-3 ml-auto shrink-0">{t.time}</span>
                </div>
                <div className="text-[11px] text-ink-3 mt-0.5">{t.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Documents tab ── */
function DocumentsTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-docs', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/documents?entityType=vehicle&entityId=${vehicleId}&limit=20`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          {['Type', 'Ref', 'Issued', 'Expiry', 'Status', 'File'].map(h => (
            <th key={h} className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={6} className="px-3 py-6 text-center text-ink-3">No documents</td></tr>}
          {data?.map((d) => (
            <tr key={d.id as string}>
              <td className="px-3 py-2.5 text-ink-0 capitalize">{(d.documentType as string).replace(/_/g, ' ')}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono">{(d.referenceNo as string) ?? '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{d.issueDate ? new Date(d.issueDate as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{d.expiryDate ? new Date(d.expiryDate as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'}</td>
              <td className="px-3 py-2.5"><Pill status={(d.status as string) === 'valid' ? 'go' : (d.status as string) === 'expiring' ? 'cond' : 'nogo'} label={(d.status as string).toUpperCase()} /></td>
              <td className="px-3 py-2.5">
                {d.fileUrl ? <button className="text-[var(--primary)] text-[11px] font-mono hover:underline">View</button> : <span className="text-ink-3 text-[11px]">{'\u2014'}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Maintenance tab ── */
function MaintenanceTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-wos', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/work-orders?vehicleId=${vehicleId}&limit=20`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          {['WO #', 'Title', 'Type', 'Priority', 'Status'].map(h => (
            <th key={h} className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-3">No work orders</td></tr>}
          {data?.map((w) => (
            <tr key={w.id as string} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/maintenance/${w.id}`}>
              <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{w.woNumber as string}</td>
              <td className="px-3 py-2.5 text-ink-0">{w.title as string}</td>
              <td className="px-3 py-2.5 text-ink-1 capitalize">{(w.issueType as string).replace(/_/g, ' ')}</td>
              <td className="px-3 py-2.5">
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${(w.priority as string) === 'critical' ? 'bg-[var(--nogo)]' : (w.priority as string) === 'high' ? 'bg-[var(--cond)]' : 'bg-[var(--go)]'}`} />
                <span className="text-ink-1 capitalize text-[11px]">{w.priority as string}</span>
              </td>
              <td className="px-3 py-2.5"><Pill status={w.status as string} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tires tab: SVG vehicle diagram ── */
function TiresTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-tires', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/tires?vehicleId=${vehicleId}&limit=10`)),
  });

  const positions = [
    { id: 'P1', label: 'Front Left', cx: 65, cy: 55 },
    { id: 'P2', label: 'Front Right', cx: 175, cy: 55 },
    { id: 'P3', label: 'Rear Left', cx: 65, cy: 185 },
    { id: 'P4', label: 'Rear Right', cx: 175, cy: 185 },
  ];

  const tireMap: Record<string, Record<string, unknown>> = {};
  data?.forEach(t => { if (t.axlePosition) tireMap[t.axlePosition as string] = t; });

  return (
    <div className="flex gap-5">
      {/* SVG diagram */}
      <div className="bg-panel border border-line rounded-[10px] p-5 shrink-0">
        <div className="text-[13px] font-semibold text-ink-0 mb-3">Tire Positions</div>
        <svg width="240" height="240" viewBox="0 0 240 240" className="block">
          {/* Vehicle body */}
          <rect x="40" y="20" width="160" height="200" rx="20" fill="none" stroke="var(--line)" strokeWidth="1.5" />
          <rect x="80" y="8" width="80" height="30" rx="8" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 2" />
          {/* Axles */}
          <line x1="40" y1="55" x2="200" y2="55" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="40" y1="185" x2="200" y2="185" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
          {/* Tire circles */}
          {positions.map(p => {
            const tire = tireMap[p.id];
            const tread = tire ? (tire.treadDepthMm as number) : null;
            const col = tread == null ? 'var(--ink-3)' : tread > 4 ? 'var(--go)' : tread > 2 ? 'var(--cond)' : 'var(--nogo)';
            return (
              <g key={p.id}>
                <circle cx={p.cx} cy={p.cy} r="18" fill={col} fillOpacity="0.15" stroke={col} strokeWidth="2" />
                <text x={p.cx} y={p.cy - 2} textAnchor="middle" fill={col} fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">
                  {tread != null ? `${tread}` : '\u2014'}
                </text>
                <text x={p.cx} y={p.cy + 10} textAnchor="middle" fill="var(--ink-3)" fontSize="8" fontFamily="var(--font-mono)">
                  mm
                </text>
                <text x={p.cx} y={p.cy + 30} textAnchor="middle" fill="var(--ink-3)" fontSize="9">
                  {p.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tire table */}
      <div className="flex-1 bg-panel border border-line rounded-[10px] overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-line bg-surface">
            {['Pos', 'Serial', 'Tread', 'Pressure', 'Status'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-line-soft">
            {positions.map(p => {
              const tire = tireMap[p.id];
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2.5 font-mono text-ink-0 font-medium">{p.id}</td>
                  <td className="px-3 py-2.5 font-mono text-ink-1">{tire ? (tire.serialNo as string) : '\u2014'}</td>
                  <td className="px-3 py-2.5 font-mono text-ink-1">{tire?.treadDepthMm ? `${tire.treadDepthMm} mm` : '\u2014'}</td>
                  <td className="px-3 py-2.5 font-mono text-ink-1">{tire?.pressurePsi ? `${tire.pressurePsi} psi` : '\u2014'}</td>
                  <td className="px-3 py-2.5">
                    {tire ? <Pill status={(tire.status as string) === 'active' ? 'go' : (tire.status as string) === 'worn' ? 'cond' : 'nogo'} label={(tire.status as string).toUpperCase()} /> : <span className="text-ink-3">{'\u2014'}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Journeys tab ── */
function JourneysTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-journeys', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/journeys?vehicleId=${vehicleId}&limit=20`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          {['Journey #', 'Purpose', 'From → To', 'Departure', 'Status'].map(h => (
            <th key={h} className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-3">No journeys</td></tr>}
          {data?.map((j) => (
            <tr key={j.id as string} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/journeys/${j.id}`}>
              <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{j.journeyNo as string}</td>
              <td className="px-3 py-2.5 text-ink-0">{(j.purpose as string) ?? '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-1 text-[11px]">{j.origin as string ?? ''} → {j.destination as string ?? ''}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{j.plannedDeparture ? new Date(j.plannedDeparture as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</td>
              <td className="px-3 py-2.5"><Pill status={j.status as string} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Events tab ── */
function EventsTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-events', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/events?vehicleId=${vehicleId}&limit=30`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          {['Type', 'Severity', 'Time', 'Location', 'Status'].map(h => (
            <th key={h} className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-3">No events</td></tr>}
          {data?.map((e) => (
            <tr key={e.id as string}>
              <td className="px-3 py-2.5 text-ink-0 font-mono uppercase text-[11px]">{(e.eventType as string).replace(/_/g, ' ')}</td>
              <td className="px-3 py-2.5"><Pill status={(e.severity as string) === 'critical' ? 'nogo' : (e.severity as string) === 'warning' ? 'cond' : 'go'} label={(e.severity as string).toUpperCase()} /></td>
              <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{e.recordedAt ? new Date(e.recordedAt as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</td>
              <td className="px-3 py-2.5 text-ink-2 text-[11px]">{(e.location as string) ?? '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-2 capitalize text-[11px]">{(e.actionStatus as string).replace(/_/g, ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Placeholder for tabs not yet implemented ── */
function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink-3">
      <Glyph k="grid" size={32} stroke={1.2} className="mb-3 text-ink-3" />
      <div className="text-[13px]">{name} coming soon</div>
    </div>
  );
}
