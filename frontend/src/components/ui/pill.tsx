const STATUS_MAP: Record<string, { label: string; klass: string }> = {
  go:        { label: 'GO',          klass: 'go' },
  cond:      { label: 'CONDITIONAL', klass: 'cond' },
  nogo:      { label: 'NO-GO',       klass: 'nogo' },
  active:    { label: 'ACTIVE',      klass: 'info' },
  approved:  { label: 'APPROVED',    klass: 'go' },
  pending:   { label: 'PENDING',     klass: 'cond' },
  pending_approval: { label: 'PENDING', klass: 'cond' },
  rejected:  { label: 'REJECTED',    klass: 'nogo' },
  draft:     { label: 'DRAFT',       klass: 'neutral' },
  delayed:   { label: 'DELAYED',     klass: 'cond' },
  deviated:  { label: 'DEVIATED',    klass: 'nogo' },
  closed:    { label: 'CLOSED',      klass: 'neutral' },
  completed: { label: 'COMPLETED',   klass: 'go' },
  emergency: { label: 'EMERGENCY',   klass: 'nogo' },
  available: { label: 'AVAILABLE',   klass: 'go' },
  conditional: { label: 'CONDITIONAL', klass: 'cond' },
  under_maintenance: { label: 'IN MAINT.', klass: 'info' },
  no_go:     { label: 'NO-GO',       klass: 'nogo' },
  expired_documents: { label: 'EXPIRED DOCS', klass: 'nogo' },
  hse_hold:  { label: 'HSE HOLD',    klass: 'nogo' },
};

const KLASS_STYLES: Record<string, string> = {
  go:      'text-[var(--go)] bg-[var(--go-soft)] border-[rgba(30,201,145,0.25)]',
  cond:    'text-[var(--cond)] bg-[var(--cond-soft)] border-[rgba(245,165,36,0.25)]',
  nogo:    'text-[var(--nogo)] bg-[var(--nogo-soft)] border-[rgba(239,71,71,0.3)]',
  info:    'text-[var(--info)] bg-[var(--info-soft)] border-[rgba(74,144,255,0.25)]',
  neutral: 'text-ink-2 bg-[var(--neutral-soft)] border-[rgba(107,118,137,0.25)]',
};

export function Pill({ status, label }: { status: string; label?: string }) {
  const s = STATUS_MAP[status] ?? { label: label ?? status.toUpperCase(), klass: 'neutral' };
  const style = KLASS_STYLES[s.klass] ?? KLASS_STYLES.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-px rounded-full text-[11px] font-medium font-mono tracking-[0.01em] border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {label ?? s.label}
    </span>
  );
}
