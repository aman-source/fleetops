/**
 * Fleetops icon set — exact paths from design handoff (shared.jsx IK object).
 * Custom SVGs, NOT a library. Do NOT substitute.
 */

const IK: Record<string, string> = {
  map:        "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16",
  route:      "M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 6h4a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4",
  truck:      "M3 7h11v9H3zm11 3h4l3 3v3h-7zM6 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  user:       "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  users:      "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 20a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 20a6 6 0 0 0-5-5.9",
  shield:     "M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z",
  wrench:     "M14.7 6.3a4 4 0 0 1 5 5L17 14l-7 7-3-3 7-7-1.3-1.3a4 4 0 0 1 2-5.4z",
  chart:      "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bell:       "M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  cog:        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4l-2-1.2.2-2.3-2.2-.6-1-2-2.2.6L12 5l-1.8 1.5-2.2-.6-1 2-2.2.6.2 2.3L3 12l2 1.2-.2 2.3 2.2.6 1 2 2.2-.6L12 19l1.8-1.5 2.2.6 1-2 2.2-.6-.2-2.3z",
  doc:        "M7 3h7l5 5v13H7zM14 3v5h5",
  search:     "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-5-5",
  plus:       "M12 5v14M5 12h14",
  filter:     "M3 5h18l-7 9v6l-4-2v-4z",
  alert:      "M12 3l10 18H2zM12 10v5M12 18v.5",
  flag:       "M5 3v18M5 4h11l-2 4 2 4H5",
  check:      "M5 12l5 5 9-11",
  x:          "M6 6l12 12M18 6L6 18",
  refresh:    "M21 4v6h-6M3 20v-6h6M20 14a8 8 0 0 1-14 5l-3-3M4 10a8 8 0 0 1 14-5l3 3",
  chevD:      "M6 9l6 6 6-6",
  chevR:      "M9 6l6 6-6 6",
  chevL:      "M15 6l-6 6 6 6",
  grid:       "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list:       "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  panelL:     "M3 3h18v18H3zM9 3v18M15 9l-3 3 3 3",
  panelR:     "M3 3h18v18H3zM15 3v18M9 9l3 3-3 3",
};

interface GlyphProps {
  k: string;
  size?: number;
  stroke?: number;
  className?: string;
}

export function Glyph({ k, size = 16, stroke = 1.6, className }: GlyphProps) {
  const d = IK[k];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="13" stroke="var(--ink-0)" strokeWidth="1.6" />
        <circle cx="16" cy="16" r="3.5" fill="var(--primary)" />
        <path d="M16 3v6M16 23v6M3 16h6M23 16h6M6.7 6.7l4.2 4.2M21.1 21.1l4.2 4.2M6.7 25.3l4.2-4.2M21.1 10.9l4.2-4.2"
          stroke="var(--ink-0)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="font-semibold tracking-tight text-ink-0" style={{ fontSize: size * 0.7 }}>
        Fleetops
      </span>
    </span>
  );
}

export function Spark({ values, color = 'var(--primary)', w = 64, h = 20 }: {
  values: number[]; color?: string; w?: number; h?: number;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPts = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <polygon points={areaPts} fill={color} fillOpacity="0.12" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
