import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';

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
  camera:     "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  phone:      "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0 1 22 16.92z",
  inbox:      "M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  pin:        "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  qr:         "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3h-3M14 20h3M17 17h4v4h-4",
  share:      "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  signal:     "M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4",
  shieldChk:  "M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM9 12l2 2 4-4",
};

interface GlyphProps {
  k: string;
  size?: number;
  stroke?: number;
  color?: string;
}

export function Glyph({ k, size = 16, stroke = 1.6, color = colors.ink0 }: GlyphProps) {
  const d = IK[k];
  if (!d) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={d}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
