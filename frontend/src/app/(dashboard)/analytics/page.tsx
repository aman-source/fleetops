'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Header } from '@/components/layout/header';

interface FleetKPIs {
  totalVehicles: number;
  availableVehicles: number;
  utilizationPct: number;
  journeysTotal: number;
  journeysOnTime: number;
  onTimePct: number;
  noGoRate: number;
  activeIncidents: number;
  totalEvents: number;
  criticalEvents: number;
}

function KPICard({ label, value, unit, color }: { label: string; value: number | string; unit?: string; color?: string }) {
  return (
    <div className="bg-panel border border-line rounded-[10px] p-4">
      <div className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-2">{label}</div>
      <div className={`text-[28px] font-mono font-medium ${color ?? 'text-ink-0'}`}>
        {value}{unit && <span className="text-[14px] text-ink-2 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => unwrap<FleetKPIs>(await api.get('/analytics/kpis')),
  });

  return (
    <>
      <Header title="Analytics & KPIs" />
      <div className="flex-1 overflow-auto p-4">
        {isLoading && <div className="text-ink-3 text-[13px]">Loading KPIs...</div>}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Vehicles" value={kpis.totalVehicles} />
            <KPICard label="Available" value={kpis.availableVehicles} color="text-[var(--go)]" />
            <KPICard label="Utilization" value={kpis.utilizationPct} unit="%" />
            <KPICard label="No-Go Rate" value={kpis.noGoRate} unit="%" color={kpis.noGoRate > 10 ? 'text-[var(--nogo)]' : 'text-ink-0'} />
            <KPICard label="Total Journeys" value={kpis.journeysTotal} />
            <KPICard label="On-Time" value={kpis.onTimePct} unit="%" color="text-[var(--go)]" />
            <KPICard label="Active Incidents" value={kpis.activeIncidents} color={kpis.activeIncidents > 0 ? 'text-[var(--nogo)]' : 'text-[var(--go)]'} />
            <KPICard label="Critical Events" value={kpis.criticalEvents} color={kpis.criticalEvents > 0 ? 'text-[var(--nogo)]' : 'text-ink-0'} />
          </div>
        )}
      </div>
    </>
  );
}
