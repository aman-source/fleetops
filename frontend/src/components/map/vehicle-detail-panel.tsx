'use client';

import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

interface VehicleDetail {
  id: string;
  plateNo: string;
  make: string;
  model: string;
  year: number;
  type: string;
  status: string;
  seatCount?: number;
  baseLocation?: string;
  owner?: string;
}

interface LiveState {
  vehicleId: string;
  plateNo?: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  fuelPct?: number;
  engineRpm?: number;
  odometer?: number;
  status: string;
  online: boolean;
}

interface Props {
  vehicleId: string;
  liveState: LiveState;
  onClose: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  available: '#22c55e',
  conditional: '#f59e0b',
  no_go: '#ef4444',
  under_maintenance: '#3b82f6',
  hse_hold: '#ef4444',
  expired_documents: '#f59e0b',
  ivms_fault: '#8b5cf6',
  decommissioned: '#94a3b8',
};

const STATUS_LABEL: Record<string, string> = {
  available: 'GO',
  conditional: 'CONDITIONAL',
  no_go: 'NO-GO',
  under_maintenance: 'MAINTENANCE',
  hse_hold: 'HSE HOLD',
  expired_documents: 'DOCS EXPIRED',
  ivms_fault: 'IVMS FAULT',
  decommissioned: 'DECOMMISSIONED',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 2, fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export function VehicleDetailPanel({ vehicleId, liveState, onClose }: Props) {
  const { data: vehicle } = useQuery({
    queryKey: ['vehicle-detail', vehicleId],
    queryFn: async () => unwrap<VehicleDetail>(await api.get(`/vehicles/${vehicleId}`)),
  });

  const statusColor = STATUS_COLOR[liveState.status] ?? '#94a3b8';
  const statusLabel = STATUS_LABEL[liveState.status] ?? liveState.status.toUpperCase().replace(/_/g, ' ');

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.15)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 320,
        zIndex: 201,
        background: 'white',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', fontFamily: 'monospace' }}>
                {liveState.plateNo ?? vehicle?.plateNo ?? vehicleId.slice(0, 8)}
              </div>
              {vehicle && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#64748b', lineHeight: 1 }}
            >×</button>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            padding: '5px 10px',
            borderRadius: 20,
            background: `${statusColor}18`,
            border: `1px solid ${statusColor}40`,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, letterSpacing: '0.04em' }}>{statusLabel}</span>
            {liveState.online && (
              <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 4 }}>● LIVE</span>
            )}
          </div>
        </div>

        {/* Live telemetry grid */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>Live telemetry</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard label="Speed" value={`${(liveState.speed ?? 0).toFixed(0)} km/h`} />
            <StatCard label="Heading" value={`${liveState.heading ?? 0}°`} sub={headingToCompass(liveState.heading ?? 0)} />
            <StatCard label="Ignition" value={liveState.ignition ? 'ON' : 'OFF'} sub={liveState.ignition ? 'Engine running' : 'Engine off'} />
            <StatCard label="Fuel" value={liveState.fuelPct != null ? `${liveState.fuelPct}%` : '—'} />
          </div>
          {liveState.engineRpm != null && liveState.engineRpm > 0 && (
            <div style={{ marginTop: 8 }}>
              <StatCard label="Engine RPM" value={liveState.engineRpm.toLocaleString()} />
            </div>
          )}
          {liveState.odometer != null && (
            <div style={{ marginTop: 8 }}>
              <StatCard label="Odometer" value={`${liveState.odometer.toLocaleString()} km`} />
            </div>
          )}
        </div>

        {/* Vehicle info */}
        {vehicle && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>Vehicle info</div>
            {[
              ['Type', vehicle.type],
              ['Seats', vehicle.seatCount != null ? String(vehicle.seatCount) : '—'],
              ['Base', vehicle.baseLocation ?? vehicle.owner ?? '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: 16, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={`/fleet/${vehicleId}`}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 16px',
              background: '#0f172a',
              color: 'white',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View full profile →
          </a>
          <a
            href={`/journeys?vehicleId=${vehicleId}`}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '10px 16px',
              background: '#f8fafc',
              color: '#475569',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #e2e8f0',
            }}
          >
            View journeys
          </a>
        </div>
      </div>
    </>
  );
}

function headingToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}
