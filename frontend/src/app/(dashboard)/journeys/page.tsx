'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Topbar } from '@/components/layout/topbar';
import { Combobox } from '@/components/ui/combobox';
import { GeocoderInput } from '@/components/ui/geocoder-input';

interface Journey { id: string; journeyNo: string; vehicleId: string; driverId: string; purpose: string | null; plannedDeparture: string; plannedArrival: string; riskLevel: string | null; status: string; }
interface Vehicle { id: string; plateNo: string; fleetNo: string | null; make: string; model: string; type: string; seatCount: number; status: string; }
interface Driver { id: string; name: string; employeeId: string | null; licenseClass: string; status: string; }

const STATUS_COLORS: Record<string, string> = { draft: 'bg-neutral-soft text-neutral', pending_approval: 'bg-cond-soft text-cond', approved: 'bg-go-soft text-go', active: 'bg-primary-soft text-primary', delayed: 'bg-cond-soft text-cond', deviated: 'bg-nogo-soft text-nogo', completed: 'bg-go-soft text-go', closed: 'bg-neutral-soft text-neutral', rejected: 'bg-nogo-soft text-nogo', cancelled: 'bg-neutral-soft text-neutral', emergency: 'bg-nogo-soft text-nogo' };
const RISK_COLORS: Record<string, string> = { L: 'text-go', M: 'text-cond', H: 'text-nogo' };

