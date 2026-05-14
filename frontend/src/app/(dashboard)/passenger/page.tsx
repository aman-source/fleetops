'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';

interface PassengerRequest {
  id: string;
  requestNo: string;
  pickupName: string | null;
  dropName: string | null;
  requestedTime: string;
  priority: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-cond-soft text-cond',
  pooled: 'bg-info-soft text-info',
  assigned: 'bg-primary-soft text-primary',
  approved: 'bg-go-soft text-go',
  rejected: 'bg-nogo-soft text-nogo',
  cancelled: 'bg-neutral-soft text-neutral',
};

export default function PassengerPage() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['passenger-requests'],
    queryFn: async () => unwrap<PassengerRequest[]>(await api.get('/passenger/requests?limit=50')),
  });

  return (
    <>
      <Topbar title="Passenger Logistics" subtitle="REQUESTS · POOLING · BOARDING" />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1" />
          <span className="text-ink-2 text-[12px]">{requests?.length ?? 0} requests</span>
        </div>
        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Request #</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Pickup</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Drop</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Time</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Priority</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {isLoading && <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-3">Loading...</td></tr>}
              {!isLoading && requests?.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-3">No requests</td></tr>}
              {requests?.map((r) => (
                <tr key={r.id} className="hover:bg-raised transition-colors cursor-pointer">
                  <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{r.requestNo}</td>
                  <td className="px-3 py-2.5 text-ink-0">{r.pickupName ?? '\u2014'}</td>
                  <td className="px-3 py-2.5 text-ink-0">{r.dropName ?? '\u2014'}</td>
                  <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{new Date(r.requestedTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-2.5 text-ink-1 capitalize">{r.priority}</td>
                  <td className="px-3 py-2.5"><span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${STATUS_COLORS[r.status] ?? 'bg-neutral-soft text-neutral'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
