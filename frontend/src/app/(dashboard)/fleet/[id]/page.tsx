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
  conditionalExpiry: string | null; createdAt: string;
}

const TABS = ['Overview', 'Documents', 'Maintenance', 'Journeys', 'Events', 'Tires'] as const;

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<string>('Overview');

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => unwrap<Vehicle>(await api.get(`/vehicles/${id}`)),
  });

  if (!vehicle) return <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading...</div>;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="px-5 pt-4 pb-0 bg-bg-1 border-b border-line shrink-0">
        <Link href="/fleet" className="flex items-center gap-2 text-ink-3 hover:text-ink-0 transition-colors mb-3">
          <Glyph k="arrowL" size={14} />
          <span className="font-mono text-[11px]">FLEET</span>
          <Glyph k="chevR" size={11} className="text-ink-4" />
          <span className="font-mono text-[11px] text-ink-1">{vehicle.plateNo}</span>
        </Link>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-bg-3 flex items-center justify-center">
              <Glyph k="truck" size={20} className="text-ink-2" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-semibold text-ink-0 font-mono">{vehicle.plateNo}</span>
                <Pill status={vehicle.status} />
              </div>
              <span className="text-[12px] text-ink-2">
                {vehicle.make} {vehicle.model} {vehicle.year} &middot; {vehicle.type} &middot; {vehicle.seatCount} seats
                {vehicle.fleetNo ? ` \u00b7 ${vehicle.fleetNo}` : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 flex items-center gap-1.5 bg-bg-3 border border-line rounded-[6px] text-ink-1 text-[12px] hover:bg-bg-4 transition-colors">
              <Glyph k="doc" size={13} />Edit
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 -mb-px">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-2 text-[12.5px] border-b-2 transition-colors ${tab === t ? 'border-[var(--primary)] text-ink-0 font-medium' : 'border-transparent text-ink-2 hover:text-ink-0'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-5">
        {tab === 'Overview' && <OverviewTab vehicle={vehicle} />}
        {tab === 'Documents' && <DocumentsTab vehicleId={id} />}
        {tab === 'Maintenance' && <MaintenanceTab vehicleId={id} />}
        {tab === 'Journeys' && <JourneysTab vehicleId={id} />}
        {tab === 'Events' && <EventsTab vehicleId={id} />}
        {tab === 'Tires' && <TiresTab vehicleId={id} />}
      </div>
    </div>
  );
}

