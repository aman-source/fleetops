'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';

interface WorkOrder {
  id: string; woNumber: string; vehicleId: string; issueType: string; priority: string;
  title: string; description: string | null; status: string; bay: string | null;
  releaseDecision: string | null; releaseReason: string | null; releaseExpiry: string | null;
  odometerAt: number | null; engineHoursAt: number | null; openedAt: string;
}

interface Activity {
  id: string; action: string; details: Record<string, unknown> | null; timestamp: string;
}

export default function WODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [showRelease, setShowRelease] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ decision: 'go', reason: '', releaseExpiry: '' });

  const { data: wo } = useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => unwrap<WorkOrder>(await api.get(`/work-orders/${id}`)),
  });

  const { data: activity } = useQuery({
    queryKey: ['wo-activity', id],
    queryFn: async () => unwrap<Activity[]>(await api.get(`/work-orders/${id}/activity`)),
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/work-orders/${id}/release`, {
        decision: releaseForm.decision,
        reason: releaseForm.reason,
        releaseExpiry: releaseForm.decision === 'conditional' && releaseForm.releaseExpiry
          ? new Date(releaseForm.releaseExpiry).toISOString() : undefined,
      });
    },
    onSuccess: () => { setShowRelease(false); queryClient.invalidateQueries({ queryKey: ['work-order', id] }); },
  });

  if (!wo) return <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading...</div>;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <Link href="/maintenance" className="flex items-center gap-2 text-ink-3 hover:text-ink-0 transition-colors">
          <Glyph k="arrowL" size={14} />
          <span className="font-mono text-[11px]">WORKSHOP</span>
          <Glyph k="chevR" size={11} className="text-ink-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-ink-0">{wo.woNumber}</span>
          <Pill status={wo.status} />
          {wo.releaseDecision && (
            <span className={`font-bold font-mono text-[12px] uppercase ${wo.releaseDecision === 'go' ? 'text-[var(--go)]' : wo.releaseDecision === 'conditional' ? 'text-[var(--cond)]' : 'text-[var(--nogo)]'}`}>
              {wo.releaseDecision}
            </span>
          )}
        </div>
        <div className="flex-1" />
        {wo.status !== 'closed' && !wo.releaseDecision && (
          <button onClick={() => setShowRelease(true)}
            data-testid="wo-release-decision-button"
            className="h-7 px-3 flex items-center gap-1.5 bg-[var(--primary)] border border-[var(--primary)] rounded-[6px] text-white text-[12px] font-medium hover:bg-[var(--primary-2)] transition-colors">
            <Glyph k="shieldChk" size={14} stroke={1.8} />Release Decision
          </button>
        )}
      </div>

      <div className="flex gap-4 p-5 flex-1 min-h-0 overflow-hidden">
        {/* Left: WO details */}
        <div className="flex-1 flex flex-col gap-3 overflow-auto min-w-0">
          <div className="bg-panel border border-line rounded-[10px] p-4">
            <div className="text-[15px] font-semibold text-ink-0 mb-3">{wo.title}</div>
            {wo.description && <div className="text-[12px] text-ink-2 mb-3">{wo.description}</div>}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {[
                ['Type', wo.issueType.replace(/_/g, ' ')],
                ['Priority', wo.priority],
                ['Bay', wo.bay ?? '\u2014'],
                ['Odometer', wo.odometerAt ? `${wo.odometerAt.toLocaleString()} km` : '\u2014'],
                ['Engine Hours', wo.engineHoursAt ? `${wo.engineHoursAt.toLocaleString()} hrs` : '\u2014'],
                ['Opened', new Date(wo.openedAt).toLocaleString('en-GB')],
                ['Release', wo.releaseDecision?.toUpperCase() ?? 'Pending'],
                ['Expiry', wo.releaseExpiry ? new Date(wo.releaseExpiry).toLocaleString('en-GB') : '\u2014'],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-[11.5px] text-ink-3">{l}</span>
                  <span className="text-[11.5px] text-ink-0 font-mono capitalize">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Go/No-Go release buttons (inline) */}
          {wo.releaseDecision && (
            <div className={`bg-panel border rounded-[10px] p-4 ${wo.releaseDecision === 'go' ? 'border-[rgba(30,201,145,0.3)]' : wo.releaseDecision === 'conditional' ? 'border-[rgba(245,165,36,0.3)]' : 'border-[rgba(239,71,71,0.3)]'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-[8px] inline-flex items-center justify-center ${wo.releaseDecision === 'go' ? 'bg-[var(--go-soft)] text-[var(--go)]' : wo.releaseDecision === 'conditional' ? 'bg-[var(--cond-soft)] text-[var(--cond)]' : 'bg-[var(--nogo-soft)] text-[var(--nogo)]'}`}>
                  <Glyph k={wo.releaseDecision === 'go' ? 'check' : wo.releaseDecision === 'conditional' ? 'alert' : 'x'} size={20} stroke={2.5} />
                </span>
                <div>
                  <div className="text-[14px] font-semibold text-ink-0 uppercase">Release: {wo.releaseDecision}</div>
                  {wo.releaseReason && <div className="text-[12px] text-ink-2 mt-0.5">{wo.releaseReason}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: activity timeline */}
        <div className="flex flex-col gap-3 shrink-0 overflow-auto" style={{ width: 320 }}>
          <div className="bg-panel border border-line rounded-[10px]">
            <div className="px-3.5 py-2.5 border-b border-line">
              <span className="text-[13px] font-semibold text-ink-0">Activity Timeline</span>
            </div>
            <div className="flex flex-col">
              {(!activity || activity.length === 0) && (
                <div className="px-3.5 py-4 text-center text-ink-3 text-[12px]">No activity</div>
              )}
              {activity?.map((a, i) => (
                <div key={a.id} className="flex gap-2.5 px-3.5 py-2.5" style={{ borderBottom: i < activity.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-ink-0 capitalize">{a.action.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-[10px] text-ink-3">{new Date(a.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Release modal */}
      {showRelease && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowRelease(false)} />
          <div className="relative bg-panel border border-line rounded-[12px] shadow-xl w-[440px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="text-ink-0 text-[15px] font-semibold">Vehicle Release Decision</h2>
              <button onClick={() => setShowRelease(false)} className="w-7 h-7 flex items-center justify-center rounded-[4px] hover:bg-raised text-ink-3 hover:text-ink-0">
                <Glyph k="x" size={16} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); releaseMutation.mutate(); }} className="px-5 py-4 flex flex-col gap-4">
              <div className="flex gap-2">
                {(['go', 'conditional', 'no_go'] as const).map(d => (
                  <button key={d} type="button" data-testid={`wo-release-${d}`} onClick={() => setReleaseForm(f => ({ ...f, decision: d }))}
                    className={`flex-1 h-12 rounded-[8px] border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                      releaseForm.decision === d
                        ? d === 'go' ? 'border-[var(--go)] bg-[var(--go-soft)]' : d === 'conditional' ? 'border-[var(--cond)] bg-[var(--cond-soft)]' : 'border-[var(--nogo)] bg-[var(--nogo-soft)]'
                        : 'border-line bg-bg-2 hover:bg-bg-3'
                    }`}>
                    <Glyph k={d === 'go' ? 'check' : d === 'conditional' ? 'alert' : 'x'} size={16} stroke={2.5}
                      className={d === 'go' ? 'text-[var(--go)]' : d === 'conditional' ? 'text-[var(--cond)]' : 'text-[var(--nogo)]'} />
                    <span className={`text-[11px] font-semibold uppercase ${d === 'go' ? 'text-[var(--go)]' : d === 'conditional' ? 'text-[var(--cond)]' : 'text-[var(--nogo)]'}`}>
                      {d === 'no_go' ? 'NO-GO' : d.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">Reason</label>
                <textarea value={releaseForm.reason} onChange={e => setReleaseForm(f => ({ ...f, reason: e.target.value }))}
                  data-testid="wo-release-reason"
                  className="w-full h-20 px-3 py-2 bg-surface border border-line rounded-[6px] text-ink-0 text-[13px] outline-none focus:border-[var(--primary)] resize-none" required />
              </div>
              {releaseForm.decision === 'conditional' && (
                <div>
                  <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">Conditional Expiry</label>
                  <input type="datetime-local" value={releaseForm.releaseExpiry} onChange={e => setReleaseForm(f => ({ ...f, releaseExpiry: e.target.value }))}
                    data-testid="wo-conditional-expiry-input"
                    className="w-full h-10 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[13px] outline-none focus:border-[var(--primary)]" required />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowRelease(false)} className="h-9 px-4 text-ink-2 text-[13px]">Cancel</button>
                <button type="submit" data-testid="wo-release-submit" disabled={releaseMutation.isPending}
                  className={`h-9 px-5 rounded-[6px] text-[13px] font-medium transition-colors disabled:opacity-50 ${
                    releaseForm.decision === 'go' ? 'bg-[var(--go)] text-[#08251c]' :
                    releaseForm.decision === 'conditional' ? 'bg-[var(--cond)] text-[#2a1500]' :
                    'bg-[var(--nogo)] text-white'
                  }`}>
                  {releaseMutation.isPending ? 'Releasing...' : `Release: ${releaseForm.decision === 'no_go' ? 'NO-GO' : releaseForm.decision.toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
