'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Header } from '@/components/layout/header';

interface WorkOrder {
  id: string;
  woNumber: string;
  vehicleId: string;
  issueType: string;
  priority: string;
  title: string;
  status: string;
  bay: string | null;
  releaseDecision: string | null;
  openedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  inbound: 'bg-info-soft text-info',
  in_bay: 'bg-primary-soft text-primary',
  awaiting_parts: 'bg-cond-soft text-cond',
  hse_review: 'bg-nogo-soft text-nogo',
  ready: 'bg-go-soft text-go',
  closed: 'bg-neutral-soft text-neutral',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-[var(--nogo)] font-bold',
  high: 'text-[var(--cond)]',
  medium: 'text-ink-0',
  low: 'text-ink-2',
};

export default function MaintenancePage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      return unwrap<WorkOrder[]>(await api.get(`/work-orders?${params}`));
    },
  });

  return (
    <>
      <Header title="Maintenance Workshop" />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[12px] outline-none">
            <option value="">All statuses</option>
            <option value="inbound">Inbound</option>
            <option value="in_bay">In Bay</option>
            <option value="awaiting_parts">Awaiting Parts</option>
            <option value="hse_review">HSE Review</option>
            <option value="ready">Ready</option>
            <option value="closed">Closed</option>
          </select>
          <div className="flex-1" />
          <span className="text-ink-2 text-[12px]">{workOrders?.length ?? 0} work orders</span>
        </div>

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
              {isLoading && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-3">Loading...</td></tr>}
              {!isLoading && workOrders?.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-3">No work orders found</td></tr>}
              {workOrders?.map((wo) => (
                <tr key={wo.id} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/maintenance/${wo.id}`}>
                  <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{wo.woNumber}</td>
                  <td className="px-3 py-2.5 text-ink-0">{wo.title}</td>
                  <td className="px-3 py-2.5 text-ink-1 capitalize">{wo.issueType.replace(/_/g, ' ')}</td>
                  <td className={`px-3 py-2.5 capitalize ${PRIORITY_COLORS[wo.priority] ?? 'text-ink-1'}`}>{wo.priority}</td>
                  <td className="px-3 py-2.5 text-ink-1 font-mono">{wo.bay ?? '\u2014'}</td>
                  <td className="px-3 py-2.5">{wo.releaseDecision ? <span className={`font-medium uppercase text-[11px] ${wo.releaseDecision === 'go' ? 'text-[var(--go)]' : wo.releaseDecision === 'conditional' ? 'text-[var(--cond)]' : 'text-[var(--nogo)]'}`}>{wo.releaseDecision}</span> : '\u2014'}</td>
                  <td className="px-3 py-2.5"><span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${STATUS_COLORS[wo.status] ?? 'bg-neutral-soft text-neutral'}`}>{wo.status.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
