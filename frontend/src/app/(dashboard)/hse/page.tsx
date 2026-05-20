'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph, Spark } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';

interface Incident {
  id: string;
  tier: number;
  status: string;
  situation: string | null;
  vehiclePlateNo: string | null;
  currentStep: string | null;
  startedAt: string;
  closedAt: string | null;
}

interface DriverScore {
  driverId: string;
  driverName: string;
  totalScore: string | number | null;
  overspeedCount: number;
  harshBrakingCount: number;
  harshAccelCount: number;
  idleCount: number;
}

interface Event {
  id: string;
  eventType: string;
  severity: string;
  vehiclePlateNo: string | null;
  driverName: string | null;
  recordedAt: string;
  actionStatus: string;
}

const PLAYBOOK_STEPS = ['acknowledge', 'assess', 'contain', 'notify', 'investigate', 'close'] as const;

export default function HSEConsolePage() {
  const { data: incidents } = useQuery({
    queryKey: ['incidents-all'],
    queryFn: async () => unwrap<Incident[]>(await api.get('/incidents?limit=50')),
  });

  const { data: scores } = useQuery({
    queryKey: ['driver-scores'],
    queryFn: async () => unwrap<DriverScore[]>(await api.get('/driver-scores?limit=10&sort=totalScore&order=desc')),
  });

  const { data: events } = useQuery({
    queryKey: ['events-recent'],
    queryFn: async () => unwrap<Event[]>(await api.get('/events?limit=15&sort=recordedAt&order=desc')),
  });

  const { data: ltiData } = useQuery({
    queryKey: ['analytics-lti'],
    queryFn: async () => unwrap<{ daysSinceLti: number; lastLtiDate: string | null }>(await api.get('/analytics/lti')),
  });

  const activeIncidents = incidents?.filter(i => i.status !== 'closed') ?? [];
  const totalActive = activeIncidents.length;
  const todayEvents = events?.filter(e => {
    const d = new Date(e.recordedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length ?? 0;
  const avgScore = scores && scores.length > 0
    ? (scores.reduce((s, d) => s + Number(d.totalScore ?? 0), 0) / scores.length).toFixed(1)
    : '—';

  const kpis = [
    { label: 'ACTIVE INCIDENTS', value: String(totalActive), delta: totalActive > 0 ? `${totalActive} open` : 'None', color: totalActive > 0 ? 'var(--nogo)' : 'var(--go)', spark: [2, 3, 1, 4, 2, 3, 1, totalActive] },
    { label: 'EVENTS TODAY', value: String(todayEvents), delta: 'last 24h', color: 'var(--cond)', spark: [5, 8, 12, 7, 9, 11, 6, todayEvents] },
    { label: 'DRIVER SCORE AVG', value: avgScore, delta: '/100', color: 'var(--primary)', spark: [82, 84, 86, 85, 87, 88, 86, Number(avgScore) || 85] },
    { label: 'DAYS SINCE LTI', value: String(ltiData?.daysSinceLti ?? '—'), delta: 'Lost Time Injury', color: 'var(--go)', spark: ltiData ? [ltiData.daysSinceLti - 7, ltiData.daysSinceLti - 6, ltiData.daysSinceLti - 5, ltiData.daysSinceLti - 4, ltiData.daysSinceLti - 3, ltiData.daysSinceLti - 2, ltiData.daysSinceLti - 1, ltiData.daysSinceLti] : [100, 110, 120, 125, 130, 135, 140, 142] },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-bg-1 border-b border-line shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full bg-[var(--nogo)] animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">HSE Console</span>
        </div>
        <h1 className="text-[18px] font-semibold text-ink-0">HSE dashboard</h1>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {kpis.map(k => (
            <div key={k.label} className="bg-panel border border-line rounded-[10px] px-3.5 py-3 flex items-start justify-between" style={{ minHeight: 100 }}>
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">{k.label}</div>
                <div className="text-[32px] font-mono font-semibold leading-tight mt-1" style={{ color: k.color }}>{k.value}</div>
                <div className="text-[11px] text-ink-3 mt-0.5">{k.delta}</div>
              </div>
              <Spark values={k.spark} color={k.color} w={72} h={24} />
            </div>
          ))}
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-[1fr_1fr] gap-5" style={{ minHeight: 400 }}>
          {/* LEFT: Active incidents */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink-0">Active Incidents</span>
              <span className="text-[11px] text-ink-3 font-mono">{totalActive} open</span>
            </div>
            {activeIncidents.length === 0 && (
              <div className="bg-panel border border-line rounded-[10px] p-6 text-center">
                <Glyph k="shield" size={28} stroke={1.2} className="text-[var(--go)] mx-auto mb-2" />
                <div className="text-[13px] text-ink-2">No active incidents</div>
                <div className="text-[11px] text-ink-3 mt-1">All clear</div>
              </div>
            )}
            {activeIncidents.map(inc => {
              const stepIdx = PLAYBOOK_STEPS.indexOf(inc.currentStep as typeof PLAYBOOK_STEPS[number]);
              const progress = stepIdx >= 0 ? ((stepIdx + 1) / PLAYBOOK_STEPS.length) * 100 : 0;
              const elapsed = getElapsed(inc.startedAt);
              return (
                <div key={inc.id} className="bg-panel border border-line rounded-[10px] p-3.5 cursor-pointer hover:border-[var(--primary)] transition-colors"
                  onClick={() => window.location.href = `/hse/${inc.id}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-[4px] text-[11px] font-bold font-mono text-white ${inc.tier >= 3 ? 'bg-[var(--nogo)]' : inc.tier === 2 ? 'bg-[var(--cond)]' : 'bg-[var(--info)]'}`}>
                        T{inc.tier}
                      </span>
                      <span className="text-[12.5px] text-ink-0 font-medium">{inc.situation ?? 'Incident'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ink-3">
                      <Glyph k="refresh" size={11} stroke={1.5} />
                      <span className="font-mono text-[11px]">{elapsed}</span>
                    </div>
                  </div>
                  {inc.vehiclePlateNo && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Glyph k="truck" size={12} className="text-ink-3" />
                      <span className="font-mono text-[11px] text-ink-2">{inc.vehiclePlateNo}</span>
                    </div>
                  )}
                  {/* Step progress */}
                  <div className="flex items-center gap-1 mb-1">
                    {PLAYBOOK_STEPS.map((step, si) => (
                      <div key={step} className={`flex-1 h-[4px] rounded-full ${si <= stepIdx ? 'bg-[var(--primary)]' : 'bg-bg-3'}`} title={step} />
                    ))}
                  </div>
                  <div className="text-[10px] text-ink-3 font-mono uppercase">{inc.currentStep ?? 'pending'}</div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Driver scoreboard + Recent events */}
          <div className="flex flex-col gap-5">
            {/* Driver scoreboard */}
            <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-line flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink-0">Driver Scoreboard</span>
                <span className="text-[10px] text-ink-3 font-mono uppercase">Top 10</span>
              </div>
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-line bg-surface">
                  {['#', 'Driver', 'Score', 'Events'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-ink-2 font-medium text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-line-soft">
                  {(!scores || scores.length === 0) && <tr><td colSpan={4} className="px-3 py-4 text-center text-ink-3 text-[11px]">No driver scores</td></tr>}
                  {scores?.map((d, i) => {
                    const score = Number(d.totalScore ?? 0);
                    const scoreColor = score >= 85 ? 'var(--go)' : score >= 70 ? 'var(--cond)' : 'var(--nogo)';
                    return (
                      <tr key={d.driverId}>
                        <td className="px-3 py-2 font-mono text-ink-3 text-[11px]">{i + 1}</td>
                        <td className="px-3 py-2 text-ink-0">{d.driverName}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-[60px] h-[5px] rounded-full bg-bg-3 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
                            </div>
                            <span className="font-mono text-[11px] font-medium" style={{ color: scoreColor }}>{score > 0 ? score.toFixed(1) : '—'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-ink-3">
                            <span title="Overspeed">{d.overspeedCount}S</span>
                            <span title="Harsh braking">{d.harshBrakingCount}B</span>
                            <span title="Harsh accel">{d.harshAccelCount}A</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Recent events */}
            <div className="bg-panel border border-line rounded-[10px] overflow-hidden flex-1">
              <div className="px-3.5 py-2.5 border-b border-line flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink-0">Recent Events</span>
                <button className="text-[11px] text-[var(--primary)] hover:underline" onClick={() => window.location.href = '/events'}>View all</button>
              </div>
              <div className="divide-y divide-line-soft">
                {(!events || events.length === 0) && <div className="px-3 py-4 text-center text-ink-3 text-[11px]">No events</div>}
                {events?.slice(0, 8).map(e => (
                  <div key={e.id} className="flex items-center gap-2.5 px-3.5 py-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.severity === 'critical' ? 'bg-[var(--nogo)]' : e.severity === 'warning' ? 'bg-[var(--cond)]' : 'bg-[var(--go)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11.5px] text-ink-0 truncate">{e.eventType.replace(/_/g, ' ')}</span>
                        {e.vehiclePlateNo && <span className="font-mono text-[10px] text-ink-3">{e.vehiclePlateNo}</span>}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-ink-3 shrink-0">
                      {new Date(e.recordedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getElapsed(start: string): string {
  const ms = Date.now() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}
