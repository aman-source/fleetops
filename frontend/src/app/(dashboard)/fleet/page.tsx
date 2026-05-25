'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { useAuth } from '@/stores/auth';

interface Vehicle {
  id: string;
  plateNo: string;
  fleetNo: string | null;
  make: string;
  model: string;
  year: number;
  type: string;
  seatCount: number;
  status: string;
  odometer: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-go-soft text-go',
  conditional: 'bg-cond-soft text-cond',
  under_maintenance: 'bg-info-soft text-info',
  no_go: 'bg-nogo-soft text-nogo',
  expired_documents: 'bg-nogo-soft text-nogo',
  ivms_fault: 'bg-cond-soft text-cond',
  nfc_fault: 'bg-cond-soft text-cond',
  hse_hold: 'bg-nogo-soft text-nogo',
  decommissioned: 'bg-neutral-soft text-neutral',
};

export default function FleetPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && user && user.role === 'passenger') {
      window.location.replace('/passenger');
    }
  }, [authLoading, user]);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('limit', '50');
      return unwrap<Vehicle[]>(await api.get(`/vehicles?${params}`));
    },
  });

  return (
    <>
      <Topbar title="Fleet — Vehicle Master" subtitle="VEHICLES · DRIVERS · DEVICES" />
      <div className="flex-1 overflow-auto p-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search plate, fleet no, make..."
            data-testid="fleet-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[280px] h-8 px-3 bg-surface border border-line rounded-[6px] text-ink-1 text-[12px] outline-none focus:border-primary"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 bg-surface border border-line rounded-[6px] text-ink-1 text-[12px] outline-none"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="conditional">Conditional</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="no_go">No-Go</option>
            <option value="expired_documents">Expired Docs</option>
            <option value="hse_hold">HSE Hold</option>
          </select>
          <div className="flex-1" />
          <span className="text-ink-3 text-[12px]">{vehicles?.length ?? 0} vehicles</span>
        </div>

        {/* Table */}
        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Plate</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Fleet #</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Make / Model</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Type</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Seats</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Odometer</th>
                <th className="text-left px-3 py-2 text-ink-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {isLoading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-3">Loading...</td></tr>
              )}
              {vehicles?.map((v) => (
                <tr key={v.id} data-testid={`vehicle-row-${v.plateNo.replace(/\s/g, '-')}`} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => router.push(`/fleet/${v.id}`)}>
                  <td className="px-3 py-2 text-ink-0 font-medium font-mono">{v.plateNo}</td>
                  <td className="px-3 py-2 text-ink-2">{v.fleetNo ?? '—'}</td>
                  <td className="px-3 py-2 text-ink-1">{v.make} {v.model}</td>
                  <td className="px-3 py-2 text-ink-2 capitalize">{v.type}</td>
                  <td className="px-3 py-2 text-ink-2">{v.seatCount}</td>
                  <td className="px-3 py-2 text-ink-2 font-mono">{v.odometer?.toLocaleString() ?? '—'} km</td>
                  <td className="px-3 py-2">
                    <span data-testid={`vehicle-status-${v.plateNo.replace(/\s/g, '-')}`} className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${STATUS_COLORS[v.status] ?? 'bg-neutral-soft text-neutral'}`}>
                      {v.status.replace(/_/g, ' ')}
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
