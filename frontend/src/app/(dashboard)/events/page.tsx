'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, unwrap } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Pill } from '@/components/ui/pill';

interface EventItem {
  id: string;
  eventType: string;
  severity: string;
  vehicleId: string;
  driverId: string | null;
  journeyId: string | null;
  speed: string | null;
  details: Record<string, unknown> | null;
  recordedAt: string;
  actionStatus: string;
}

const SEV_PILL: Record<string, string> = {
  critical: 'nogo',
  warning:  'cond',
  info:     'neutral',
};

const EVENT_LABELS: Record<string, string> = {
  overspeed:           'OVERSPEED',
  harsh_braking:       'HARSH BR.',
  harsh_accel:         'HARSH ACC.',
  idle:                'IDLE',
  deviation:           'DEVIATION',
  panic:               'PANIC',
  tamper:              'TAMPER',
  offline:             'OFFLINE',
  geofence_entry:      'GEO ENTRY',
  geofence_exit:       'GEO EXIT',
  night_driving:       'NIGHT DRV',
  unauthorized_driver: 'UNAUTH DRV',
};

function eventDetail(type: string, details: Record<string, unknown> | null, speed: string | null): string {
  if (!details && speed) return `${Number(speed).toFixed(0)} km/h`;
  if (type === 'overspeed' && details) return `${details.speed} km/h · limit ${details.limit}`;
  if (type === 'harsh_braking' && details) return `Decel ${details.decel}`;
  if (type === 'idle' && details) return `Engine on, ${details.duration}`;
  if (type === 'deviation' && details) return `${details.distance} off route`;
  return speed ? `${Number(speed).toFixed(0)} km/h` : '—';
}

export default function EventsPage() {
  const router = useRouter();
  const [severity, setSeverity]   = useState('');
  const [eventType, setEventType] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['events-page', severity, eventType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100', sort: 'recordedAt', order: 'desc' });
      if (severity)  params.set('severity', severity);
      if (eventType) params.set('eventType', eventType);
      return unwrap<EventItem[]>(await api.get(`/events?${params}`));
    },
    refetchInterval: 15_000,
  });

  const criticalCount = events?.filter(e => e.severity === 'critical').length ?? 0;

  return (
    <>
      <Topbar
        title="Events"
        subtitle="SAFETY · IVMS · REAL-TIME"
        right={criticalCount > 0 ? <Pill status="nogo" label={`${criticalCount} critical`} /> : undefined}
      />
      <div className="flex-1 overflow-auto p-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value)}
            className="h-8 px-3 rounded-[6px] border border-line bg-bg-2 text-[12px] text-ink-1 focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="h-8 px-3 rounded-[6px] border border-line bg-bg-2 text-[12px] text-ink-1 focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">All types</option>
            {Object.entries(EVENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="ml-auto font-mono text-[11px] text-ink-3 flex items-center">
            {isLoading ? 'Loading…' : `${events?.length ?? 0} events`}
          </div>
        </div>

        {/* Table */}
        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-bg-1">
                {['Type', 'Severity', 'Vehicle', 'Detail', 'Journey', 'Time', 'Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-ink-3 text-[12px]">Loading events…</td></tr>
              )}
              {!isLoading && (!events || events.length === 0) && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-ink-3 text-[12px]">No events</td></tr>
              )}
              {events?.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-line-soft hover:bg-raised transition-colors cursor-pointer"
                  onClick={() => router.push(`/fleet/${e.vehicleId}`)}
                >
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] font-semibold text-ink-0">
                      {EVENT_LABELS[e.eventType] ?? e.eventType.toUpperCase().replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill status={SEV_PILL[e.severity] ?? 'neutral'} label={e.severity.toUpperCase()} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-ink-2">{e.vehicleId.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-ink-2 max-w-[200px] truncate">
                    {eventDetail(e.eventType, e.details, e.speed)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-ink-3">
                    {e.journeyId ? e.journeyId.slice(0, 8) : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-ink-3 whitespace-nowrap">
                    {new Date(e.recordedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill status={e.actionStatus ?? 'pending'} />
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
