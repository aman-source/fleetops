'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Pill } from '@/components/ui/pill';

interface DocItem {
  id: string;
  title: string;
  documentType: string;
  entityType: string;
  entityId: string;
  status: string;
  expiryDate: string | null;
  blocksOnExpiry: boolean;
  createdAt: string;
}

const DOC_STATUS_PILL: Record<string, string> = {
  valid:    'go',
  expiring: 'cond',
  expired:  'nogo',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  mulkia:    'Mulkia',
  insurance: 'Insurance',
  ras:       'RAS',
  pdo_permit:'PDO Permit',
  license:   'License',
  ddc:       'DDC',
  medical:   'Medical',
};

export default function DocumentsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [entityType,   setEntityType]   = useState('');

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents-page', statusFilter, entityType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      if (entityType)   params.set('entityType', entityType);
      return unwrap<DocItem[]>(await api.get(`/documents?${params}`));
    },
  });

  const expiredCount  = docs?.filter(d => d.status === 'expired').length  ?? 0;
  const expiringCount = docs?.filter(d => d.status === 'expiring').length ?? 0;

  return (
    <>
      <Topbar
        title="Documents"
        subtitle="MULKIA · INSURANCE · PERMITS"
        right={
          <div className="flex gap-2">
            {expiredCount  > 0 && <Pill status="nogo"  label={`${expiredCount} expired`} />}
            {expiringCount > 0 && <Pill status="cond"  label={`${expiringCount} expiring`} />}
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-8 px-3 rounded-[6px] border border-line bg-bg-2 text-[12px] text-ink-1 focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">All statuses</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring soon</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={entityType}
            onChange={e => setEntityType(e.target.value)}
            className="h-8 px-3 rounded-[6px] border border-line bg-bg-2 text-[12px] text-ink-1 focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">All entities</option>
            <option value="vehicle">Vehicle</option>
            <option value="driver">Driver</option>
          </select>
          <div className="ml-auto font-mono text-[11px] text-ink-3 flex items-center">
            {isLoading ? 'Loading…' : `${docs?.length ?? 0} documents`}
          </div>
        </div>

        {/* Table */}
        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-bg-1">
                {['Title', 'Type', 'Entity', 'Status', 'Expiry', 'Blocks journey'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-ink-3 text-[12px]">Loading documents…</td></tr>
              )}
              {!isLoading && (!docs || docs.length === 0) && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-ink-3 text-[12px]">No documents found</td></tr>
              )}
              {docs?.map((d) => (
                <tr key={d.id} className="border-b border-line-soft hover:bg-raised transition-colors">
                  <td className="px-3 py-2.5 text-[12px] text-ink-0 font-medium">{d.title}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-ink-2 uppercase">
                    {DOC_TYPE_LABELS[d.documentType] ?? d.documentType}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-ink-2 capitalize">
                    {d.entityType} <span className="font-mono text-ink-3">{d.entityId.slice(0, 8)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill status={DOC_STATUS_PILL[d.status] ?? 'neutral'} label={d.status.toUpperCase()} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-ink-2 whitespace-nowrap">
                    {d.expiryDate
                      ? new Date(d.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-[12px]">
                    {d.blocksOnExpiry
                      ? <span className="text-[var(--nogo)] font-semibold">Yes</span>
                      : <span className="text-ink-3">No</span>}
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
