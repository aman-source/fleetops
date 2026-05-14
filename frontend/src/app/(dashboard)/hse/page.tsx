'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';

interface Incident {
  id: string;
  tier: number;
  status: string;
  situation: string | null;
  startedAt: string;
  closedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-nogo-soft text-nogo',
  responding: 'bg-cond-soft text-cond',
  escalated: 'bg-nogo-soft text-nogo',
  closed: 'bg-neutral-soft text-neutral',
};

export default function HSEPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      return unwrap<Incident[]>(await api.get(`/incidents?${params}`));
    },
  });

  return (
    <>
      <Topbar title="HSE Console" subtitle="INCIDENTS · EVENTS · DRIVER SCORES" />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[12px] outline-none">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="responding">Responding</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
          <div className="flex-1" />
          <span className="text-ink-2 text-[12px]">{incidents?.length ?? 0} incidents</span>
        </div>

        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">ID</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Situation</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Tier</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Started</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {isLoading && <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-3">Loading...</td></tr>}
              {!isLoading && incidents?.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-3">No incidents</td></tr>}
              {incidents?.map((i) => (
                <tr key={i.id} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/hse/${i.id}`}>
                  <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{i.id.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 text-ink-0">{i.situation ?? '\u2014'}</td>
                  <td className="px-3 py-2.5"><span className={`font-bold ${i.tier >= 2 ? 'text-[var(--nogo)]' : 'text-[var(--cond)]'}`}>T{i.tier}</span></td>
                  <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{new Date(i.startedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-2.5"><span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${STATUS_COLORS[i.status] ?? 'bg-neutral-soft text-neutral'}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
