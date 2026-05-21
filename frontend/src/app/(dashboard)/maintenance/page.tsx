'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';

interface WorkOrder {
  id: string; woNumber: string; vehicleId: string; vehiclePlateNo?: string;
  issueType: string; priority: string; title: string; status: string;
  bay: string | null; releaseDecision: string | null; openedAt: string;
}

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-[var(--nogo)]', high: 'bg-[var(--cond)]', medium: 'bg-[var(--primary)]', low: 'bg-ink-3',
};

const BAYS = ['1', '2', '3', '4', '5', '6'];

type ViewMode = 'board' | 'kanban' | 'table';

export default function MaintenancePage() {
  const [view, setView] = useState<ViewMode>('board');

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders-all'],
    queryFn: async () => unwrap<WorkOrder[]>(await api.get('/work-orders?limit=100')),
  });

  const allWOs = workOrders ?? [];
  const inBayWOs = allWOs.filter(w => w.bay);
  const inboundWOs = allWOs.filter(w => w.status === 'inbound' || (!w.bay && w.status !== 'ready' && w.status !== 'closed'));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--cond)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">Maintenance Console</span>
        </div>
        <div className="flex flex-col ml-2">
          <span className="text-[14px] font-semibold text-ink-0">Bay board</span>
        </div>
        <div className="flex-1" />
        <span className="font-mono text-[11px] text-ink-3">{allWOs.length} WOs</span>
        <div className="flex items-center gap-1 bg-bg-2 border border-line rounded-[6px] p-0.5">
          {([['board', 'grid', 'Bays'], ['kanban', 'list', 'Kanban'], ['table', 'doc', 'Table']] as [ViewMode, string, string][]).map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`h-6 px-2 rounded-[4px] flex items-center gap-1 text-[11px] transition-colors ${view === v ? 'bg-bg-3 text-ink-0' : 'text-ink-3 hover:text-ink-0'}`}>
              <Glyph k={icon} size={12} />{label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading&#x2026;</div>}

      {/* ── BAY BOARD VIEW ── */}
      {!isLoading && view === 'board' && (
        <div className="flex flex-1 min-h-0">
          {/* Bay grid */}
          <div className="flex-1 p-5 overflow-auto">
            <div className="grid grid-cols-3 gap-4" style={{ minHeight: 320 }}>
              {BAYS.map(bayNum => {
                const wo = inBayWOs.find(w => w.bay === bayNum);
                if (!wo) {
                  return (
                    <div key={bayNum} className="border-2 border-dashed border-line rounded-[12px] flex flex-col items-center justify-center py-10 min-h-[180px]">
                      <span className="text-[13px] font-semibold text-ink-3 mb-1">Bay {bayNum}</span>
                      <span className="text-[11px] text-ink-3">Available</span>
                    </div>
                  );
                }
                const elapsed = getElapsed(wo.openedAt);
                const stages = ['inbound', 'in_bay', 'awaiting_parts', 'hse_review', 'ready'];
                const stageIdx = stages.indexOf(wo.status);
                const progress = stageIdx >= 0 ? ((stageIdx + 1) / stages.length) * 100 : 20;
                return (
                  <div key={bayNum} data-testid={`wo-card-${wo.id}`} className="bg-panel border border-line rounded-[12px] p-4 cursor-pointer hover:border-[var(--primary)] transition-colors min-h-[180px] flex flex-col"
                    onClick={() => window.location.href = `/maintenance/${wo.id}`}>
                    {/* Bay label */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono text-ink-3 uppercase">Bay {bayNum}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[wo.priority] ?? 'bg-ink-3'}`} title={wo.priority} />
                    </div>
                    {/* Vehicle plate */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-[6px] bg-bg-3 flex items-center justify-center">
                        <Glyph k="truck" size={16} stroke={1.4} className="text-ink-2" />
                      </div>
                      <div>
                        <div className="font-mono text-[14px] font-semibold text-ink-0">{wo.vehiclePlateNo ?? 'Vehicle'}</div>
                        <div className="font-mono text-[10px] text-[var(--primary)]">{wo.woNumber}</div>
                      </div>
                    </div>
                    {/* Issue */}
                    <div className="text-[12px] text-ink-1 mb-2 line-clamp-2 flex-1">{wo.title}</div>
                    {/* Timer */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <Glyph k="refresh" size={11} stroke={1.5} className="text-ink-3" />
                      <span className="font-mono text-[11px] text-ink-2">{elapsed}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-[4px] rounded-full bg-bg-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all bg-[var(--primary)]" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-[10px] font-mono text-ink-3 uppercase mt-1">{wo.status.replace(/_/g, ' ')}</div>
                    {/* Release badge if exists */}
                    {wo.releaseDecision && (
                      <div className="mt-2 pt-2 border-t border-line-soft">
                        <Pill status={wo.releaseDecision === 'no_go' ? 'nogo' : wo.releaseDecision === 'conditional' ? 'cond' : 'go'} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inbound queue side panel */}
          <aside className="w-[300px] shrink-0 border-l border-line bg-bg-1 overflow-y-auto" style={{ padding: '16px 14px' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-ink-0">Inbound Queue</span>
              <span className="font-mono text-[10px] text-ink-3">{inboundWOs.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {inboundWOs.length === 0 && (
                <div className="text-[11px] text-ink-3 text-center py-6 border border-dashed border-line rounded-[8px]">Queue empty</div>
              )}
              {inboundWOs.map(wo => (
                <div key={wo.id} data-testid={`wo-inbound-${wo.id}`} className="bg-panel border border-line rounded-[8px] p-3 cursor-pointer hover:border-[var(--primary)] transition-colors"
                  onClick={() => window.location.href = `/maintenance/${wo.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-[var(--primary)] font-medium">{wo.woNumber}</span>
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[wo.priority] ?? 'bg-ink-3'}`} title={wo.priority} />
                  </div>
                  <div className="text-[12px] text-ink-0 mb-1 line-clamp-1">{wo.title}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-ink-2">{wo.vehiclePlateNo ?? '\u2014'}</span>
                    <span className="text-[10px] text-ink-3 capitalize">{wo.issueType.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {!isLoading && view === 'kanban' && (
        <div className="flex-1 flex gap-3 p-4 overflow-x-auto min-h-0">
          {([
            { key: 'inbound', label: 'Inbound', color: 'var(--primary)' },
            { key: 'in_bay', label: 'In Bay', color: 'var(--info)' },
            { key: 'awaiting_parts', label: 'Awaiting Parts', color: 'var(--cond)' },
            { key: 'hse_review', label: 'HSE Review', color: 'var(--nogo)' },
            { key: 'ready', label: 'Ready', color: 'var(--go)' },
          ]).map(col => {
            const items = allWOs.filter(w => w.status === col.key);
            return (
              <div key={col.key} className="flex flex-col w-[240px] shrink-0 min-h-0">
                <div className="flex items-center gap-2 px-2 py-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] font-semibold text-ink-0">{col.label}</span>
                  <span className="font-mono text-[10px] text-ink-3 ml-auto">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {items.length === 0 && (
                    <div className="text-[11px] text-ink-3 text-center py-4 border border-dashed border-line rounded-[8px]">Empty</div>
                  )}
                  {items.map(wo => (
                    <div key={wo.id} data-testid={`wo-kanban-${wo.id}`} onClick={() => window.location.href = `/maintenance/${wo.id}`}
                      className="bg-panel border border-line rounded-[8px] p-3 cursor-pointer hover:border-[var(--primary)] transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] text-[var(--primary)] font-medium">{wo.woNumber}</span>
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[wo.priority] ?? 'bg-ink-3'}`} title={wo.priority} />
                      </div>
                      <div className="text-[12px] text-ink-0 mb-1.5 line-clamp-2">{wo.title}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-ink-3 capitalize">{wo.issueType.replace(/_/g, ' ')}</span>
                        {wo.bay && <span className="font-mono text-[10px] text-ink-2">Bay {wo.bay}</span>}
                      </div>
                      {wo.releaseDecision && (
                        <div className="mt-2 pt-2 border-t border-line-soft">
                          <Pill status={wo.releaseDecision === 'no_go' ? 'nogo' : wo.releaseDecision === 'conditional' ? 'cond' : 'go'} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {!isLoading && view === 'table' && (
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {['WO #', 'Title', 'Type', 'Priority', 'Bay', 'Release', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {allWOs.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-3">No work orders</td></tr>}
                {allWOs.map(wo => (
                  <tr key={wo.id} data-testid={`wo-row-${wo.id}`} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/maintenance/${wo.id}`}>
                    <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{wo.woNumber}</td>
                    <td className="px-3 py-2.5 text-ink-0">{wo.title}</td>
                    <td className="px-3 py-2.5 text-ink-1 capitalize">{wo.issueType.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${PRIORITY_DOT[wo.priority] ?? 'bg-ink-3'}`} />
                      <span className="text-ink-1 capitalize text-[11px]">{wo.priority}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-1 font-mono">{wo.bay ?? '\u2014'}</td>
                    <td className="px-3 py-2.5">{wo.releaseDecision ? <span className={`font-medium uppercase text-[11px] ${wo.releaseDecision === 'go' ? 'text-[var(--go)]' : wo.releaseDecision === 'conditional' ? 'text-[var(--cond)]' : 'text-[var(--nogo)]'}`}>{wo.releaseDecision === 'no_go' ? 'NO-GO' : wo.releaseDecision}</span> : '\u2014'}</td>
                    <td className="px-3 py-2.5"><Pill status={wo.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
