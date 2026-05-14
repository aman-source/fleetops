'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { subscribe } from '@/lib/ws';
import { useLayout } from '@/stores/layout';
import { Glyph, Spark } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), { ssr: false });

interface VehicleLive {
  vehicleId: string; lat: number; lon: number; speed: number; heading: number;
  ignition: boolean; status: string; lastSeen: string; online: boolean;
}

const KPIS = [
  { label: 'ACTIVE', value: 47, sub: '+6 vs yest', spark: [22,28,30,27,35,40,47], color: 'var(--primary)' },
  { label: 'GO', value: 218, sub: 'of 264 fleet', spark: [200,210,205,215,212,220,218], color: 'var(--go)' },
  { label: 'NO-GO', value: 14, sub: '3 critical', spark: [8,10,12,11,13,15,14], color: 'var(--nogo)' },
  { label: 'DEFECTS', value: 8, sub: '2 overdue', spark: [5,6,8,9,7,8,8], color: 'var(--cond)' },
];

const MOCK_EVENTS = [
  { t: '14:42:08', sev: 'nogo', v: '12-A-3471', d: 'OVERSPEED', m: '118 km/h \u00b7 zone limit 100' },
  { t: '14:38:51', sev: 'cond', v: '34-D-1129', d: 'IDLE > 15m', m: 'Engine on, no movement' },
  { t: '14:31:22', sev: 'info', v: '08-B-2204', d: 'WAYPOINT', m: 'Arrived Nimr-2 main camp' },
  { t: '14:18:04', sev: 'nogo', v: '21-C-7720', d: 'DEVIATION', m: '1.4 km off approved route' },
  { t: '14:02:11', sev: 'cond', v: '17-D-8841', d: 'HARSH BR.', m: 'Decel 0.42g' },
  { t: '13:54:39', sev: 'go', v: '02-A-1003', d: 'JOURNEY OK', m: 'Closed at Marmul base' },
];

const MOCK_JOURNEYS = [
  { id: 'JM-25-04018', driver: 'D. Al-Busaidi', veh: '12-A-3471', dest: 'Nimr-B \u2192 Marmul', risk: 'M', eta: '15:50', prog: 78, status: 'active' },
  { id: 'JM-25-04017', driver: 'M. Al-Harthi', veh: '34-D-1129', dest: 'Fahud \u2192 Bahja', risk: 'L', eta: '16:25', prog: 62, status: 'delayed' },
  { id: 'JM-25-04016', driver: 'S. Al-Rawahi', veh: '08-B-2204', dest: 'Workshop \u2192 Nimr-2', risk: 'L', eta: '14:30', prog: 100, status: 'completed' },
  { id: 'JM-25-04014', driver: 'F. Al-Amri', veh: '21-C-7720', dest: 'Saih Rawl \u2192 Camp 12', risk: 'H', eta: '17:10', prog: 41, status: 'deviated' },
];

const SEV_DOT: Record<string, string> = { go: 'bg-[var(--go)]', cond: 'bg-[var(--cond)]', nogo: 'bg-[var(--nogo)]', info: 'bg-[var(--primary)]' };

