'use client';

import { use, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { subscribe } from '@/lib/ws';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), { ssr: false });

interface Journey {
  id: string; journeyNo: string; status: string; purpose: string | null;
  vehicleId: string; driverId: string; plannedDeparture: string; plannedArrival: string;
  actualDeparture: string | null; riskLevel: string | null;
}

interface VehicleLive {
  vehicleId: string; lat: number; lon: number; speed: number; heading: number;
  ignition: boolean; status: string; lastSeen: string; online: boolean;
}

const TELEMETRY_FIELDS = [
  { k: 'speed', label: 'SPEED', unit: 'km/h', color: 'var(--primary)' },
  { k: 'heading', label: 'HEADING', unit: '\u00b0', color: 'var(--ink-2)' },
  { k: 'ignition', label: 'IGNITION', unit: '', color: 'var(--go)' },
];

export default function ActiveJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [liveState, setLiveState] = useState<VehicleLive | null>(null);

  const { data: journey } = useQuery({
    queryKey: ['journey', id],
    queryFn: async () => unwrap<Journey>(await api.get(`/journeys/${id}`)),
  });

  const { data: passengers } = useQuery({
    queryKey: ['journey-passengers', id],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/journeys/${id}/passengers`)),
  });

  // Live vehicle tracking via WebSocket
  useEffect(() => {
    if (!journey?.vehicleId) return;
    const unsub = subscribe(`vehicle:${journey.vehicleId}`, (update) => {
      const v = update as VehicleLive;
      if (v?.vehicleId) setLiveState({ ...v, online: true });
    });
    return unsub;
  }, [journey?.vehicleId]);

  // Also fetch initial live state
  useEffect(() => {
    if (!journey?.vehicleId) return;
    api.get(`/fleet/live/${journey.vehicleId}`).then(res => {
      const d = unwrap<VehicleLive>(res);
      if (d?.vehicleId) setLiveState(d);
    }).catch(() => {});
  }, [journey?.vehicleId]);

  if (!journey) return <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading...</div>;

  const elapsed = journey.actualDeparture
    ? Math.round((Date.now() - new Date(journey.actualDeparture).getTime()) / 60000)
    : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <Link href="/journeys" className="flex items-center gap-2 text-ink-3 hover:text-ink-0 transition-colors">
          <Glyph k="arrowL" size={14} />
          <span className="font-mono text-[11px]">JOURNEYS</span>
          <Glyph k="chevR" size={11} className="text-ink-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-ink-0">{journey.journeyNo}</span>
          <Pill status={journey.status} />
          {journey.purpose && <span className="font-mono text-[11px] text-ink-3">{journey.purpose}</span>}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-2 border border-line-soft">
          <span className={`w-1.5 h-1.5 rounded-full ${liveState?.online ? 'bg-[var(--go)]' : 'bg-ink-3'}`} />
          <span className="font-mono text-[10.5px] text-ink-2">
            {liveState?.online ? 'LIVE TRACKING' : 'OFFLINE'} &middot; {elapsed}m elapsed
          </span>
        </div>
        <button className="h-7 px-3 flex items-center gap-1.5 bg-bg-3 border border-line rounded-[6px] text-ink-1 text-[12px] hover:bg-bg-4 transition-colors">
          <Glyph k="phone" size={13} />Contact driver
        </button>
        <button className="h-7 px-3 flex items-center gap-1.5 bg-[var(--nogo)] border border-[var(--nogo)] rounded-[6px] text-white text-[12px] font-medium hover:opacity-90 transition-colors">
          <Glyph k="x" size={13} stroke={2.5} />Recall
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <FleetMap vehicles={liveState ? [liveState] : []} />

            {/* Telemetry HUD */}
            <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-panel/95 backdrop-blur border border-line rounded-[10px] px-4 py-3 flex gap-6">
              <TelField label="SPEED" value={liveState ? `${(liveState.speed ?? 0).toFixed(0)}` : '\u2014'} unit="km/h" color="var(--primary)" />
              <TelField label="HEADING" value={liveState ? `${(liveState.heading ?? 0).toFixed(0)}` : '\u2014'} unit="\u00b0" color="var(--ink-2)" />
              <TelField label="IGNITION" value={liveState?.ignition ? 'ON' : 'OFF'} unit="" color={liveState?.ignition ? 'var(--go)' : 'var(--ink-3)'} />
              <TelField label="STATUS" value={liveState?.online ? 'ONLINE' : 'OFFLINE'} unit="" color={liveState?.online ? 'var(--go)' : 'var(--nogo)'} />
              <TelField label="LAT" value={liveState ? liveState.lat.toFixed(4) : '\u2014'} unit="\u00b0N" color="var(--ink-2)" />
              <TelField label="LON" value={liveState ? liveState.lon.toFixed(4) : '\u2014'} unit="\u00b0E" color="var(--ink-2)" />
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="w-[340px] shrink-0 border-l border-line overflow-auto bg-bg-1">
          {/* Journey info */}
          <div className="px-4 py-3 border-b border-line">
            <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-2">Journey</div>
            <div className="flex flex-col gap-2">
              {[
                ['Departure', journey.actualDeparture ? new Date(journey.actualDeparture).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '\u2014'],
                ['ETA', new Date(journey.plannedArrival).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })],
                ['Risk', journey.riskLevel ?? '\u2014'],
                ['Vehicle', journey.vehicleId.slice(0, 8)],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-[11.5px] text-ink-3">{l}</span>
                  <span className="text-[11.5px] text-ink-0 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Passengers */}
          <div className="px-4 py-3 border-b border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-ink-0">Passengers</span>
              <span className="font-mono text-[10.5px] text-ink-3">{passengers?.length ?? 0}</span>
            </div>
            {passengers?.map((p) => (
              <div key={p.id as string} className="flex items-center gap-2 py-1.5">
                <Glyph k="check" size={12} className="text-[var(--go)]" />
                <span className="text-[12px] text-ink-0">{p.passengerName as string}</span>
                <span className="font-mono text-[10px] text-ink-3 ml-auto">{(p.boardingStatus as string) ?? 'manifested'}</span>
              </div>
            ))}
            {(!passengers || passengers.length === 0) && (
              <div className="text-[12px] text-ink-3 py-2">No passengers</div>
            )}
          </div>

          {/* Events during journey */}
          <div className="px-4 py-3">
            <div className="text-[13px] font-semibold text-ink-0 mb-2">Trip events</div>
            <div className="text-[12px] text-ink-3 py-4 text-center">No events yet</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TelField({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-[0.08em] text-ink-3 font-medium">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[16px] font-medium" style={{ color }}>{value}</span>
        {unit && <span className="font-mono text-[10px] text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}