function OverviewTab({ vehicle }: { vehicle: Vehicle }) {
  const stats = [
    { label: 'Odometer', value: vehicle.odometer?.toLocaleString() ?? '\u2014', unit: 'km' },
    { label: 'Engine Hours', value: vehicle.engineHours?.toLocaleString() ?? '\u2014', unit: 'hrs' },
    { label: 'Seats', value: String(vehicle.seatCount), unit: '' },
    { label: 'Year', value: String(vehicle.year), unit: '' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {stats.map(s => (
        <div key={s.label} className="bg-panel border border-line rounded-[10px] px-3.5 py-3">
          <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">{s.label}</div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[24px] font-mono font-medium text-ink-0">{s.value}</span>
            {s.unit && <span className="text-[12px] text-ink-3">{s.unit}</span>}
          </div>
        </div>
      ))}
      <div className="col-span-full bg-panel border border-line rounded-[10px] p-4">
        <div className="text-[13px] font-semibold text-ink-0 mb-3">Details</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          {[
            ['Plate', vehicle.plateNo], ['Fleet #', vehicle.fleetNo ?? '\u2014'],
            ['VIN', vehicle.vin ?? '\u2014'], ['Type', vehicle.type],
            ['Make / Model', `${vehicle.make} ${vehicle.model}`], ['Year', String(vehicle.year)],
            ['Status', vehicle.status.replace(/_/g, ' ')],
            ['Conditional Expiry', vehicle.conditionalExpiry ? new Date(vehicle.conditionalExpiry).toLocaleString() : '\u2014'],
            ['Registered', new Date(vehicle.createdAt).toLocaleDateString('en-GB')],
          ].map(([l, v]) => (
            <div key={l} className="flex items-center justify-between">
              <span className="text-[11.5px] text-ink-3">{l}</span>
              <span className="text-[11.5px] text-ink-0 font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-docs', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/documents?entityType=vehicle&entityId=${vehicleId}&limit=20`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Type</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Reference</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Expiry</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-3">No documents</td></tr>}
          {data?.map((d) => (
            <tr key={d.id as string}>
              <td className="px-3 py-2.5 text-ink-0 capitalize">{(d.documentType as string).replace(/_/g, ' ')}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono">{(d.referenceNo as string) ?? '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono">{d.expiryDate as string}</td>
              <td className="px-3 py-2.5"><Pill status={(d.status as string) === 'valid' ? 'go' : (d.status as string) === 'expiring' ? 'cond' : 'nogo'} label={(d.status as string).toUpperCase()} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-wos', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/work-orders?vehicleId=${vehicleId}&limit=20`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">WO #</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Title</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Type</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-3">No work orders</td></tr>}
          {data?.map((w) => (
            <tr key={w.id as string} className="hover:bg-raised transition-colors cursor-pointer">
              <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{w.woNumber as string}</td>
              <td className="px-3 py-2.5 text-ink-0">{w.title as string}</td>
              <td className="px-3 py-2.5 text-ink-1 capitalize">{(w.issueType as string).replace(/_/g, ' ')}</td>
              <td className="px-3 py-2.5"><Pill status={(w.status as string)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JourneysTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-journeys', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/journeys?vehicleId=${vehicleId}&limit=20`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Journey #</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Purpose</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Departure</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-3">No journeys</td></tr>}
          {data?.map((j) => (
            <tr key={j.id as string} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/journeys/${j.id}`}>
              <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{j.journeyNo as string}</td>
              <td className="px-3 py-2.5 text-ink-0">{(j.purpose as string) ?? '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{j.plannedDeparture ? new Date(j.plannedDeparture as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</td>
              <td className="px-3 py-2.5"><Pill status={j.status as string} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-events', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/events?vehicleId=${vehicleId}&limit=30`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Type</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Severity</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Time</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={4} className="px-3 py-6 text-center text-ink-3">No events</td></tr>}
          {data?.map((e) => (
            <tr key={e.id as string}>
              <td className="px-3 py-2.5 text-ink-0 font-mono uppercase">{(e.eventType as string).replace(/_/g, ' ')}</td>
              <td className="px-3 py-2.5"><Pill status={(e.severity as string) === 'critical' ? 'nogo' : (e.severity as string) === 'warning' ? 'cond' : 'go'} label={(e.severity as string).toUpperCase()} /></td>
              <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{e.recordedAt ? new Date(e.recordedAt as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</td>
              <td className="px-3 py-2.5 text-ink-2 capitalize">{(e.actionStatus as string).replace(/_/g, ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TiresTab({ vehicleId }: { vehicleId: string }) {
  const { data } = useQuery({
    queryKey: ['vehicle-tires', vehicleId],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/tires?vehicleId=${vehicleId}&limit=10`)),
  });
  return (
    <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead><tr className="border-b border-line bg-surface">
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Serial</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Position</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Tread</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Pressure</th>
          <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-line-soft">
          {(!data || data.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-ink-3">No tires tracked</td></tr>}
          {data?.map((t) => (
            <tr key={t.id as string}>
              <td className="px-3 py-2.5 text-ink-0 font-mono">{t.serialNo as string}</td>
              <td className="px-3 py-2.5 text-ink-1">{(t.axlePosition as string) ?? '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono">{t.treadDepthMm ? `${t.treadDepthMm} mm` : '\u2014'}</td>
              <td className="px-3 py-2.5 text-ink-1 font-mono">{t.pressurePsi ? `${t.pressurePsi} psi` : '\u2014'}</td>
              <td className="px-3 py-2.5"><Pill status={(t.status as string) === 'active' ? 'go' : (t.status as string) === 'worn' ? 'cond' : 'nogo'} label={(t.status as string).toUpperCase()} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
