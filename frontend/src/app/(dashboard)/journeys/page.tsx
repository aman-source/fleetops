'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Header } from '@/components/layout/header';
import Link from 'next/link';

interface Journey {
  id: string;
  journeyNo: string;
  vehicleId: string;
  driverId: string;
  purpose: string | null;
  plannedDeparture: string;
  plannedArrival: string;
  riskLevel: string | null;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-neutral-soft text-neutral',
  pending_approval: 'bg-cond-soft text-cond',
  approved: 'bg-go-soft text-go',
  active: 'bg-primary-soft text-primary',
  delayed: 'bg-cond-soft text-cond',
  deviated: 'bg-nogo-soft text-nogo',
  completed: 'bg-go-soft text-go',
  closed: 'bg-neutral-soft text-neutral',
  rejected: 'bg-nogo-soft text-nogo',
  cancelled: 'bg-neutral-soft text-neutral',
  emergency: 'bg-nogo-soft text-nogo',
};

const RISK_COLORS: Record<string, string> = {
  L: 'text-go',
  M: 'text-cond',
  H: 'text-nogo',
};

export default function JourneysPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: journeys, isLoading } = useQuery({
    queryKey: ['journeys', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      return unwrap<Journey[]>(await api.get(`/journeys?${params}`));
    },
  });

  return (
    <>
      <Header title="Journey Management" />
      <div className="flex-1 overflow-auto p-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 bg-surface border border-line rounded-[6px] text-ink-1 text-[12px] outline-none"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="flex-1" />
          <Link
            href="/journeys/new"
            className="h-8 px-4 bg-primary hover:bg-primary-2 text-white text-[12px] font-medium rounded-[6px] flex items-center transition-colors"
          >
            New Journey
          </Link>
        </div>

        {/* Table */}
        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Journey #</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Purpose</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Departure</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Arrival</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Risk</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {isLoading && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-3">Loading...</td></tr>
              )}
              {journeys?.map((j) => (
                <tr key={j.id} className="hover:bg-raised transition-colors cursor-pointer">
                  <td className="px-3 py-2 text-primary font-mono font-medium">{j.journeyNo}</td>
                  <td className="px-3 py-2 text-ink-1">{j.purpose ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-2 font-mono">
                    {new Date(j.plannedDeparture).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 text-ink-2 font-mono">
                    {new Date(j.plannedArrival).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2">
                    {j.riskLevel && (
                      <span className={`font-bold ${RISK_COLORS[j.riskLevel] ?? 'text-ink-2'}`}>
                        {j.riskLevel}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${STATUS_COLORS[j.status] ?? 'bg-neutral-soft text-neutral'}`}>
                      {j.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