export default function JourneysPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

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
      <Topbar title="Journey Management" subtitle="PLAN · APPROVE · MONITOR" />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[12px] outline-none">
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
          <button data-testid="journey-list-new-button" onClick={() => setShowModal(true)} className="h-8 px-4 bg-[var(--primary)] hover:bg-[var(--primary-2)] text-white text-[12px] font-medium rounded-[6px] transition-colors">+ New Journey</button>
        </div>
        <div className="bg-panel border border-line rounded-[10px] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-line bg-surface">
              <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Journey #</th>
              <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Purpose</th>
              <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Departure</th>
              <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Arrival</th>
              <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Risk</th>
              <th className="text-left px-3 py-2.5 text-ink-2 font-medium text-[11px] uppercase tracking-wider">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-line-soft">
              {isLoading && <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-3">Loading...</td></tr>}
              {!isLoading && journeys?.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-3">No journeys found</td></tr>}
              {journeys?.map((j) => (
                <tr key={j.id} data-testid={`journey-row-${j.id}`} className="hover:bg-raised transition-colors cursor-pointer" onClick={() => window.location.href = `/journeys/${j.id}`}>
                  <td className="px-3 py-2.5 text-[var(--primary)] font-mono font-medium">{j.journeyNo}</td>
                  <td className="px-3 py-2.5 text-ink-0">{j.purpose || '\u2014'}</td>
                  <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{new Date(j.plannedDeparture).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-2.5 text-ink-1 font-mono text-[11px]">{new Date(j.plannedArrival).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-2.5">{j.riskLevel && <span className={`font-bold ${RISK_COLORS[j.riskLevel] || 'text-ink-2'}`}>{j.riskLevel}</span>}</td>
                  <td className="px-3 py-2.5"><span data-testid={`journey-status-${j.id}`} className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${STATUS_COLORS[j.status] || 'bg-neutral-soft text-neutral'}`}>{j.status.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <NewJourneyModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); queryClient.invalidateQueries({ queryKey: ['journeys'] }); }} />}
    </>
  );
}

interface WaypointDraft { name: string; lat: string; lon: string; }

function NewJourneyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [error, setError] = useState('');
  const [form, setForm] = useState({ vehicleId: '', driverId: '', purpose: '', plannedDeparture: '', plannedArrival: '', emergencyContact: '' });
  const [origin, setOrigin] = useState<WaypointDraft>({ name: '', lat: '', lon: '' });
  const [destination, setDestination] = useState<WaypointDraft>({ name: '', lat: '', lon: '' });
  const { data: vehicles } = useQuery({ queryKey: ['vehicles-for-journey'], queryFn: async () => unwrap<Vehicle[]>(await api.get('/vehicles?limit=100')) });
  const { data: drivers } = useQuery({ queryKey: ['drivers-for-journey'], queryFn: async () => unwrap<Driver[]>(await api.get('/drivers?status=active&limit=100')) });
  const vehicleOptions = (vehicles || []).filter((v: Vehicle) => v.status === 'available' || v.status === 'conditional').map((v: Vehicle) => ({ value: v.id, label: v.plateNo + ' \u2014 ' + v.make + ' ' + v.model, sub: v.type + ' \u00b7 ' + v.seatCount + ' seats' + (v.fleetNo ? ' \u00b7 ' + v.fleetNo : '') }));
  const driverOptions = (drivers || []).map((d: Driver) => ({ value: d.id, label: d.name, sub: (d.employeeId || 'No ID') + ' \u00b7 Class ' + d.licenseClass }));

  const buildWaypoints = () => {
    const wps = [];
    if (origin.lat && origin.lon) {
      wps.push({ sequence: 1, name: origin.name || 'Origin', lat: Number(origin.lat), lon: Number(origin.lon) });
    }
    if (destination.lat && destination.lon) {
      wps.push({ sequence: 2, name: destination.name || 'Destination', lat: Number(destination.lat), lon: Number(destination.lon) });
    }
    return wps;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/journeys', {
        ...form,
        plannedDeparture: new Date(form.plannedDeparture).toISOString(),
        plannedArrival: new Date(form.plannedArrival).toISOString(),
        waypoints: buildWaypoints(),
      });
    },
    onSuccess: onCreated,
    onError: (err: unknown) => { setError((err as Record<string, any>)?.response?.data?.error || 'Failed to create journey'); },
  });
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-panel border border-line rounded-[12px] shadow-xl w-[520px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-ink-0 text-[15px] font-semibold">New Journey Plan</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-[4px] hover:bg-raised text-ink-3 hover:text-ink-0 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setError(''); mutation.mutate(); }} className="px-5 py-4 flex flex-col gap-4">
          <Combobox label="Vehicle" options={vehicleOptions} value={form.vehicleId} onChange={(v) => setForm((f) => ({ ...f, vehicleId: v }))} placeholder="Search plate, make, model..." required />
          <Combobox label="Driver" options={driverOptions} value={form.driverId} onChange={(v) => setForm((f) => ({ ...f, driverId: v }))} placeholder="Search driver name, ID..." required />
          <div>
            <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">Purpose</label>
            <input type="text" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Crew transport Marmul \u2192 Nimr-2" className="w-full h-10 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[13px] outline-none focus:border-[var(--primary)] transition-colors" />
          </div>

          {/* Route waypoints */}
          <div>
            <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">Route</label>
            <div className="flex flex-col gap-2 bg-bg-2 border border-line rounded-[8px] p-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--go)] shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-ink-3 font-mono mb-1">ORIGIN</div>
                  <GeocoderInput
                    placeholder="Search origin location\u2026"
                    proximityLon={55.20}
                    proximityLat={18.13}
                    onSelect={(r) => setOrigin({ name: r.name, lat: String(r.lat), lon: String(r.lon) })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--nogo)] shrink-0" />
                <div className="flex-1">
                  <div className="text-[10px] text-ink-3 font-mono mb-1">DESTINATION</div>
                  <GeocoderInput
                    placeholder="Search destination location\u2026"
                    proximityLon={55.20}
                    proximityLat={18.13}
                    onSelect={(r) => setDestination({ name: r.name, lat: String(r.lat), lon: String(r.lon) })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">Departure</label>
              <input type="datetime-local" value={form.plannedDeparture} onChange={(e) => setForm((f) => ({ ...f, plannedDeparture: e.target.value }))} className="w-full h-10 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[13px] outline-none focus:border-[var(--primary)] transition-colors" required />
            </div>
            <div>
              <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">Arrival</label>
              <input type="datetime-local" value={form.plannedArrival} onChange={(e) => setForm((f) => ({ ...f, plannedArrival: e.target.value }))} className="w-full h-10 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[13px] outline-none focus:border-[var(--primary)] transition-colors" required />
            </div>
          </div>
          <div>
            <label className="text-ink-2 text-[11px] uppercase tracking-wider font-medium mb-1.5 block">Emergency Contact</label>
            <input type="text" value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} placeholder="+968 9XXXXXXX" className="w-full h-10 px-3 bg-surface border border-line rounded-[6px] text-ink-0 text-[13px] outline-none focus:border-[var(--primary)] transition-colors" />
          </div>
          {error && <div className="text-[12px] bg-[var(--nogo-soft)] text-[var(--nogo)] px-3 py-2.5 rounded-[6px]">{error}</div>}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="h-9 px-4 text-ink-2 text-[13px] hover:text-ink-0 transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="h-9 px-5 bg-[var(--primary)] hover:bg-[var(--primary-2)] text-white text-[13px] font-medium rounded-[6px] transition-colors disabled:opacity-50">{mutation.isPending ? 'Creating...' : 'Create Journey'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
