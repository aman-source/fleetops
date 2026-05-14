'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { subscribe } from '@/lib/ws';
import { Header } from '@/components/layout/header';
import { useLayout } from '@/stores/layout';
import { ChevronRight, ChevronLeft, Search } from '@/components/ui/icons';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), { ssr: false });

interface VehicleLive {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  status: string;
  lastSeen: string;
  online: boolean;
}

export default function MapPage() {
  const [liveVehicles, setLiveVehicles] = useState<VehicleLive[]>([]);
  const [search, setSearch] = useState('');
  const { rightPanelOpen, toggleRightPanel } = useLayout();

  const { data } = useQuery({
    queryKey: ['fleet-live'],
    queryFn: async () => unwrap<VehicleLive[]>(await api.get('/fleet/live')),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) setLiveVehicles(data);
  }, [data]);

  useEffect(() => {
    const unsub = subscribe('fleet:live', (update) => {
      const vehicle = update as VehicleLive;
      if (!vehicle?.vehicleId) return;
      setLiveVehicles((prev) => {
        const idx = prev.findIndex((v) => v.vehicleId === vehicle.vehicleId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...vehicle, online: true };
          return next;
        }
        return [...prev, { ...vehicle, online: true }];
      });
    });
    return unsub;
  }, []);

  const online = liveVehicles.filter((v) => v.online).length;
  const total = liveVehicles.length;
  const filtered = search
    ? liveVehicles.filter((v) => v.vehicleId?.toLowerCase().includes(search.toLowerCase()))
    : liveVehicles;

  return (
    <>
      <Header title="Control Tower" />
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <FleetMap vehicles={liveVehicles} />

          {/* Stats overlay */}
          <div className="absolute top-3 left-3 flex gap-2 z-[1000]">
            <div className="bg-panel/90 backdrop-blur border border-line rounded-[8px] px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-go" />
              <span className="text-ink-1 text-[12px] font-medium">{online} online</span>
            </div>
            <div className="bg-panel/90 backdrop-blur border border-line rounded-[8px] px-3 py-1.5">
              <span className="text-ink-2 text-[12px]">{total} total</span>
            </div>
          </div>
        </div>

        {/* Right panel: vehicle list */}
        <div className={`border-l border-line bg-panel flex flex-col shrink-0 transition-all duration-200 ${rightPanelOpen ? 'w-[280px]' : 'w-[36px]'}`}>
          {rightPanelOpen ? (
            <>
              {/* Header */}
              <div className="px-3 py-2.5 border-b border-line flex items-center justify-between shrink-0">
                <span className="text-ink-0 text-[12px] font-semibold">Vehicles</span>
                <button onClick={toggleRightPanel} className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-raised text-ink-3 hover:text-ink-1 transition-colors" title="Collapse">
                  <ChevronRight size={14} />
                </button>
              </div>
              {/* Search */}
              <div className="px-3 py-2 border-b border-line shrink-0">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicles..." className="w-full h-8 pl-8 pr-2.5 bg-surface border border-line rounded-[6px] text-ink-1 text-[12px] outline-none focus:border-primary transition-colors" />
                </div>
              </div>
              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-line-soft">
                {filtered.length === 0 && (
                  <div className="px-3 py-8 text-center text-ink-3 text-[12px]">{total === 0 ? 'No live vehicles' : 'No matches'}</div>
                )}
                {filtered.map((v) => (
                  <div key={v.vehicleId ?? Math.random()} className="px-3 py-2.5 hover:bg-raised transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-0 text-[12px] font-medium font-mono">{v.vehicleId?.slice(0, 8) ?? '\u2014'}</span>
                      <span className={`w-2 h-2 rounded-full ${v.online ? 'bg-go' : 'bg-ink-4'}`} />
                    </div>
                    <div className="text-ink-3 text-[11px] mt-0.5 font-mono">{(v.speed ?? 0).toFixed(0)} km/h · {v.ignition ? 'IGN ON' : 'IGN OFF'}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Collapsed: vertical tab */
            <button onClick={toggleRightPanel} className="flex-1 flex items-center justify-center text-ink-3 hover:text-ink-1 hover:bg-raised transition-colors" title="Show vehicles">
              <div className="flex flex-col items-center gap-2">
                <ChevronLeft size={14} />
                <span className="text-[10px] font-medium tracking-wider" style={{ writingMode: 'vertical-rl' }}>VEHICLES</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
