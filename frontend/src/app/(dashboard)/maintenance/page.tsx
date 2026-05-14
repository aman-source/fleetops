'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';

interface WorkOrder {
  id: string; woNumber: string; vehicleId: string; issueType: string; priority: string;
  title: string; status: string; bay: string | null; releaseDecision: string | null; openedAt: string;
}

const COLUMNS = [
  { key: 'inbound', label: 'Inbound', color: 'var(--primary)' },
  { key: 'in_bay', label: 'In Bay', color: 'var(--info)' },
  { key: 'awaiting_parts', label: 'Awaiting Parts', color: 'var(--cond)' },
  { key: 'hse_review', label: 'HSE Review', color: 'var(--nogo)' },
  { key: 'ready', label: 'Ready', color: 'var(--go)' },
];

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-[var(--nogo)]', high: 'bg-[var(--cond)]', medium: 'bg-[var(--primary)]', low: 'bg-ink-3',
};

type ViewMode = 'kanban' | 'table';

export default function MaintenancePage() {
  const [view, setView] = useState<ViewMode>('kanban');

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders-all'],
    queryFn: async () => unwrap<WorkOrder[]>(await api.get('/work-orders?limit=100')),
  });

  const allWOs = workOrders ?? [];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold text-ink-0">Maintenance Workshop</span>
          <span className="font-mono text-[10.5px] text-ink-3">{allWOs.length} WORK ORDERS</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-bg-2 border border-line rounded-[6px] p-0.5">
          <button onClick={() => setView('kanban')}
            className={`h-6 px-2 rounded-[4px] flex items-center gap-1 text-[11px] transition-colors ${view === 'kanban' ? 'bg-bg-3 text-ink-0' : 'text-ink-3 hover:text-ink-0'}`}>
            <Glyph k="grid" size={12} />Kanban
          </button>
          <button onClick={() => setView('table')}
            className={`h-6 px-2 rounded-[4px] flex items-center gap-1 text-[11px] transition-colors ${view === 'table' ? 'bg-bg-3 text-ink-0' : 'text-ink-3 hover:text-ink-0'}`}>
            <Glyph k="list" size={12} />Table
          </button>
        </div>
      </div>

      {isLoading && <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading...</div>}

      {/* Kanban view */}
      {!isLoading && view === 'kanban' && (
        <div className="flex-1 flex gap-3 p-4 overflow-x-auto min-h-0">
          {COLUMNS.map(col => {
            const items = allWOs.filter(w => w.status === col.key);
            return (
              <div key={col.key} className="flex flex-col w-[240px] shrink-0 min-h-0">
                {/* Column header */}
                <div className="flex items-center gap-2 px-2 py-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] font-semibold text-ink-0">{col.label}</span>
                  <span className="font-mono text-[10px] text-ink-3 ml-auto">{items.length}</span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {items.length === 0 && (
                    <div className="text-[11px] text-ink-3 text-center py-4 border border-dashed border-line rounded-[8px]">Empty</div>
                  )}
                  {items.map(wo => (
                    <div key={wo.id} onClick={() => window.location.href = `/maintenance/${wo.id}`}
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
                          <span className={`font-mono text-[10px] font-semibold uppercase ${wo.releaseDecision === 'go' ? 'text-[var(--go)]' : wo.releaseDecision === 'conditional' ? 'text-[var(--cond)]' : 'text-[var(--nogo)]'}`}>
                            {wo.releaseDecision === 'no_go' ? 'NO-GO' : wo.releaseDecision.toUpperCase()}
                          </span>
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

      {/* Table view */}
      {!isLoading && view === 'table' && (
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">WO #</th>
                  <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Title</th>
                  <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Type</th>
                  <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Priority</th>
                  <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Bay</th>
                  <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Release</th>
                  <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {allWOs.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-3">No work orders</td></tr>}
                {allWOs.map(wo => (
                  <tr key={wo.id} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/maintenance/${wo.id}`}>
                    <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{wo.woNumber}</td>
                    <td className="px-3 py-2.5 text-ink-0">{wo.title}</td>
                    <td className="px-3 py-2.5 text-ink-1 capitalize">{wo.issueType.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2.5 capitalize">{wo.priority}</td>
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
