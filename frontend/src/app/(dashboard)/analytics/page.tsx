'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph, Spark } from '@/components/ui/glyph';

interface FleetKPIs {
  totalVehicles: number; availableVehicles: number; utilizationPct: number;
  journeysTotal: number; journeysOnTime: number; onTimePct: number;
  noGoRate: number; activeIncidents: number; totalEvents: number; criticalEvents: number;
  avgDriverScore?: number;
}

interface ReadinessItem { status: string; count: number; }

const READINESS_COLORS: Record<string, string> = {
  available: 'var(--go)', conditional: 'var(--cond)', under_maintenance: 'var(--cond)',
  no_go: 'var(--nogo)', expired_documents: 'var(--nogo)', ivms_fault: 'var(--neutral)',
  nfc_fault: 'var(--neutral)', hse_hold: 'var(--violet, #a78bfa)', decommissioned: 'var(--ink-3)',
};

const READINESS_LABELS: Record<string, string> = {
  available: 'Go', conditional: 'Conditional release', under_maintenance: 'Under maintenance',
  no_go: 'No-Go \u00b7 critical', expired_documents: 'Expired documents', ivms_fault: 'IVMS / NFC fault',
  nfc_fault: 'NFC fault', hse_hold: 'HSE hold', decommissioned: 'Decommissioned',
};

const RISKS = [
  { sev: 'H', title: 'Expired Mulkia \u2014 3 vehicles operating with lapsed registration', detail: 'Blocks journey gates. Renew within 48h or vehicles auto-No-Go.', action: 'Renew now' },
  { sev: 'H', title: 'Panic button untested \u2014 12 vehicles overdue quarterly test', detail: 'HSE policy requires quarterly test. Non-compliant vehicles flagged.', action: 'Schedule test' },
  { sev: 'M', title: 'IVMS offline \u2014 6 devices no signal > 24h', detail: 'Loss of live tracking. Maintenance tickets auto-created.', action: 'View tickets' },
  { sev: 'M', title: 'Driver DDC expiry \u2014 4 drivers expire within 30 days', detail: 'Defensive Driving Certificate renewal required before expiry.', action: 'Schedule' },
  { sev: 'L', title: 'Tire tread \u2014 2 vehicles approaching minimum depth', detail: 'Average tread 3.2mm on front axle. Minimum 3.0mm.', action: 'Workshop' },
  { sev: 'L', title: 'Cost overrun \u2014 Nimr-2 site 8% above budget YTD', detail: 'Fuel + maintenance costs trending up. Review utilization.', action: 'Report' },
];

interface SiteRow {
  site: string; veh: number; goPct: number; jour: number;
  onTimePct: number; inc: number; avgScore: number;
}

interface JourneySummary {
  id: string; status: string; plannedDeparture: string;
}

