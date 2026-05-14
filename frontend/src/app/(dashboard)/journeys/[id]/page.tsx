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

export default function JourneyDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (!journey) return <div className="flex-1 flex items-center justify-center text-ink-3 text-[13px]">Loading...</div>;

  const gates = gatesData?.gates ?? [];
  const canSubmit = gatesData?.canSubmit ?? false;
  const passedCount = gates.filter((g) => g.status === 'PASS').length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Topbar */}
      <div className="h-[52px] px-5 flex items-center border-b border-line bg-bg-1 shrink-0 gap-4">
        <Link href="/journeys" className="flex items-center gap-2 text-ink-3 hover:text-ink-0 transition-colors">
          <Glyph k="arrowL" size={14} />
          <span className="font-mono text-[11px]">JOURNEYS</span>
          <Glyph k="chevR" size={11} className="text-ink-4" />
        </Link>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-ink-0">
              {(journey.journeyNo as string) ?? 'Journey'}
            </span>
            <Pill status={(journey.status as string) ?? 'draft'} />
          </div>
          <span className="font-mono text-[10.5px] text-ink-3">
            STEP 3 OF 4 · VALIDATION
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button className="h-7 px-3 flex items-center gap-1.5 bg-bg-3 border border-line rounded-[6px] text-ink-1 text-[12px] hover:bg-bg-4 transition-colors">
            Save draft
          </button>
          <button
            disabled={!canSubmit}
            onClick={async () => { try { await api.post(`/journeys/${id}/submit`); window.location.reload(); } catch {} }}
            className={`h-7 px-3 flex items-center gap-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${
              canSubmit
                ? 'bg-[var(--primary)] border border-[var(--primary)] text-white hover:bg-[var(--primary-2)]'
                : 'bg-bg-3 border border-line text-ink-3 cursor-not-allowed opacity-55'
            }`}
          >
            <Glyph k="shieldChk" size={14} stroke={1.8} />Submit for approval
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-line bg-bg-1 shrink-0">
        {[['1','Plan','done'],['2','Resources','done'],['3','Validate','active'],['4','Submit','pending']].map(([n, l, s], i) => (
          <div key={n} className="contents">
            <div className="flex items-center gap-2">
              <span className={`w-[22px] h-[22px] rounded-full inline-flex items-center justify-center text-[11px] font-mono font-semibold ${
                s === 'done' ? 'bg-[var(--go)] text-[#08251c]' :
                s === 'active' ? 'bg-[var(--primary)] text-white' :
                'bg-bg-3 text-ink-3'
              }`}>
                {s === 'done' ? '\u2713' : n}
              </span>
              <span className={`text-[12.5px] ${s === 'pending' ? 'text-ink-3' : 'text-ink-0'} ${s === 'active' ? 'font-semibold' : ''}`}>{l}</span>
            </div>
            {i < 3 && <div className="flex-1 h-px bg-line" />}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex gap-4 p-4 flex-1 min-h-0 overflow-hidden">
        {/* Left: gate cards */}
        <div className="flex flex-col gap-3 flex-1 overflow-auto min-w-0">
          {/* Summary banner */}
          {!canSubmit && gates.length > 0 && (
            <div className="bg-panel border rounded-[10px] p-3.5" style={{ borderColor: 'rgba(245,165,36,0.3)' }}>
              <div className="flex items-center gap-3">
                <span className="w-[38px] h-[38px] rounded-[8px] bg-[var(--cond-soft)] text-[var(--cond)] inline-flex items-center justify-center shrink-0">
                  <Glyph k="alert" size={18} stroke={2} />
                </span>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-ink-0">
                    Cannot submit yet — {gates.filter((g) => g.status === 'BLOCK').length} blocking, {gates.filter((g) => g.status === 'REVIEW').length} review
                  </div>
                  <div className="text-[12px] text-ink-2 mt-0.5">
                    Resolve all blocking gates to enable submission.
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[32px] font-mono font-medium text-ink-0">
                    {passedCount}<span className="text-[18px] text-ink-3"> / {gates.length}</span>
                  </span>
                  <span className="font-mono text-[10px] text-ink-3 tracking-[0.08em]">GATES CLEARED</span>
                </div>
              </div>
            </div>
          )}

          {canSubmit && gates.length > 0 && (
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
          )}

          {/* Gate cards */}
          {gates.map((g) => {
            const ok = g.status === 'PASS';
            const warn = g.status === 'REVIEW';
            return (
              <div key={g.gateNumber} className="bg-panel border border-line rounded-[10px]">
                {/* Gate header */}
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-line-soft">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-[6px] inline-flex items-center justify-center shrink-0 ${
                      ok ? 'bg-[var(--go-soft)] text-[var(--go)]' :
                      warn ? 'bg-[var(--cond-soft)] text-[var(--cond)]' :
                      'bg-[var(--nogo-soft)] text-[var(--nogo)]'
                    }`}>
                      <Glyph k={ok ? 'check' : warn ? 'alert' : 'x'} size={ok ? 16 : 15} stroke={ok ? 2.5 : 2} />
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-ink-0">{g.gate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill status={ok ? 'go' : warn ? 'cond' : 'nogo'} label={ok ? 'PASS' : warn ? 'REVIEW' : 'BLOCK'} />
                    <Glyph k="chevD" size={14} className="text-ink-3" />
                  </div>
                </div>
                {/* Checks */}
                <div className="flex flex-col">
                  {g.checks.map((c, i) => {
                    const ci = CHECK_ICON[c.status] ?? CHECK_ICON.PASS;
                    return (
                      <div key={i} className="flex items-center gap-3 px-3.5 py-2" style={{ borderBottom: i < g.checks.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                        <span className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center shrink-0" style={{ background: ci.bg, color: ci.fg }}>
                          <Glyph k={ci.icon} size={9} stroke={ci.stroke} />
                        </span>
                        <span className="text-[12px] text-ink-1 min-w-[180px]">{c.name}</span>
                        <span className="font-mono text-[10.5px] tracking-[0.05em] font-medium min-w-[80px]" style={{ color: ci.fg }}>{c.status}</span>
                        <span className="text-[11.5px] text-ink-2">{c.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: journey summary + passengers + approver chain */}
        <div className="flex flex-col gap-3 shrink-0 overflow-auto" style={{ width: 340 }}>
          {/* Journey summary */}
          <div className="bg-panel border border-line rounded-[10px]">
            <div className="px-3.5 py-3 border-b border-line">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium">Journey summary</div>
              <div className="text-[14px] font-semibold text-ink-0 mt-1">
                {(journey.purpose as string) || 'Journey plan'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[11px] text-ink-2">
                  {journey.plannedDeparture ? new Date(journey.plannedDeparture as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                {journey.riskLevel ? <Pill status={(journey.riskLevel as string) === 'H' ? 'nogo' : (journey.riskLevel as string) === 'M' ? 'cond' : 'go'} label={`RISK \u00b7 ${String(journey.riskLevel)}`} /> : null}
              </div>
            </div>
            {/* Mini route placeholder */}
            <div className="p-3">
              <div className="h-[100px] rounded-[6px] relative overflow-hidden" style={{ background: 'var(--bg-3)' }}>
                <svg viewBox="0 0 300 100" className="absolute inset-0 w-full h-full">
                  <path d="M 30 80 Q 80 20, 160 40 T 270 20" fill="none" stroke="var(--primary)" strokeWidth="2" />
                  <circle cx="30" cy="80" r="5" fill="var(--go)" stroke="var(--bg-0)" strokeWidth="1.5" />
                  <circle cx="270" cy="20" r="5" fill="var(--nogo)" stroke="var(--bg-0)" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 px-3.5 pb-3">
              {[
                ['Departure', journey.plannedDeparture ? new Date(journey.plannedDeparture as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '\u2014'],
                ['ETA', journey.plannedArrival ? new Date(journey.plannedArrival as string).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '\u2014'],
                ['Emergency', (journey.emergencyContact as string) || '\u2014'],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-[11.5px] text-ink-3">{l}</span>
                  <span className="text-[11.5px] text-ink-1">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Passengers */}
          <div className="bg-panel border border-line rounded-[10px]">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
              <span className="text-[13px] font-semibold text-ink-0">Passengers</span>
              <span className="font-mono text-[10.5px] text-ink-3">{passengers?.length ?? 0}</span>
            </div>
            <div className="flex flex-col">
              {(!passengers || passengers.length === 0) && (
                <div className="px-3.5 py-4 text-center text-ink-3 text-[12px]">No passengers added</div>
              )}
              {passengers?.map((p, i) => (
                <div key={p.id as string} className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ borderBottom: i < passengers.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                  <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[10px] font-semibold font-mono shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--cyan, #38d4d4))' }}>
                    {((p.passengerName as string) ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-ink-0">{p.passengerName as string}</div>
                    <div className="font-mono text-[10px] text-ink-3">{(p.employeeId as string) ?? ''} {(p.department as string) ? '\u00b7 ' + (p.department as string) : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Approver chain */}
          <div className="bg-panel border border-line rounded-[10px] p-3.5">
            <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3 font-medium mb-2">Approver chain</div>
            {[
              ['Submitter', 'On submit', 'pending'],
              ['Journey Mgr', 'Auto-routed', 'pending'],
              ['HSE officer', 'If risk \u2265 M', 'pending'],
              ['Final', 'Auto on approval', 'pending'],
            ].map(([role, who, s], i, arr) => (
              <div key={i} className="flex gap-2.5" style={{ paddingTop: i ? 8 : 0 }}>
                <div className="flex flex-col items-center" style={{ width: 14, flexShrink: 0 }}>
                  <span className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: s === 'done' ? 'var(--go)' : s === 'active' ? 'var(--primary)' : 'var(--bg-3)' }} />
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-line mt-0.5" style={{ minHeight: 16 }} />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] text-ink-1">{role}</span>
                    <span className="font-mono text-[10px] text-ink-3">\u2014</span>
                  </div>
                  <span className="text-[11px] text-ink-3">{who}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