export default function MapPage() {
  const [liveVehicles, setLiveVehicles] = useState<VehicleLive[]>([]);
  const { rightPanelOpen, toggleRightPanel } = useLayout();
  const [mapTab, setMapTab] = useState('Active journeys');

  const { data } = useQuery({
    queryKey: ['fleet-live'],
    queryFn: async () => unwrap<VehicleLive[]>(await api.get('/fleet/live')),
    refetchInterval: 30_000,
  });

  useEffect(() => { if (data) setLiveVehicles(data); }, [data]);

  useEffect(() => {
    const unsub = subscribe('fleet:live', (update) => {
      const v = update as VehicleLive;
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold text-ink-0">Live fleet map</span>
          <span className="font-mono text-[10.5px] text-ink-3">OMAN \u00b7 MARMUL OPS \u00b7 {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-2 border border-line-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--go)]" />
          <span className="font-mono text-[10.5px] text-ink-2">LIVE \u00b7 {online || 248} devices online</span>
        </div>
        <button className="h-7 px-2 flex items-center bg-bg-3 border border-line rounded-[6px] text-ink-1 hover:bg-bg-4 transition-colors">
          <Glyph k="bell" size={14} stroke={1.8} />
        </button>
        <button className="h-7 px-3 flex items-center gap-1.5 bg-[var(--primary)] border border-[var(--primary)] rounded-[6px] text-white text-[12px] font-medium hover:bg-[var(--primary-2)] transition-colors">
          <Glyph k="plus" size={13} stroke={2} />New journey
        </button>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3 px-5 pt-3.5 shrink-0">
        {KPIS.map(k => (
          <div key={k.label} className="flex-1 bg-panel border border-line rounded-[10px] px-3.5 py-3">
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

      {/* Main grid: map + right panel */}
      <div className="flex gap-3 p-3.5 flex-1 min-h-0">
        {/* Map panel */}
        <div className="flex-1 flex flex-col bg-panel border border-line rounded-[10px] overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line shrink-0">
            <div className="flex gap-0">
              {['All fleet','Active journeys','No-Go','Geofences','Heat'].map(t => (
                <button key={t} onClick={() => setMapTab(t)}
                  className={`text-[12px] px-2.5 py-1 rounded-full transition-colors ${mapTab === t ? 'bg-bg-3 text-ink-0' : 'text-ink-2 hover:text-ink-0'}`}>{t}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-3">PDO BLOCK 6 \u00b7 INTERIOR OMAN</span>
              <button className="h-6 px-2 flex items-center gap-1 text-ink-2 hover:text-ink-0 text-[11px] transition-colors">
                <Glyph k="filter" size={12} />Filters
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <FleetMap vehicles={liveVehicles} />
          </div>
        </div>

        {/* Right column */}
        {rightPanelOpen ? (
          <div className="flex flex-col gap-3 shrink-0" style={{ width: 340 }}>
            {/* Event stream */}
            <div className="bg-panel border border-line rounded-[10px] flex flex-col">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink-0">Event stream</span>
                  <Pill status="nogo" label="3 critical" />
                </div>
                <span className="font-mono text-[10px] text-ink-3">LAST 30 MIN</span>
              </div>
              <div className="flex flex-col" style={{ maxHeight: 240, overflow: 'hidden' }}>
                {MOCK_EVENTS.map((e, i) => (
                  <div key={i} className="flex gap-2.5 px-3 py-2" style={{ borderBottom: i < MOCK_EVENTS.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                    <span className={`w-1 self-stretch rounded-sm shrink-0 ${SEV_DOT[e.sev] || 'bg-ink-3'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-ink-0">{e.d}</span>
                        <span className="font-mono text-[10px] text-ink-3">{e.t}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-px">
                        <span className="text-[11.5px] text-ink-2 truncate">{e.m}</span>
                        <span className="font-mono text-[10px] text-ink-3 shrink-0">{e.v}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active journeys */}
            <div className="bg-panel border border-line rounded-[10px] flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-line">
                <span className="text-[13px] font-semibold text-ink-0">Active journeys</span>
                <div className="flex gap-1.5">
                  <Glyph k="grid" size={12} className="text-ink-3" />
                  <Glyph k="list" size={12} className="text-ink-0" />
                </div>
              </div>
              <div className="flex flex-col overflow-hidden">
                {MOCK_JOURNEYS.map((j, i) => (
                  <div key={j.id} className="px-3 py-2.5 hover:bg-raised transition-colors cursor-pointer" style={{ borderBottom: i < MOCK_JOURNEYS.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-ink-0">{j.id}</span>
                      <Pill status={j.status} />
                    </div>
                    <div className="text-[12px] text-ink-1 mt-1">{j.dest}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-mono text-[10px] text-ink-3">{j.veh} \u00b7 {j.driver}</span>
                      <span className="font-mono text-[10px] text-ink-2">ETA {j.eta}</span>
                    </div>
                    <div className="h-[3px] bg-bg-3 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: j.prog + '%',
                        background: j.status === 'deviated' ? 'var(--nogo)' : j.status === 'delayed' ? 'var(--cond)' : j.status === 'completed' ? 'var(--go)' : 'var(--primary)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <button onClick={toggleRightPanel} className="w-[36px] shrink-0 bg-panel border border-line rounded-[10px] flex items-center justify-center text-ink-3 hover:text-ink-0 hover:bg-raised transition-colors" title="Show panel">
            <div className="flex flex-col items-center gap-2">
              <Glyph k="chevL" size={14} />
              <span className="text-[10px] font-medium tracking-wider" style={{ writingMode: 'vertical-rl' as const }}>EVENTS</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