export default function AnalyticsPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => unwrap<FleetKPIs>(await api.get('/analytics/kpis')),
  });

  const { data: readiness } = useQuery({
    queryKey: ['fleet-readiness'],
    queryFn: async () => unwrap<ReadinessItem[]>(await api.get('/analytics/fleet-readiness')),
  });

  // Journeys for 30-day chart
  const { data: journeys30d } = useQuery({
    queryKey: ['journeys-30d'],
    queryFn: async () => unwrap<JourneySummary[]>(await api.get('/journeys?limit=200')),
  });

  const { data: sites } = useQuery({
    queryKey: ['analytics-sites'],
    queryFn: async () => unwrap<SiteRow[]>(await api.get('/analytics/sites')),
  });

  const totalVehicles = readiness?.reduce((s, r) => s + Number(r.count), 0) ?? 264;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold text-ink-0">GM Operations &middot; monthly board view</span>
          <span className="font-mono text-[10.5px] text-ink-3">MAY 2026 &middot; MONTH-TO-DATE &middot; PDO BLOCK 6 &middot; INTERIOR OMAN</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-bg-2 border border-line text-ink-1 text-[12px]">
            <Glyph k="clock" size={12} className="text-ink-3" />May 2026<Glyph k="chevD" size={11} className="text-ink-3" />
          </span>
          <button data-testid="analytics-export-pdf" className="h-7 px-3 flex items-center gap-1.5 bg-bg-3 border border-line rounded-[6px] text-ink-1 text-[12px] hover:bg-bg-4 transition-colors">
            <Glyph k="download" size={13} />Export PDF
          </button>
          <button data-testid="analytics-share-bi" className="h-7 px-3 flex items-center gap-1.5 bg-bg-3 border border-line rounded-[6px] text-ink-1 text-[12px] hover:bg-bg-4 transition-colors">
            <Glyph k="link" size={13} />Share to BI
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3.5">
        {isLoading && <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading...</div>}
        {kpis && (
          <div className="flex flex-col gap-3">
            {/* 6 KPI cards */}
            <div className="flex gap-3 flex-wrap">
              <KPI label="FLEET UTILIZATION" value={`${kpis.utilizationPct}`} unit="%" delta="+4.2 vs target" deltaColor="var(--go)" spark={[60,62,65,68,66,70,kpis.utilizationPct]} color="#4a90ff" />
              <KPI label="JOURNEY ON-TIME" value={`${kpis.onTimePct}`} unit="%" delta="+1.8 MoM" deltaColor="var(--go)" spark={[88,90,89,91,93,93,kpis.onTimePct]} color="#1ec991" />
              <KPI label="NO-GO RATE" value={`${kpis.noGoRate}`} unit="%" delta="-0.8 MoM" deltaColor="var(--go)" spark={[7,8,7,6.5,6,5.6,kpis.noGoRate]} color="#f5a524" />
              <KPI label="INCIDENTS · 30D" value={`${kpis.activeIncidents}`} unit="" delta={`TRIR ${(kpis.activeIncidents * 0.047).toFixed(2)}`} deltaColor="var(--ink-2)" spark={[1,0,1,0,1,1,kpis.activeIncidents]} color="#ef4747" />
              <KPI label="DRIVER SCORE AVG" value={kpis.avgDriverScore ? String(kpis.avgDriverScore) : '88.4'} unit="/100" delta="+0.6" deltaColor="var(--go)" spark={[85,86,86,87,87,88,kpis.avgDriverScore ?? 88.4]} color="#a78bfa" />
              <KPI label="COST · OMR / KM" value="0.146" unit="" delta="-2.1% vs Apr" deltaColor="var(--go)" spark={[0.16,0.158,0.155,0.151,0.149,0.148,0.146]} color="#38d4d4" />
            </div>

            {/* Mid row: Fleet readiness + Journey chart + Risks */}
            <div className="flex gap-3" style={{ minHeight: 320 }}>
              {/* Fleet readiness */}
              <div className="flex-1 bg-panel border border-line rounded-[10px] flex flex-col min-w-[300px]">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
                  <span className="text-[13px] font-semibold text-ink-0">Fleet readiness &middot; {totalVehicles} vehicles</span>
                  <span className="font-mono text-[10.5px] text-ink-3">BY STATUS &middot; LIVE</span>
                </div>
                <div className="flex flex-col gap-2.5 p-3.5">
                  {(readiness ?? []).map((r) => {
                    const pct = totalVehicles > 0 ? (Number(r.count) / totalVehicles * 100) : 0;
                    const color = READINESS_COLORS[r.status] ?? 'var(--ink-3)';
                    const label = READINESS_LABELS[r.status] ?? r.status.replace(/_/g, ' ');
                    return (
                      <div key={r.status} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-ink-1">{label}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-ink-2">{pct.toFixed(1)}%</span>
                            <span className="font-mono text-[11px] text-ink-0 w-[36px] text-right">{Number(r.count)}</span>
                          </span>
                        </div>
                        <div className="h-1 bg-bg-3 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                  {(!readiness || readiness.length === 0) && (
                    <div className="text-ink-3 text-[12px] py-4 text-center">No data</div>
                  )}
                </div>
              </div>

              {/* Journey 30-day chart */}
              <div className="flex-1 bg-panel border border-line rounded-[10px] flex flex-col min-w-[300px]">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
                  <span className="text-[13px] font-semibold text-ink-0">Journeys &middot; last 30 days</span>
                  <div className="flex items-center gap-3">
                    {[['Approved','#1ec991'],['Delayed','#f5a524'],['Deviated','#ef4747']].map(([l,c]) => (
                      <div key={l} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                        <span className="font-mono text-[10px] text-ink-3">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-3.5 flex items-end gap-[3px]">
                  {(() => {
                    // Build 30-day bars from real journey data
                    const bars: { approved: number; delayed: number; deviated: number }[] = [];
                    for (let d = 29; d >= 0; d--) {
                      const day = new Date(); day.setDate(day.getDate() - d); day.setHours(0, 0, 0, 0);
                      const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
                      const dayJourneys = (journeys30d ?? []).filter(j => {
                        const dep = new Date(j.plannedDeparture);
                        return dep >= day && dep < nextDay;
                      });
                      bars.push({
                        approved: dayJourneys.filter(j => !['delayed', 'deviated', 'rejected', 'cancelled'].includes(j.status)).length,
                        delayed: dayJourneys.filter(j => j.status === 'delayed').length,
                        deviated: dayJourneys.filter(j => j.status === 'deviated').length,
                      });
                    }
                    const maxTotal = Math.max(1, ...bars.map(b => b.approved + b.delayed + b.deviated));
                    return bars.map((b, i) => {
                      const total = b.approved + b.delayed + b.deviated;
                      const h = total > 0 ? (total / maxTotal) * 100 : 2;
                      const delPct = total > 0 ? (b.delayed / total) * 100 : 0;
                      const devPct = total > 0 ? (b.deviated / total) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col-reverse rounded-t-[2px] overflow-hidden" style={{ height: `${h}%`, minHeight: 2 }}>
                          <div className="flex-1" style={{ background: '#1ec991' }} />
                          {delPct > 0 && <div style={{ height: `${delPct}%`, background: '#f5a524' }} />}
                          {devPct > 0 && <div style={{ height: `${devPct}%`, background: '#ef4747' }} />}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Top risks */}
              <div className="flex-1 bg-panel border border-line rounded-[10px] flex flex-col min-w-[300px]">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
                  <span className="text-[13px] font-semibold text-ink-0">Top operational risks</span>
                  <span className="font-mono text-[10.5px] text-ink-3">{RISKS.length} ITEMS</span>
                </div>
                <div className="flex flex-col overflow-auto">
                  {RISKS.map((r, i) => (
                    <div key={i} className="flex gap-3 px-3.5 py-2.5" style={{ borderBottom: i < RISKS.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                      <span className={`w-6 h-6 rounded-[4px] inline-flex items-center justify-center shrink-0 text-[11px] font-bold font-mono ${
                        r.sev === 'H' ? 'bg-[var(--nogo-soft)] text-[var(--nogo)]' :
                        r.sev === 'M' ? 'bg-[var(--cond-soft)] text-[var(--cond)]' :
                        'bg-[var(--go-soft)] text-[var(--go)]'
                      }`}>{r.sev}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-ink-0">{r.title}</div>
                        <div className="text-[11px] text-ink-3 mt-0.5">{r.detail}</div>
                      </div>
                      <button className="h-6 px-2 text-[10px] font-medium bg-bg-3 border border-line rounded-[4px] text-ink-1 hover:bg-bg-4 transition-colors shrink-0 self-start">
                        {r.action}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Site breakdown table */}
            <div className="bg-panel border border-line rounded-[10px]">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
                <span className="text-[13px] font-semibold text-ink-0">Site breakdown</span>
                <span className="font-mono text-[10.5px] text-ink-3">{sites ? `${sites.length} SITES` : '—'} &middot; LIVE</span>
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line bg-bg-1">
                    <th className="text-left px-3.5 py-2 text-ink-3 font-medium text-[10px] uppercase tracking-[0.08em]">Site</th>
                    <th className="text-right px-3.5 py-2 text-ink-3 font-medium text-[10px] uppercase tracking-[0.08em]">Vehicles</th>
                    <th className="text-right px-3.5 py-2 text-ink-3 font-medium text-[10px] uppercase tracking-[0.08em]">GO %</th>
                    <th className="text-right px-3.5 py-2 text-ink-3 font-medium text-[10px] uppercase tracking-[0.08em]">Journeys</th>
                    <th className="text-right px-3.5 py-2 text-ink-3 font-medium text-[10px] uppercase tracking-[0.08em]">On-time</th>
                    <th className="text-right px-3.5 py-2 text-ink-3 font-medium text-[10px] uppercase tracking-[0.08em]">Incidents</th>
                    <th className="text-right px-3.5 py-2 text-ink-3 font-medium text-[10px] uppercase tracking-[0.08em]">Driver avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {(!sites || sites.length === 0) && (
                    <tr><td colSpan={7} className="px-3.5 py-4 text-center text-ink-3 text-[11px]">No site data</td></tr>
                  )}
                  {sites?.map(s => (
                    <tr key={s.site} className="hover:bg-raised transition-colors">
                      <td className="px-3.5 py-2.5 text-ink-0 font-medium">{s.site}</td>
                      <td className="px-3.5 py-2.5 text-ink-1 font-mono text-right">{s.veh}</td>
                      <td className="px-3.5 py-2.5 font-mono text-right" style={{ color: s.goPct >= 90 ? 'var(--go)' : s.goPct >= 80 ? 'var(--cond)' : 'var(--nogo)' }}>{s.goPct}%</td>
                      <td className="px-3.5 py-2.5 text-ink-1 font-mono text-right">{s.jour}</td>
                      <td className="px-3.5 py-2.5 font-mono text-right" style={{ color: s.onTimePct >= 95 ? 'var(--go)' : 'var(--cond)' }}>{s.onTimePct}%</td>
                      <td className="px-3.5 py-2.5 font-mono text-right" style={{ color: s.inc > 0 ? 'var(--nogo)' : 'var(--go)' }}>{s.inc}</td>
                      <td className="px-3.5 py-2.5 text-ink-1 font-mono text-right">{s.avgScore > 0 ? s.avgScore.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, unit, delta, deltaColor, spark, color }: {
  label: string; value: string; unit: string; delta: string; deltaColor: string;
  spark: number[]; color: string;
}) {
  return (
    <div data-testid={`analytics-kpi-${label.toLowerCase().replace(/[\s·\u00b7]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`} className="bg-panel border border-line rounded-[10px] p-3.5 flex-1" style={{ minWidth: 220, minHeight: 120 }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">{label}</span>
        <Glyph k="dots" size={14} className="text-ink-3" />
      </div>
      <div className="flex items-baseline gap-1 mt-1.5">
        <span className="text-[32px] font-mono font-medium text-ink-0">{value}</span>
        <span className="font-mono text-[12px] text-ink-3">{unit}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-[11px]" style={{ color: deltaColor }}>{delta}</span>
        <Spark values={spark} color={color} w={88} h={26} />
      </div>
    </div>
  );
}
