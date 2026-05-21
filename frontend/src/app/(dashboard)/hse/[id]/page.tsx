'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';

interface Incident {
  id: string; tier: number; status: string; situation: string | null;
  lat: string | null; lon: string | null; startedAt: string; closedAt: string | null;
}
interface Step {
  id: string; stepNumber: number; description: string; status: string;
  completedAt: string | null;
}

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => unwrap<{ incident: Incident; steps: Step[] }>(await api.get(`/incidents/${id}`)),
  });

  const completeMutation = useMutation({
    mutationFn: async (stepNumber: number) => { await api.post(`/incidents/${id}/steps/${stepNumber}/complete`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incident', id] }),
  });

  const escalateMutation = useMutation({
    mutationFn: async () => { await api.post(`/incidents/${id}/escalate`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incident', id] }),
  });

  if (!data) return <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading...</div>;

  const { incident, steps } = data;
  const completedSteps = steps.filter(s => s.status === 'done').length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <Link href="/hse" className="flex items-center gap-2 text-ink-3 hover:text-ink-0 transition-colors">
          <Glyph k="arrowL" size={14} />
          <span className="font-mono text-[11px]">HSE CONSOLE</span>
          <Glyph k="chevR" size={11} className="text-ink-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-ink-0">Incident {incident.id.slice(0, 8)}</span>
          <Pill status={incident.status} />
          <span className={`font-bold font-mono text-[12px] ${incident.tier >= 2 ? 'text-[var(--nogo)]' : 'text-[var(--cond)]'}`}>TIER {incident.tier}</span>
        </div>
        <div className="flex-1" />
        {incident.status !== 'closed' && (
          <div className="flex items-center gap-2">
            <button onClick={() => escalateMutation.mutate()}
              data-testid="incident-escalate-button"
              disabled={incident.tier >= 3 || escalateMutation.isPending}
              className="h-7 px-3 flex items-center gap-1.5 bg-[var(--cond)] border border-[var(--cond)] rounded-[6px] text-[#2a1500] text-[12px] font-medium hover:opacity-90 transition-colors disabled:opacity-40">
              <Glyph k="alert" size={13} stroke={2} />Escalate to T{incident.tier + 1}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 p-5 flex-1 min-h-0 overflow-hidden">
        {/* Left: playbook */}
        <div className="flex-1 flex flex-col gap-3 overflow-auto min-w-0">
          <div className="bg-panel border border-line rounded-[10px]" style={{ borderColor: incident.status !== 'closed' ? 'rgba(239,71,71,0.3)' : 'var(--line)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Glyph k="shield" size={16} className="text-[var(--nogo)]" />
                <span className="text-[14px] font-semibold text-ink-0">Response Playbook</span>
              </div>
              <span className="font-mono text-[11px] text-ink-3">{completedSteps} / {steps.length} completed</span>
            </div>
            <div className="flex flex-col">
              {steps.map((s, i) => (
                <div key={s.id} data-testid={`incident-step-${s.stepNumber}`} className="flex gap-3 px-4 py-3" style={{ borderBottom: i < steps.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  {/* Step indicator */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 24 }}>
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-mono font-semibold ${
                      s.status === 'done' ? 'bg-[var(--go)] text-[#08251c]' :
                      s.status === 'active' ? 'bg-[var(--primary)] text-white' :
                      'bg-bg-3 text-ink-3'
                    }`}>
                      {s.status === 'done' ? <Glyph k="check" size={13} stroke={3} /> : s.stepNumber}
                    </span>
                    {i < steps.length - 1 && <div className="w-px flex-1 bg-line mt-1 min-h-[12px]" />}
                  </div>
                  {/* Step content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[13px] ${s.status === 'pending' ? 'text-ink-3' : 'text-ink-0'} ${s.status === 'active' ? 'font-semibold' : ''}`}>
                        {s.description}
                      </span>
                      {s.status === 'active' && (
                        <button onClick={() => completeMutation.mutate(s.stepNumber)}
                          data-testid={`incident-step-${s.stepNumber}-complete`}
                          disabled={completeMutation.isPending}
                          className="h-7 px-3 flex items-center gap-1 bg-[var(--go)] border border-[var(--go)] rounded-[6px] text-[#08251c] text-[11px] font-medium hover:opacity-90 transition-colors disabled:opacity-50">
                          <Glyph k="check" size={12} stroke={2.5} />Complete
                        </button>
                      )}
                      {s.status === 'done' && s.completedAt && (
                        <span className="font-mono text-[10px] text-ink-3">{new Date(s.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: incident info */}
        <div className="flex flex-col gap-3 shrink-0" style={{ width: 320 }}>
          <div className="bg-panel border border-line rounded-[10px] p-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-3">Incident Details</div>
            <div className="flex flex-col gap-2.5">
              {[
                ['Status', incident.status],
                ['Tier', `Tier ${incident.tier}`],
                ['Situation', incident.situation ?? '\u2014'],
                ['Started', new Date(incident.startedAt).toLocaleString('en-GB')],
                ['Closed', incident.closedAt ? new Date(incident.closedAt).toLocaleString('en-GB') : 'Open'],
                ['Location', incident.lat && incident.lon ? `${Number(incident.lat).toFixed(4)}\u00b0N, ${Number(incident.lon).toFixed(4)}\u00b0E` : '\u2014'],
              ].map(([l, v]) => (
                <div key={l} className="flex items-start justify-between">
                  <span className="text-[11.5px] text-ink-3">{l}</span>
                  <span className="text-[11.5px] text-ink-0 text-right max-w-[180px]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-line rounded-[10px] p-4">
            <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-3">Progress</div>
            <div className="h-2 bg-bg-3 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full bg-[var(--go)]" style={{ width: `${(completedSteps / steps.length) * 100}%` }} />
            </div>
            <span className="text-[12px] text-ink-2">{completedSteps} of {steps.length} steps completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
