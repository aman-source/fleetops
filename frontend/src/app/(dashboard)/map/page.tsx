'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { subscribe } from '@/lib/ws';
import { Header } from '@/components/layout/header';

// Leaflet must be loaded client-side only
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

  // Initial fetch
  const { data } = useQuery({
    queryKey: ['fleet-live'],
    queryFn: async () => unwrap<VehicleLive[]>(await api.get('/fleet/live')),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) setLiveVehicles(data);
  }, [data]);

  // WebSocket real-time updates
  useEffect(() => {
    const unsub = subscribe('fleet:live', (update) => {
      const vehicle = update as VehicleLive;
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
            <div className="bg-panel/90 backdrop-blur border border-line rounded-[8px] px-3 py-1.5 flex items-center gap-2">
              <span className="text-ink-2 text-[12px]">{total} total</span>
            </div>
          </div>
        </div>

        {/* Vehicle list sidebar */}
        <div className="w-[280px] border-l border-line bg-panel overflow-y-auto">
          <div className="px-3 py-2 border-b border-line">
            <input
              type="text"
              placeholder="Search vehicles..."
              className="w-full h-8 px-2.5 bg-surface border border-line rounded-[6px] text-ink-1 text-[12px] outline-none focus:border-primary"
            />
          </div>
          <div className="divide-y divide-line-soft">
            {liveVehicles.map((v) => (
              <div key={v.vehicleId} className="px-3 py-2 hover:bg-raised transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-ink-1 text-[12px] font-medium">{v.vehicleId.slice(0, 8)}</span>
                  <span className={`w-2 h-2 rounded-full ${v.online ? 'bg-go' : 'bg-ink-4'}`} />
                </div>
                <div className="text-ink-3 text-[11px] mt-0.5">
                  {v.speed.toFixed(0)} km/h · {v.ignition ? 'ON' : 'OFF'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
