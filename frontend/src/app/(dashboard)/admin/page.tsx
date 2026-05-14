'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';

interface Workflow {
  id: string;
  name: string;
  key: string;
  currentVersion: number;
  createdAt: string;
}

export default function AdminPage() {
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => unwrap<Workflow[]>(await api.get('/admin/workflows')),
  });

  return (
    <>
      <Topbar title="Admin Configuration" subtitle="WORKFLOWS · SETTINGS" />
      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-ink-0 text-[14px] font-semibold mb-4">Workflow Engine</h2>
        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Name</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Key</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Version</th>
                <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {isLoading && <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-3">Loading...</td></tr>}
              {!isLoading && workflows?.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-3">No workflows configured</td></tr>}
              {workflows?.map((w) => (
                <tr key={w.id} className="hover:bg-raised transition-colors cursor-pointer">
                  <td className="px-3 py-2.5 text-ink-0 font-medium">{w.name}</td>
                  <td className="px-3 py-2.5 text-[var(--primary)] font-mono">{w.key}</td>
                  <td className="px-3 py-2.5 text-ink-1 font-mono">v{w.currentVersion}</td>
                  <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{new Date(w.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
