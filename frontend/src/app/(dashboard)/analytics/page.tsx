'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph, Spark } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';

interface FleetKPIs {
  totalVehicles: number; availableVehicles: number; utilizationPct: number;
  journeysTotal: number; journeysOnTime: number; onTimePct: number;
  noGoRate: number; activeIncidents: number; totalEvents: number; criticalEvents: number;
}

interface ReadinessItem { status: string; count: number; }

export default function AnalyticsPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => unwrap<FleetKPIs>(await api.get('/analytics/kpis')),
  });

  const { data: readiness } = useQuery({
    queryKey: ['fleet-readiness'],
    queryFn: async () => unwrap<ReadinessItem[]>(await api.get('/analytics/fleet-readiness')),
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold text-ink-0">GM / Ops Dashboard</span>
          <span className="font-mono text-[10.5px] text-ink-3">FLEET PERFORMANCE &middot; REAL-TIME</span>
        </div>
        <div className="flex-1" />
        <button className="h-7 px-3 flex items-center gap-1.5 bg-bg-3 border border-line rounded-[6px] text-ink-1 text-[12px] hover:bg-bg-4 transition-colors">
          <Glyph k="download" size={13} />Export PDF
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {isLoading && <div className="text-ink-3 text-[13px]">Loading...</div>}
        {kpis && (
          <>
            {/* KPI cards row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <KPICard label="TOTAL FLEET" value={kpis.totalVehicles} spark={[20,20,20,20,20,20,20]} color="var(--ink-0)" />
              <KPICard label="AVAILABLE" value={kpis.availableVehicles} spark={[180,190,200,195,210,215,kpis.availableVehicles]} color="var(--go)" />
              <KPICard label="UTILIZATION" value={`${kpis.utilizationPct}%`} spark={[55,60,58,62,65,60,kpis.utilizationPct]} color="var(--primary)" />
              <KPICard label="NO-GO RATE" value={`${kpis.noGoRate}%`} spark={[3,5,4,6,5,4,kpis.noGoRate]} color="var(--nogo)" warn={kpis.noGoRate > 10} />
            </div>

            {/* KPI cards row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <KPICard label="JOURNEYS" value={kpis.journeysTotal} spark={[30,35,40,38,42,45,kpis.journeysTotal]} color="var(--primary)" />
              <KPICard label="ON-TIME" value={`${kpis.onTimePct}%`} spark={[85,88,90,87,92,90,kpis.onTimePct]} color="var(--go)" />
              <KPICard label="INCIDENTS" value={kpis.activeIncidents} spark={[0,1,0,2,1,0,kpis.activeIncidents]} color={kpis.activeIncidents > 0 ? 'var(--nogo)' : 'var(--go)'} warn={kpis.activeIncidents > 0} />
              <KPICard label="EVENTS" value={kpis.totalEvents} sub={`${kpis.criticalEvents} critical`} spark={[10,15,12,18,14,16,kpis.totalEvents > 100 ? 100 : kpis.totalEvents]} color="var(--cond)" />
            </div>

            {/* Fleet readiness breakdown */}
            {readiness && readiness.length > 0 && (
              <div className="bg-panel border border-line rounded-[10px] p-4 mb-4">
                <div className="text-[13px] font-semibold text-ink-0 mb-3">Fleet Readiness Breakdown</div>
                <div className="flex gap-2 flex-wrap">
                  {readiness.map((r) => {
                    const total = readiness.reduce((sum, x) => sum + Number(x.count), 0);
                    const pct = total > 0 ? Math.round((Number(r.count) / total) * 100) : 0;
                    return (
                      <div key={r.status} className="flex items-center gap-3 bg-bg-2 border border-line rounded-[8px] px-3 py-2 min-w-[140px]">
                        <Pill status={r.status} />
                        <div className="flex items-baseline gap-1">
                          <span className="text-[18px] font-mono font-medium text-ink-0">{Number(r.count)}</span>
                          <span className="text-[11px] text-ink-3">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Operational risks */}
            <div className="bg-panel border border-line rounded-[10px] p-4">
              <div className="text-[13px] font-semibold text-ink-0 mb-3">Top Operational Risks</div>
              <div className="flex flex-col gap-2">
                {[
                  { risk: 'Document expiry — 3 vehicles with expired Mulkia', level: 'H', action: 'Renew immediately' },
                  { risk: 'IVMS fault — 2 devices offline > 24h', level: 'M', action: 'Maintenance ticket raised' },
                  { risk: 'Driver DDC expiry — 4 drivers expire within 30 days', level: 'M', action: 'Schedule renewal' },
                  { risk: 'Tire tread — 1 vehicle below minimum', level: 'L', action: 'Scheduled for workshop' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-bg-2 border border-line rounded-[8px]">
                    <span className={`font-bold font-mono text-[12px] w-5 text-center ${r.level === 'H' ? 'text-[var(--nogo)]' : r.level === 'M' ? 'text-[var(--cond)]' : 'text-[var(--go)]'}`}>{r.level}</span>
                    <div className="flex-1">
                      <div className="text-[12px] text-ink-0">{r.risk}</div>
                      <div className="text-[11px] text-ink-3 mt-0.5">{r.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, spark, color, warn }: {
  label: string; value: string | number; sub?: string; spark: number[]; color: string; warn?: boolean;
}) {
  return (
    <div className={`bg-panel border rounded-[10px] px-3.5 py-3 ${warn ? 'border-[rgba(239,71,71,0.3)]' : 'border-line'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">{label}</span>
        <Spark values={spark} color={color} w={64} h={20} />
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-[28px] font-mono font-medium" style={{ color }}>{value}</span>
        {sub && <span className="font-mono text-[10.5px] text-ink-3">{sub}</span>}
      </div>
    </div>
  );
}
