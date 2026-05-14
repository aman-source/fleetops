'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';
import Link from 'next/link';

interface GateCheck { name: string; status: string; message: string; }
interface GateResult { gate: string; gateNumber: number; status: string; checks: GateCheck[]; }
interface AllGatesResult { canSubmit: boolean; gates: GateResult[]; }

const CHECK_ICON: Record<string, { icon: string; stroke: number; bg: string; fg: string }> = {
  PASS: { icon: 'check', stroke: 3.5, bg: 'var(--go-soft)', fg: 'var(--go)' },
  BLOCK: { icon: 'x', stroke: 3, bg: 'var(--nogo-soft)', fg: 'var(--nogo)' },
  REVIEW: { icon: 'alert', stroke: 2.5, bg: 'var(--cond-soft)', fg: 'var(--cond)' },
};

const GATE_ICONS: Record<number, string> = { 1: 'user', 2: 'truck', 3: 'doc', 4: 'route', 5: 'users', 6: 'shield' };

export default function JourneyComposerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: journey } = useQuery({
    queryKey: ['journey', id],
    queryFn: async () => unwrap<Record<string, unknown>>(await api.get(`/journeys/${id}`)),
  });

  const { data: gatesData } = useQuery({
    queryKey: ['journey-gates', id],
    queryFn: async () => unwrap<AllGatesResult>(await api.get(`/journeys/${id}/gates`)),
  });

  const { data: passengers } = useQuery({
    queryKey: ['journey-passengers', id],
    queryFn: async () => unwrap<Array<Record<string, unknown>>>(await api.get(`/journeys/${id}/passengers`)),
  });

  if (!journey) return <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading&#x2026;</div>;

  const gates = gatesData?.gates ?? [];
  const canSubmit = gatesData?.canSubmit ?? false;
  const passedCount = gates.filter((g) => g.status === 'PASS').length;
  const status = (journey.status as string) ?? 'draft';

  // Determine stepper state from journey status
  const stepStates = getStepStates(status, gates.length > 0);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="px-5 pt-3 pb-0 bg-bg-1 border-b border-line shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/journeys" className="flex items-center gap-1.5 text-ink-3 hover:text-ink-0 transition-colors">
              <Glyph k="chevL" size={14} />
              <span className="font-mono text-[11px]">JOURNEYS</span>
            </Link>
            <span className="text-ink-3">/</span>
            <span className="text-[16px] font-semibold text-ink-0">{(journey.journeyNo as string) ?? 'Journey'}</span>
            <Pill status={status} />
          </div>
          <div className="flex items-center gap-2">
            <button className="h-7 px-3 flex items-center gap-1.5 bg-bg-3 border border-line rounded-[6px] text-ink-1 text-[12px] hover:bg-bg-4 transition-colors">
              <Glyph k="doc" size={12} />Save draft
            </button>
            <button
              disabled={!canSubmit}
              onClick={async () => { try { await api.post(`/journeys/${id}/submit`); window.location.reload(); } catch {} }}
              className={`h-7 px-3 flex items-center gap-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
                canSubmit
                  ? 'bg-[var(--primary)] border border-[var(--primary)] text-white hover:brightness-110'
                  : 'bg-bg-3 border border-line text-ink-3 cursor-not-allowed opacity-55'
              }`}
            >
              <Glyph k="shield" size={13} stroke={1.8} />Submit for approval
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0 -mb-px">
          {stepStates.map((st, i) => (
            <div key={st.label} className="contents">
              <div className="flex items-center gap-1.5 pb-2.5" style={{ borderBottom: st.state === 'active' ? '2px solid var(--primary)' : '2px solid transparent' }}>
                <span className={`w-[20px] h-[20px] rounded-full inline-flex items-center justify-center text-[10px] font-mono font-semibold ${
                  st.state === 'done' ? 'bg-[var(--go)] text-[#08251c]' :
                  st.state === 'active' ? 'bg-[var(--primary)] text-white' :
                  'bg-bg-3 text-ink-3'
                }`}>
                  {st.state === 'done' ? '\u2713' : String(i + 1)}
                </span>
                <span className={`text-[12px] pr-4 ${st.state === 'pending' ? 'text-ink-3' : 'text-ink-0'} ${st.state === 'active' ? 'font-semibold' : ''}`}>{st.label}</span>
              </div>
              {i < stepStates.length - 1 && <div className="w-8 h-px bg-line mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Body: gates left + summary right */}
      <div className="flex gap-4 p-4 flex-1 min-h-0 overflow-hidden">
        {/* Left: gate cards */}
        <div className="flex flex-col gap-3 flex-1 overflow-auto min-w-0">
          {/* Summary banner */}
          <SummaryBanner canSubmit={canSubmit} gates={gates} passedCount={passedCount} />

          {/* Gate cards */}
          {gates.map((g) => {
            const ok = g.status === 'PASS';
            const warn = g.status === 'REVIEW';
            const gIcon = GATE_ICONS[g.gateNumber] ?? 'check';
            return (
              <div key={g.gateNumber} className="bg-panel border border-line rounded-[10px]">
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-line-soft">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-[6px] inline-flex items-center justify-center shrink-0 ${
                      ok ? 'bg-[var(--go-soft)] text-[var(--go)]' :
                      warn ? 'bg-[var(--cond-soft)] text-[var(--cond)]' :
                      'bg-[var(--nogo-soft)] text-[var(--nogo)]'
                    }`}>
                      <Glyph k={gIcon} size={15} stroke={1.6} />
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-ink-0">Gate {g.gateNumber}: {g.gate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill status={ok ? 'go' : warn ? 'cond' : 'nogo'} label={ok ? 'PASS' : warn ? 'REVIEW' : 'BLOCK'} />
                  </div>
                </div>
                <div className="flex flex-col">
                  {g.checks.map((c, i) => {
                    const ci = CHECK_ICON[c.status] ?? CHECK_ICON.PASS;
                    return (
                      <div key={i} className="flex items-center gap-3 px-3.5 py-2" style={{ borderBottom: i < g.checks.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                        <span className="w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: ci.bg, color: ci.fg }}>
                          <Glyph k={ci.icon} size={9} stroke={ci.stroke} />
                        </span>
                        <span className="text-[12px] text-ink-1 min-w-[180px]">{c.name}</span>
                        <span className="font-mono text-[10.5px] tracking-[0.05em] font-medium min-w-[60px]" style={{ color: ci.fg }}>{c.status}</span>
                        <span className="text-[11.5px] text-ink-2 flex-1">{c.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right panel 360px */}
        <div className="flex flex-col gap-3 shrink-0 overflow-auto" style={{ width: 360 }}>
          {/* Journey summary card */}
          <div className="bg-panel border border-line rounded-[10px]">
            <div className="px-3.5 py-3 border-b border-line">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">Journey summary</div>
              <div className="text-[14px] font-semibold text-ink-0 mt-1">{(journey.purpose as string) || 'Journey plan'}</div>
            </div>

            {/* Mini route SVG */}
            <div className="px-3.5 pt-3">
              <div className="h-[90px] rounded-[6px] relative overflow-hidden bg-bg-3">
                <svg viewBox="0 0 320 90" className="absolute inset-0 w-full h-full">
                  <defs>
                    <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--go)" />
                      <stop offset="100%" stopColor="var(--nogo)" />
                    </linearGradient>
                  </defs>
                  <path d="M 25 65 C 80 10, 160 80, 240 30 S 290 15, 295 20" fill="none" stroke="url(#routeGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="25" cy="65" r="5" fill="var(--go)" stroke="var(--bg-1)" strokeWidth="2" />
                  <circle cx="295" cy="20" r="5" fill="var(--nogo)" stroke="var(--bg-1)" strokeWidth="2" />
                  <text x="35" y="75" fill="var(--ink-3)" fontSize="8" fontFamily="var(--font-mono)">Origin</text>
                  <text x="255" y="15" fill="var(--ink-3)" fontSize="8" fontFamily="var(--font-mono)">Destination</text>
                </svg>
              </div>
            </div>

            {/* Details table */}
            <div className="flex flex-col gap-0 px-3.5 py-3">
              {([
                ['Vehicle', (journey.vehiclePlateNo as string) ?? '\u2014'],
                ['Driver', (journey.driverName as string) ?? '\u2014'],
                ['Origin', (journey.origin as string) ?? '\u2014'],
                ['Destination', (journey.destination as string) ?? '\u2014'],
                ['Departure', journey.plannedDeparture ? new Date(journey.plannedDeparture as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '\u2014'],
                ['ETA', journey.plannedArrival ? new Date(journey.plannedArrival as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '\u2014'],
                ['Risk Level', (journey.riskLevel as string) ?? '\u2014'],
                ['Emergency', (journey.emergencyContact as string) ?? '\u2014'],
              ] as [string, string][]).map(([l, v]) => (
                <div key={l} className="flex items-center justify-between py-1.5 border-b border-line-soft last:border-0">
                  <span className="text-[11px] text-ink-3">{l}</span>
                  <span className="text-[11px] text-ink-0 font-mono text-right max-w-[180px] truncate">
                    {l === 'Risk Level' && v !== '\u2014'
                      ? <Pill status={v === 'H' ? 'nogo' : v === 'M' ? 'cond' : 'go'} label={`RISK ${v}`} />
                      : v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Passengers */}
          <div className="bg-panel border border-line rounded-[10px]">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
              <span className="text-[13px] font-semibold text-ink-0">Passengers</span>
              <span className="font-mono text-[10.5px] text-ink-3">{passengers?.length ?? 0} / {(journey.seatCount as number) ?? '?'}</span>
            </div>
            <div className="flex flex-col">
              {(!passengers || passengers.length === 0) && (
                <div className="px-3.5 py-4 text-center text-ink-3 text-[12px]">No passengers added</div>
              )}
              {passengers?.map((p, i) => {
                const reviewStatus = (p.reviewStatus as string) ?? 'pending';
                return (
                  <div key={p.id as string} className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ borderBottom: i < passengers.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                    <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-semibold font-mono shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--cyan, #38d4d4))' }}>
                      {((p.passengerName as string) ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-ink-0">{p.passengerName as string}</div>
                      <div className="font-mono text-[10px] text-ink-3">
                        {(p.employeeId as string) ?? ''}{(p.department as string) ? ` \u00b7 ${p.department as string}` : ''}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono font-medium border ${
                      reviewStatus === 'approved' ? 'text-[var(--go)] bg-[var(--go-soft)] border-[rgba(30,201,145,0.25)]' :
                      reviewStatus === 'rejected' ? 'text-[var(--nogo)] bg-[var(--nogo-soft)] border-[rgba(239,71,71,0.3)]' :
                      'text-ink-3 bg-bg-3 border-line'
                    }`}>
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {reviewStatus.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approver chain */}
          <div className="bg-panel border border-line rounded-[10px] p-3.5">
            <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-2">Approver chain</div>
            {[
              { role: 'Submitter', who: 'On submit', state: status === 'draft' ? 'active' : 'done' },
              { role: 'Journey Manager', who: 'Auto-routed', state: status === 'pending_approval' ? 'active' : status === 'approved' ? 'done' : 'pending' },
              { role: 'HSE Officer', who: 'If risk \u2265 Medium', state: status === 'approved' && (journey.riskLevel as string) === 'H' ? 'active' : 'pending' },
              { role: 'Final Release', who: 'Auto on approval', state: status === 'approved' ? 'done' : 'pending' },
            ].map((step, i, arr) => (
              <div key={i} className="flex gap-2.5" style={{ paddingTop: i ? 8 : 0 }}>
                <div className="flex flex-col items-center" style={{ width: 14, flexShrink: 0 }}>
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 ${
                    step.state === 'done' ? 'bg-[var(--go)]' : step.state === 'active' ? 'bg-[var(--primary)]' : 'bg-bg-3'
                  }`} />
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-line mt-0.5" style={{ minHeight: 16 }} />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11.5px] ${step.state === 'pending' ? 'text-ink-3' : 'text-ink-1'}`}>{step.role}</span>
                    {step.state === 'done' && <Glyph k="check" size={11} stroke={2.5} className="text-[var(--go)]" />}
                  </div>
                  <span className="text-[10px] text-ink-3">{step.who}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryBanner({ canSubmit, gates, passedCount }: { canSubmit: boolean; gates: GateResult[]; passedCount: number }) {
  if (gates.length === 0) return null;

  const blockCount = gates.filter(g => g.status === 'BLOCK').length;
  const reviewCount = gates.filter(g => g.status === 'REVIEW').length;

  if (canSubmit) {
    return (
      <div className="bg-panel border rounded-[10px] p-3.5" style={{ borderColor: 'rgba(30,201,145,0.3)' }}>
        <div className="flex items-center gap-3">
          <span className="w-[38px] h-[38px] rounded-[8px] bg-[var(--go-soft)] text-[var(--go)] inline-flex items-center justify-center shrink-0">
            <Glyph k="check" size={18} stroke={2.5} />
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-ink-0">All gates cleared — ready to submit</div>
            <div className="text-[12px] text-ink-2 mt-0.5">Click "Submit for approval" to send to approvers.</div>
          </div>
          <span className="text-[32px] font-mono font-medium text-[var(--go)]">
            {passedCount}<span className="text-[18px] text-ink-3"> / {gates.length}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border rounded-[10px] p-3.5" style={{ borderColor: 'rgba(245,165,36,0.3)' }}>
      <div className="flex items-center gap-3">
        <span className="w-[38px] h-[38px] rounded-[8px] bg-[var(--cond-soft)] text-[var(--cond)] inline-flex items-center justify-center shrink-0">
          <Glyph k="alert" size={18} stroke={2} />
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-ink-0">
            Cannot submit — {blockCount} blocking{reviewCount > 0 ? `, ${reviewCount} review` : ''}
          </div>
          <div className="text-[12px] text-ink-2 mt-0.5">Resolve all blocking gates to enable submission.</div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[32px] font-mono font-medium text-ink-0">
            {passedCount}<span className="text-[18px] text-ink-3"> / {gates.length}</span>
          </span>
          <span className="font-mono text-[10px] text-ink-3 tracking-[0.08em]">GATES CLEARED</span>
        </div>
      </div>
    </div>
  );
}

function getStepStates(status: string, hasGates: boolean) {
  const steps = [
    { label: 'Plan', state: 'done' as string },
    { label: 'Resources', state: 'done' as string },
    { label: 'Validate', state: hasGates ? 'active' : 'pending' as string },
    { label: 'Submit', state: 'pending' as string },
  ];
  if (status === 'pending_approval' || status === 'approved' || status === 'completed') {
    steps[2].state = 'done';
    steps[3].state = status === 'approved' || status === 'completed' ? 'done' : 'active';
  }
  return steps;
}
