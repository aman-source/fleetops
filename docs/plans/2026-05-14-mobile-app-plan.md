# Mobile App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production React Native (Expo) mobile app with 6 screens — driver (04-07) and passenger (08-09) — matching design handoff exactly.

**Architecture:** Single Expo app at `mobile/` with role-based routing via Expo Router. Driver gets 5-tab layout, passenger gets 4-tab layout. Auth guard in root layout. Offline-first driver checklist via MMKV. Real-time tracking via WebSocket + Mapbox.

**Tech Stack:** Expo SDK 53, Expo Router, TypeScript, Zustand, TanStack Query, react-native-mapbox-gl, expo-camera, react-native-mmkv, @gorhom/bottom-sheet, react-native-svg, Axios, IBM Plex fonts.

**Design reference:** `design_handoff_fleetops/driver-app.jsx` (screens 04-07), `design_handoff_fleetops/passenger-app.jsx` (screens 08-09), `design_handoff_fleetops/shared.jsx` (icons, primitives).

---

## Task 1: Workspace Setup

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `frontend/pnpm-workspace.yaml`

**Step 1: Add mobile to pnpm workspace**

In root `pnpm-workspace.yaml`, add `mobile` and `frontend`:
```yaml
packages:
  - packages/*
  - frontend
  - mobile

ignoredBuiltDependencies:
  - bcrypt
  - esbuild
  - msgpackr-extract
```

In `frontend/pnpm-workspace.yaml`, remove it (workspaces belong at root only, not nested):
```
# Delete this file — workspace config is in root pnpm-workspace.yaml
```

Actually, keep `frontend/pnpm-workspace.yaml` as-is since Next.js uses it for `ignoredBuiltDependencies`. Just update root.

**Step 2: Verify workspace**

Run: `pnpm install` from project root.
Expected: no errors.

**Step 3: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore: add mobile + frontend to pnpm workspace"
```

---

## Task 2: Expo Project Scaffold

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/tsconfig.json`
- Create: `mobile/app.json`
- Create: `mobile/.gitignore`

**Step 1: Create `mobile/package.json`**

```json
{
  "name": "@fleetops/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@fleetops/shared": "workspace:*",
    "@gorhom/bottom-sheet": "^5.1.2",
    "@mapbox/mapbox-gl-native": "^10.1.31",
    "@rnmapbox/maps": "^10.1.31",
    "@tanstack/react-query": "^5.100.10",
    "axios": "^1.16.1",
    "expo": "~53.0.0",
    "expo-camera": "~16.1.0",
    "expo-font": "~13.3.0",
    "expo-linking": "~7.1.0",
    "expo-router": "~5.0.0",
    "expo-sharing": "~13.1.0",
    "expo-splash-screen": "~0.30.0",
    "expo-status-bar": "~2.2.0",
    "react": "19.0.0",
    "react-native": "0.79.2",
    "react-native-gesture-handler": "~2.24.0",
    "react-native-mmkv": "^3.2.0",
    "react-native-reanimated": "~3.17.0",
    "react-native-safe-area-context": "~5.4.0",
    "react-native-screens": "~4.10.0",
    "react-native-svg": "^15.11.2",
    "zustand": "^5.0.13",
    "zod": "^3.24.1",
    "@react-native-community/netinfo": "^11.4.1"
  },
  "devDependencies": {
    "@types/react": "^19",
    "typescript": "^5"
  }
}
```

**Step 2: Create `mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@fleetops/shared": ["../packages/shared/src"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**Step 3: Create `mobile/app.json`**

```json
{
  "expo": {
    "name": "Fleetops",
    "slug": "fleetops",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "fleetops",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#f6f4ee"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.artech.fleetops",
      "infoPlist": {
        "NSCameraUsageDescription": "Camera needed for pre-trip inspection photos and QR code scanning.",
        "NSLocationWhenInUseUsageDescription": "Location needed for trip tracking and boarding verification."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f6f4ee"
      },
      "package": "com.artech.fleetops",
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION"]
    },
    "plugins": [
      "expo-router",
      "expo-font",
      [
        "expo-camera",
        {
          "cameraPermission": "Camera needed for pre-trip inspection photos and QR code scanning."
        }
      ],
      [
        "@rnmapbox/maps",
        {
          "RNMapboxMapsDownloadToken": "MAPBOX_TOKEN_HERE"
        }
      ]
    ]
  }
}
```

**Step 4: Create `mobile/.gitignore`**

```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
ios/
android/
```

**Step 5: Create asset placeholders**

Run:
```bash
mkdir -p mobile/assets
# Create placeholder 1x1 PNGs (replace with real assets later)
```

**Step 6: Install dependencies**

Run from project root:
```bash
cd mobile && pnpm install
```
Expected: dependencies install successfully.

**Step 7: Commit**

```bash
git add mobile/
git commit -m "feat(mobile): scaffold Expo project with dependencies"
```

---

## Task 3: Theme & Design Tokens

**Files:**
- Create: `mobile/src/theme/colors.ts`
- Create: `mobile/src/theme/tokens.ts`
- Create: `mobile/src/theme/typography.ts`

**Step 1: Create `mobile/src/theme/colors.ts`**

Port exact CSS custom properties from `frontend/src/app/globals.css`:

```typescript
export const colors = {
  // Editorial mood (default)
  bg0: '#f6f4ee',
  bg1: '#fbfaf6',
  bg2: '#ffffff',
  bg3: '#f0ede4',
  bg4: '#e8e4d8',
  panel: '#fbfaf6',
  surface: '#ffffff',
  raised: '#ffffff',

  line: '#e2dccb',
  lineSoft: '#ece7d8',
  lineStrong: '#cdc4ad',

  ink0: '#0d0f13',
  ink1: '#1a1e25',
  ink2: '#3d4555',
  ink3: '#5c5a4e',
  ink4: '#a39d8a',

  // Desert palette (default)
  primary: '#d97757',
  primary2: '#c46a4a',
  primarySoft: 'rgba(217,119,87,0.14)',

  go: '#7aa05b',
  goSoft: 'rgba(122,160,91,0.16)',
  cond: '#e0a738',
  condSoft: 'rgba(224,167,56,0.16)',
  nogo: '#c0392b',
  nogoSoft: 'rgba(192,57,43,0.16)',
  info: '#d97757',
  infoSoft: 'rgba(217,119,87,0.14)',
  neutral: '#6b7689',
  neutralSoft: 'rgba(60,67,77,0.08)',

  // Hardcoded
  white: '#ffffff',
  black: '#000000',
  sos: '#dc2626',

  // NFC/QR dark screen
  darkBg: '#0a0d12',
  darkBg2: '#1a2530',
  darkInk: '#f1f4f8',
} as const;
```

**Step 2: Create `mobile/src/theme/tokens.ts`**

```typescript
export const radii = {
  xs: 4,   // r-1: chips
  sm: 6,   // r-2: buttons, inputs
  md: 10,  // r-3: panels
  lg: 14,  // r-4: cards, modals
  full: 999,
} as const;

export const spacing = {
  screenH: 18,   // horizontal screen padding
  cardPad: 14,   // card internal padding
  sectionGap: 12,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;
```

**Step 3: Create `mobile/src/theme/typography.ts`**

```typescript
import { TextStyle } from 'react-native';

const FONT_SANS = 'IBMPlexSans';
const FONT_MONO = 'IBMPlexMono';

export const fonts = {
  sans400: `${FONT_SANS}-Regular`,
  sans500: `${FONT_SANS}-Medium`,
  sans600: `${FONT_SANS}-SemiBold`,
  mono400: `${FONT_MONO}-Regular`,
  mono500: `${FONT_MONO}-Medium`,
} as const;

export const type: Record<string, TextStyle> = {
  display: { fontFamily: fonts.sans600, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.sans600, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.sans600, fontSize: 16, lineHeight: 22 },
  headingSm: { fontFamily: fonts.sans600, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fonts.sans400, fontSize: 13, lineHeight: 19 },
  bodySm: { fontFamily: fonts.sans400, fontSize: 11, lineHeight: 16 },
  label: {
    fontFamily: fonts.mono500,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mono: { fontFamily: fonts.mono400, fontSize: 11, lineHeight: 16 },
  monoLg: { fontFamily: fonts.mono400, fontSize: 14, lineHeight: 20 },
} as const;
```

**Step 4: Commit**

```bash
git add mobile/src/theme/
git commit -m "feat(mobile): add design tokens — colors, spacing, typography"
```

---

## Task 4: Icon System (Glyph)

**Files:**
- Create: `mobile/src/components/ui/glyph.tsx`

**Step 1: Create Glyph component**

Port exact SVG paths from `frontend/src/components/ui/glyph.tsx` to react-native-svg:

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/colors';

const IK: Record<string, string> = {
  map:      "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16",
  route:    "M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 6h4a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4",
  truck:    "M3 7h11v9H3zm11 3h4l3 3v3h-7zM6 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  user:     "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  users:    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 20a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 20a6 6 0 0 0-5-5.9",
  shield:   "M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z",
  wrench:   "M14.7 6.3a4 4 0 0 1 5 5L17 14l-7 7-3-3 7-7-1.3-1.3a4 4 0 0 1 2-5.4z",
  chart:    "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bell:     "M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 21a2 2 0 0 0 4 0",
  cog:      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4l-2-1.2.2-2.3-2.2-.6-1-2-2.2.6L12 5l-1.8 1.5-2.2-.6-1 2-2.2.6.2 2.3L3 12l2 1.2-.2 2.3 2.2.6 1 2 2.2-.6L12 19l1.8-1.5 2.2.6 1-2 2.2-.6-.2-2.3z",
  doc:      "M7 3h7l5 5v13H7zM14 3v5h5",
  search:   "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-5-5",
  plus:     "M12 5v14M5 12h14",
  filter:   "M3 5h18l-7 9v6l-4-2v-4z",
  alert:    "M12 3l10 18H2zM12 10v5M12 18v.5",
  flag:     "M5 3v18M5 4h11l-2 4 2 4H5",
  check:    "M5 12l5 5 9-11",
  x:        "M6 6l12 12M18 6L6 18",
  refresh:  "M21 4v6h-6M3 20v-6h6M20 14a8 8 0 0 1-14 5l-3-3M4 10a8 8 0 0 1 14-5l3 3",
  chevD:    "M6 9l6 6 6-6",
  chevR:    "M9 6l6 6-6 6",
  chevL:    "M15 6l-6 6 6 6",
  grid:     "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list:     "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  panelL:   "M3 3h18v18H3zM9 3v18M15 9l-3 3 3 3",
  panelR:   "M3 3h18v18H3zM15 3v18M9 9l3 3-3 3",
  camera:   "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  phone:    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0 1 22 16.92z",
  inbox:    "M22 12h-6l-2 3H10l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  pin:      "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  qr:       "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v3h-3M14 20h3M17 17h4v4h-4",
  share:    "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  signal:   "M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4",
  shieldChk:"M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM9 12l2 2 4-4",
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
```

**Step 2: Commit**

```bash
git add mobile/src/components/ui/glyph.tsx
git commit -m "feat(mobile): add Glyph icon component — 30+ custom SVGs from design handoff"
```

---

## Task 5: UI Primitives

**Files:**
- Create: `mobile/src/components/ui/pill.tsx`
- Create: `mobile/src/components/ui/button.tsx`
- Create: `mobile/src/components/ui/card.tsx`

**Step 1: Create Pill component**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

const STATUS_MAP: Record<string, { label: string; klass: string }> = {
  go:        { label: 'GO',          klass: 'go' },
  cond:      { label: 'CONDITIONAL', klass: 'cond' },
  nogo:      { label: 'NO-GO',       klass: 'nogo' },
  active:    { label: 'ACTIVE',      klass: 'info' },
  approved:  { label: 'APPROVED',    klass: 'go' },
  pending:   { label: 'PENDING',     klass: 'cond' },
  rejected:  { label: 'REJECTED',    klass: 'nogo' },
  draft:     { label: 'DRAFT',       klass: 'neutral' },
  completed: { label: 'COMPLETED',   klass: 'go' },
  available: { label: 'AVAILABLE',   klass: 'go' },
  conditional: { label: 'CONDITIONAL', klass: 'cond' },
};

const KLASS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  go:      { text: colors.go, bg: colors.goSoft, border: 'rgba(122,160,91,0.25)' },
  cond:    { text: colors.cond, bg: colors.condSoft, border: 'rgba(224,167,56,0.25)' },
  nogo:    { text: colors.nogo, bg: colors.nogoSoft, border: 'rgba(192,57,43,0.3)' },
  info:    { text: colors.info, bg: colors.infoSoft, border: 'rgba(217,119,87,0.25)' },
  neutral: { text: colors.ink2, bg: colors.neutralSoft, border: 'rgba(107,118,137,0.25)' },
};

export function Pill({ status, label }: { status: string; label?: string }) {
  const s = STATUS_MAP[status] ?? { label: label ?? status.toUpperCase(), klass: 'neutral' };
  const c = KLASS_COLORS[s.klass] ?? KLASS_COLORS.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={[styles.dot, { backgroundColor: c.text }]} />
      <Text style={[styles.text, { color: c.text }]}>{label ?? s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: 999 },
  text: { fontFamily: fonts.mono500, fontSize: 11, letterSpacing: 0.1 },
});
```

**Step 2: Create Button component**

```tsx
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = 'primary', disabled, icon }: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      {icon}
      <Text style={[styles.label, v.text]}>{title}</Text>
    </Pressable>
  );
}

const VARIANTS: Record<string, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.ink0 },
    text: { color: colors.white },
  },
  secondary: {
    container: { backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.line },
    text: { color: colors.ink0 },
  },
  danger: {
    container: { backgroundColor: colors.sos },
    text: { color: colors.white },
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
    text: { color: colors.ink0 },
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  label: { fontFamily: fonts.sans600, fontSize: 15 },
});
```

**Step 3: Create Card component**

```tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Card({ children, style, noPadding }: CardProps) {
  return (
    <View style={[styles.card, !noPadding && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  padded: {
    padding: spacing.cardPad,
  },
});
```

**Step 4: Commit**

```bash
git add mobile/src/components/ui/
git commit -m "feat(mobile): add Pill, Button, Card UI primitives"
```

---

## Task 6: Lib — API Client, Storage, WebSocket

**Files:**
- Create: `mobile/src/lib/api.ts`
- Create: `mobile/src/lib/storage.ts`
- Create: `mobile/src/lib/ws.ts`
- Create: `mobile/src/lib/sync-queue.ts`

**Step 1: Create API client**

Port from `frontend/src/lib/api.ts`, replacing `localStorage` with MMKV:

```typescript
import axios from 'axios';
import { storage } from './storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = storage.getString('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          storage.set('accessToken', data.data.tokens.accessToken);
          storage.set('refreshToken', data.data.tokens.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.data.tokens.accessToken}`;
          return api(error.config);
        } catch {
          storage.delete('accessToken');
          storage.delete('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  },
);

export function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data;
}
```

**Step 2: Create MMKV storage wrapper**

```typescript
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'fleetops' });

export function getJSON<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function setJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}
```

**Step 3: Create WebSocket manager**

Port from `frontend/src/lib/ws.ts`, replacing localStorage:

```typescript
import { storage } from './storage';

let socket: WebSocket | null = null;
const listeners = new Map<string, Set<(data: unknown) => void>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWs() {
  if (socket?.readyState === WebSocket.OPEN) return;

  const token = storage.getString('accessToken');
  if (!token) return;

  const wsUrl = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000/ws';
  socket = new WebSocket(`${wsUrl}?token=${token}`);

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.room) {
        const roomListeners = listeners.get(msg.room);
        if (roomListeners) {
          for (const cb of roomListeners) cb(msg.data);
        }
      }
    } catch {}
  };

  socket.onclose = () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWs, 3000);
  };

  socket.onerror = () => {
    socket?.close();
  };
}

export function subscribe(room: string, callback: (data: unknown) => void) {
  if (!listeners.has(room)) listeners.set(room, new Set());
  listeners.get(room)!.add(callback);

  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'subscribe', room }));
  }

  return () => {
    listeners.get(room)?.delete(callback);
    if (listeners.get(room)?.size === 0) {
      listeners.delete(room);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'unsubscribe', room }));
      }
    }
  };
}

export function disconnectWs() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
  listeners.clear();
}
```

**Step 4: Create sync queue**

```typescript
import { storage, getJSON, setJSON } from './storage';
import { api } from './api';
import NetInfo from '@react-native-community/netinfo';

interface QueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: unknown;
  retries: number;
  createdAt: string;
}

const QUEUE_KEY = 'sync:queue';
const MAX_RETRIES = 3;

export function enqueue(item: Omit<QueueItem, 'id' | 'retries' | 'createdAt'>): void {
  const queue = getJSON<QueueItem[]>(QUEUE_KEY) ?? [];
  queue.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    retries: 0,
    createdAt: new Date().toISOString(),
  });
  setJSON(QUEUE_KEY, queue);
}

export async function flushQueue(): Promise<void> {
  const queue = getJSON<QueueItem[]>(QUEUE_KEY) ?? [];
  if (queue.length === 0) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const remaining: QueueItem[] = [];

  for (const item of queue) {
    try {
      await api({ method: item.method, url: item.endpoint, data: item.payload });
    } catch {
      if (item.retries < MAX_RETRIES) {
        remaining.push({ ...item, retries: item.retries + 1 });
      }
      // Drop after MAX_RETRIES
    }
  }

  setJSON(QUEUE_KEY, remaining);
}

// Listen for connectivity changes
export function startSyncListener(): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      flushQueue();
    }
  });
}
```

**Step 5: Commit**

```bash
git add mobile/src/lib/
git commit -m "feat(mobile): add API client, MMKV storage, WebSocket, sync queue"
```

---

## Task 7: Auth Store & Root Layout

**Files:**
- Create: `mobile/src/stores/auth.ts`
- Create: `mobile/app/_layout.tsx`
- Create: `mobile/app/(auth)/_layout.tsx`
- Create: `mobile/app/(auth)/login.tsx`

**Step 1: Create auth store**

Port from `frontend/src/stores/auth.ts`, use MMKV instead of localStorage:

```typescript
import { create } from 'zustand';
import { api, unwrap } from '@/lib/api';
import { storage } from '@/lib/storage';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  permissions: string[];
  orgId: string;
  orgName: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, tokens } = unwrap<{
      user: AuthUser;
      tokens: { accessToken: string; refreshToken: string };
    }>(res);

    storage.set('accessToken', tokens.accessToken);
    storage.set('refreshToken', tokens.refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    const refreshToken = storage.getString('refreshToken');
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    storage.delete('accessToken');
    storage.delete('refreshToken');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    const token = storage.getString('accessToken');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const res = await api.get('/auth/me');
      const { user } = unwrap<{ user: AuthUser }>(res);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasRole: (...roles) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },
}));
```

**Step 2: Create root layout**

```tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '@/stores/auth';
import { connectWs, disconnectWs } from '@/lib/ws';
import { startSyncListener } from '@/lib/sync-queue';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      // Route by role
      const role = user?.role;
      if (role === 'driver') {
        router.replace('/(driver)/today');
      } else if (role === 'passenger') {
        router.replace('/(passenger)/home');
      } else {
        // Default for other roles (journey_manager, admin, etc.) — driver view
        router.replace('/(driver)/today');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const loadUser = useAuth((s) => s.loadUser);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  const [fontsLoaded] = useFonts({
    'IBMPlexSans-Regular': require('../assets/fonts/IBMPlexSans-Regular.ttf'),
    'IBMPlexSans-Medium': require('../assets/fonts/IBMPlexSans-Medium.ttf'),
    'IBMPlexSans-SemiBold': require('../assets/fonts/IBMPlexSans-SemiBold.ttf'),
    'IBMPlexMono-Regular': require('../assets/fonts/IBMPlexMono-Regular.ttf'),
    'IBMPlexMono-Medium': require('../assets/fonts/IBMPlexMono-Medium.ttf'),
  });

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connectWs();
      const unsub = startSyncListener();
      return () => { disconnectWs(); unsub(); };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AuthGuard>
          <Slot />
        </AuthGuard>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

**Step 3: Create auth layout + login screen**

Auth layout (`app/(auth)/_layout.tsx`):
```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Login screen (`app/(auth)/login.tsx`):
```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { colors } from '@/theme/colors';
import { type as typ, fonts } from '@/theme/typography';
import { spacing, radii } from '@/theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Fleetops</Text>
        <Text style={styles.subtitle}>AR Technology — Fleet Management</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.ink4}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.ink4}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} disabled={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0, justifyContent: 'center' },
  inner: { paddingHorizontal: spacing.screenH + 12, gap: 12 },
  title: { ...typ.display, color: colors.ink0, textAlign: 'center', marginBottom: 4 },
  subtitle: { ...typ.body, color: colors.ink3, textAlign: 'center', marginBottom: 24 },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    fontFamily: fonts.sans400,
    fontSize: 14,
    color: colors.ink0,
  },
  error: { color: colors.nogo, fontSize: 13, fontFamily: fonts.sans400 },
});
```

**Step 4: Commit**

```bash
git add mobile/src/stores/ mobile/app/
git commit -m "feat(mobile): add auth store, root layout with auth guard, login screen"
```

---

## Task 8: Tab Layouts (Driver & Passenger)

**Files:**
- Create: `mobile/app/(driver)/_layout.tsx`
- Create: `mobile/app/(passenger)/_layout.tsx`

**Step 1: Create driver tab layout**

5-tab bar: Today / Trips / Checks / Defects / Me. Icons from IK: flag, route, shieldChk, alert, user.

```tsx
import { Tabs } from 'expo-router';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink0,
        tabBarInactiveTintColor: colors.ink4,
        tabBarStyle: {
          backgroundColor: colors.bg0,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          paddingBottom: 28,
          height: 80,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono500,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="today" options={{
        title: 'Today',
        tabBarIcon: ({ color }) => <Glyph k="flag" size={22} color={color} />,
      }} />
      <Tabs.Screen name="trips" options={{
        title: 'Trips',
        tabBarIcon: ({ color }) => <Glyph k="route" size={22} color={color} />,
      }} />
      <Tabs.Screen name="checklist" options={{
        title: 'Checks',
        tabBarIcon: ({ color }) => <Glyph k="shieldChk" size={22} color={color} />,
        href: null, // not a direct tab — navigated to from Today
      }} />
      <Tabs.Screen name="qr-auth" options={{ href: null }} />
      <Tabs.Screen name="in-trip" options={{ href: null }} />
      <Tabs.Screen name="defects" options={{
        title: 'Defects',
        tabBarIcon: ({ color }) => <Glyph k="alert" size={22} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Me',
        tabBarIcon: ({ color }) => <Glyph k="user" size={22} color={color} />,
      }} />
    </Tabs>
  );
}
```

**Step 2: Create passenger tab layout**

4-tab bar: Home / My Trips / Inbox / Me. Icons: pin, route, inbox, user.

```tsx
import { Tabs } from 'expo-router';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

export default function PassengerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink0,
        tabBarInactiveTintColor: colors.ink4,
        tabBarStyle: {
          backgroundColor: colors.bg0,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          paddingBottom: 28,
          height: 80,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono500,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="home" options={{
        title: 'Home',
        tabBarIcon: ({ color }) => <Glyph k="pin" size={22} color={color} />,
      }} />
      <Tabs.Screen name="trips" options={{
        title: 'My Trips',
        tabBarIcon: ({ color }) => <Glyph k="route" size={22} color={color} />,
      }} />
      <Tabs.Screen name="my-trip" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{
        title: 'Inbox',
        tabBarIcon: ({ color }) => <Glyph k="inbox" size={22} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Me',
        tabBarIcon: ({ color }) => <Glyph k="user" size={22} color={color} />,
      }} />
    </Tabs>
  );
}
```

**Step 3: Create placeholder screens**

For each tab screen that isn't a design handoff screen (trips, defects, profile, inbox), create a minimal placeholder:

```tsx
// Example: mobile/app/(driver)/trips.tsx
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { type as typ } from '@/theme/typography';

export default function TripsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip History</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0, justifyContent: 'center', alignItems: 'center' },
  title: { ...typ.title, color: colors.ink0 },
});
```

Create these files: `(driver)/trips.tsx`, `(driver)/defects.tsx`, `(driver)/profile.tsx`, `(passenger)/trips.tsx`, `(passenger)/inbox.tsx`, `(passenger)/profile.tsx`.

**Step 4: Commit**

```bash
git add mobile/app/
git commit -m "feat(mobile): add driver 5-tab + passenger 4-tab layouts with placeholders"
```

---

## Task 9: Screen 04 — Today (Driver Daily Briefing)

**Files:**
- Create: `mobile/app/(driver)/today.tsx`
- Create: `mobile/src/components/driver/trip-callout.tsx`
- Create: `mobile/src/components/driver/vehicle-card.tsx`
- Create: `mobile/src/components/driver/depart-checklist.tsx`

**Step 1: Build TripCallout component**

Dark callout card showing next trip: origin → destination, journey ID, depart/ETA/risk, GO status pill.

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pill } from '@/components/ui/pill';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';

interface TripCalloutProps {
  origin: string;
  destination: string;
  journeyNo: string;
  passengerCount: number;
  distanceKm: number;
  departTime: string;
  eta: string;
  riskLevel: string;
  status: string;
}

export function TripCallout(props: TripCalloutProps) {
  const riskColor = props.riskLevel === 'H' ? colors.nogo : props.riskLevel === 'M' ? colors.cond : colors.go;
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>NEXT TRIP · {props.status.toUpperCase()}</Text>
        <Pill status={props.status} />
      </View>
      <Text style={styles.route}>{props.origin} → {props.destination}</Text>
      <Text style={styles.meta}>{props.journeyNo} · {props.passengerCount} pax · {props.distanceKm} km</Text>
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripLabel}>DEPART</Text>
          <Text style={styles.stripValue}>{props.departTime}</Text>
        </View>
        <View style={styles.stripItem}>
          <Text style={styles.stripLabel}>ETA</Text>
          <Text style={styles.stripValue}>{props.eta}</Text>
        </View>
        <View style={styles.stripItem}>
          <Text style={styles.stripLabel}>RISK</Text>
          <Text style={[styles.stripValue, { color: riskColor }]}>{props.riskLevel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0f141b', borderRadius: 14, padding: 14, gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: fonts.mono500, fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, textTransform: 'uppercase' },
  route: { fontFamily: fonts.sans600, fontSize: 18, color: '#fff' },
  meta: { fontFamily: fonts.mono400, fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  strip: { flexDirection: 'row', marginTop: 8, gap: 0 },
  stripItem: { flex: 1, alignItems: 'center' },
  stripLabel: { fontFamily: fonts.mono500, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' },
  stripValue: { fontFamily: fonts.sans600, fontSize: 16, color: '#fff', marginTop: 2 },
});
```

**Step 2: Build VehicleCard component**

White card with icon, plate, model, 4 status pills (MAINT, DOCS, IVMS, RAS).

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';

interface VehicleCardProps {
  plate: string;
  model: string;
  year: number;
  odometer: number;
  location: string;
  maintStatus: string;
  docsStatus: string;
  ivmsStatus: string;
  rasExpiry: string;
}

export function VehicleCard(props: VehicleCardProps) {
  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.iconBox}>
          <Glyph k="truck" size={24} color={colors.ink2} />
        </View>
        <View style={styles.info}>
          <Text style={styles.plate}>{props.plate}</Text>
          <Text style={styles.location}>{props.location}</Text>
          <Text style={styles.model}>{props.model} · {props.year} · {(props.odometer / 1000).toFixed(0)}k km</Text>
        </View>
      </View>
      <View style={styles.pills}>
        <Pill status={props.maintStatus} label={`MAINT ${props.maintStatus.toUpperCase()}`} />
        <Pill status={props.docsStatus} label="DOCS" />
        <Pill status={props.ivmsStatus} label="IVMS" />
        <Pill status="cond" label={`RAS ${props.rasExpiry}`} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconBox: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  plate: { fontFamily: fonts.mono500, fontSize: 15, color: colors.ink0 },
  location: { fontFamily: fonts.sans400, fontSize: 12, color: colors.ink3 },
  model: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
```

**Step 3: Build DepartChecklist component**

4 items with checkbox states (done/pending/locked). Chevron for pending items.

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Glyph } from '@/components/ui/glyph';
import { Card } from '@/components/ui/card';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

interface CheckItem {
  id: string;
  label: string;
  description: string;
  status: 'done' | 'pending' | 'locked';
}

interface DepartChecklistProps {
  items: CheckItem[];
  onPress: (id: string) => void;
}

export function DepartChecklist({ items, onPress }: DepartChecklistProps) {
  return (
    <Card noPadding>
      <Text style={styles.header}>BEFORE YOU DEPART</Text>
      {items.map((item, i) => (
        <Pressable
          key={item.id}
          style={[styles.row, i < items.length - 1 && styles.rowBorder]}
          onPress={() => onPress(item.id)}
          disabled={item.status === 'locked'}
        >
          <View style={[styles.checkbox, item.status === 'done' && styles.checkboxDone]}>
            {item.status === 'done' && <Glyph k="check" size={12} color={colors.white} />}
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.label, item.status === 'done' && styles.labelDone]}>{item.label}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
          {item.status === 'pending' && <Glyph k="chevR" size={16} color={colors.ink4} />}
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { fontFamily: fonts.mono500, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink3, padding: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.go, borderColor: colors.go },
  textCol: { flex: 1, gap: 1 },
  label: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  labelDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  desc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4 },
});
```

**Step 4: Compose Today screen**

```tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { TripCallout } from '@/components/driver/trip-callout';
import { VehicleCard } from '@/components/driver/vehicle-card';
import { DepartChecklist } from '@/components/driver/depart-checklist';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';
import { spacing } from '@/theme/tokens';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const { data: journey } = useQuery({
    queryKey: ['my-journey'],
    queryFn: async () => {
      const res = await api.get('/journeys', { params: { driverId: user?.id, status: 'approved', limit: 1 } });
      const list = unwrap<any[]>(res);
      return list[0] ?? null;
    },
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', journey?.vehicleId],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${journey.vehicleId}`);
      return unwrap<any>(res);
    },
    enabled: !!journey?.vehicleId,
  });

  const firstName = user?.name?.split(' ')[0] ?? 'Driver';
  const today = new Date();
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const checkItems = [
    { id: 'checklist', label: 'Complete pre-trip checklist', description: '18 items', status: 'pending' as const },
    { id: 'qr', label: 'Scan QR code at vehicle', description: 'Driver authentication', status: 'locked' as const },
    { id: 'passengers', label: 'Confirm passenger boarding', description: `${journey?.passengerCount ?? 0} manifested`, status: 'locked' as const },
    { id: 'ack', label: 'Acknowledge journey plan', description: 'Route & risk review', status: 'locked' as const },
  ];

  const handleCheckPress = (id: string) => {
    if (id === 'checklist') router.push('/(driver)/checklist');
    if (id === 'qr') router.push('/(driver)/qr-auth');
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Salaam, {firstName}</Text>
          <Text style={styles.date}>{dayStr} · {dateStr}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName[0]}</Text>
        </View>
      </View>

      {journey ? (
        <TripCallout
          origin={journey.origin ?? 'TBD'}
          destination={journey.destination ?? 'TBD'}
          journeyNo={journey.journeyNo}
          passengerCount={journey.passengerCount ?? 0}
          distanceKm={journey.distanceKm ?? 0}
          departTime={new Date(journey.plannedDeparture).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          eta={new Date(journey.plannedArrival).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          riskLevel={journey.riskLevel ?? 'L'}
          status={journey.status}
        />
      ) : (
        <View style={styles.noTrip}>
          <Text style={styles.noTripText}>No trips assigned today</Text>
        </View>
      )}

      {vehicle && (
        <VehicleCard
          plate={vehicle.plateNumber}
          model={vehicle.model}
          year={vehicle.year}
          odometer={vehicle.odometer}
          location={vehicle.lastKnownLocation ?? 'Unknown'}
          maintStatus={vehicle.status === 'available' ? 'go' : vehicle.status}
          docsStatus="go"
          ivmsStatus="go"
          rasExpiry="18d"
        />
      )}

      <DepartChecklist items={checkItems} onPress={handleCheckPress} />

      {journey && (
        <Button
          title="Start pre-trip"
          onPress={() => router.push('/(driver)/checklist')}
          icon={<Glyph k="chevR" size={16} color={colors.white} />}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  content: { padding: spacing.screenH, gap: spacing.sectionGap },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { ...typ.title, color: colors.ink0 },
  date: { fontFamily: fonts.mono400, fontSize: 12, color: colors.ink3, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.mono500, fontSize: 16, color: colors.white },
  noTrip: { padding: 32, alignItems: 'center' },
  noTripText: { ...typ.body, color: colors.ink3 },
});
```

**Step 5: Commit**

```bash
git add mobile/src/components/driver/ mobile/app/(driver)/today.tsx
git commit -m "feat(mobile): Screen 04 — Today (driver daily briefing)"
```

---

## Task 10: Screen 05 — Pre-trip Checklist

**Files:**
- Create: `mobile/app/(driver)/checklist.tsx`
- Create: `mobile/src/components/checklist/photo-grid.tsx`
- Create: `mobile/src/components/checklist/checklist-item.tsx`
- Create: `mobile/src/components/checklist/defect-card.tsx`
- Create: `mobile/src/stores/checklist.ts`

**Step 1: Create checklist store (MMKV-backed)**

```typescript
import { create } from 'zustand';
import { getJSON, setJSON } from '@/lib/storage';

interface ChecklistItemState {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'pending';
  note?: string;
  photoUris?: string[];
}

interface ChecklistStore {
  journeyId: string | null;
  step: number;
  items: ChecklistItemState[];
  photos: { front?: string; left?: string; right?: string; rear?: string };
  init: (journeyId: string, items: ChecklistItemState[]) => void;
  setItemStatus: (id: string, status: 'pass' | 'fail', note?: string) => void;
  setPhoto: (position: 'front' | 'left' | 'right' | 'rear', uri: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  persist: () => void;
  restore: (journeyId: string) => boolean;
}

export const useChecklist = create<ChecklistStore>((set, get) => ({
  journeyId: null,
  step: 0,
  items: [],
  photos: {},

  init: (journeyId, items) => {
    set({ journeyId, step: 0, items, photos: {} });
  },

  setItemStatus: (id, status, note) => {
    set((s) => ({
      items: s.items.map((i) => i.id === id ? { ...i, status, note } : i),
    }));
    get().persist();
  },

  setPhoto: (position, uri) => {
    set((s) => ({ photos: { ...s.photos, [position]: uri } }));
    get().persist();
  },

  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 5) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),

  persist: () => {
    const { journeyId, step, items, photos } = get();
    if (journeyId) setJSON(`checklist:${journeyId}`, { step, items, photos });
  },

  restore: (journeyId) => {
    const saved = getJSON<{ step: number; items: ChecklistItemState[]; photos: Record<string, string> }>(`checklist:${journeyId}`);
    if (saved) {
      set({ journeyId, ...saved });
      return true;
    }
    return false;
  },
}));
```

**Step 2: Create PhotoGrid component**

4-up camera capture grid (Front, L side, R side, Rear):

```tsx
import React from 'react';
import { View, Pressable, Image, Text, StyleSheet } from 'react-native';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

const POSITIONS = ['front', 'left', 'right', 'rear'] as const;
const LABELS = { front: 'Front', left: 'L side', right: 'R side', rear: 'Rear' };

interface PhotoGridProps {
  photos: Record<string, string | undefined>;
  onCapture: (position: string) => void;
}

export function PhotoGrid({ photos, onCapture }: PhotoGridProps) {
  return (
    <View style={styles.grid}>
      {POSITIONS.map((pos) => (
        <Pressable key={pos} style={styles.cell} onPress={() => onCapture(pos)}>
          {photos[pos] ? (
            <Image source={{ uri: photos[pos] }} style={styles.image} />
          ) : (
            <View style={styles.empty}>
              <Glyph k="camera" size={20} color={colors.ink4} />
            </View>
          )}
          <Text style={styles.label}>{LABELS[pos]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  empty: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.5, textTransform: 'uppercase' },
});
```

**Step 3: Create ChecklistItem component**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

interface ChecklistItemProps {
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'pending';
  onPass: () => void;
  onFail: () => void;
}

export function ChecklistItem({ label, description, status, onPass, onFail }: ChecklistItemProps) {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.checkbox,
          status === 'pass' && styles.pass,
          status === 'fail' && styles.fail,
        ]}
        onPress={status === 'pass' ? onFail : onPass}
      >
        {status === 'pass' && <Glyph k="check" size={12} color={colors.white} />}
        {status === 'fail' && <Glyph k="x" size={12} color={colors.white} />}
      </Pressable>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
      {status === 'pending' && <Glyph k="chevR" size={14} color={colors.ink4} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  pass: { backgroundColor: colors.go, borderColor: colors.go },
  fail: { backgroundColor: colors.nogo, borderColor: colors.nogo },
  textCol: { flex: 1, gap: 1 },
  label: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  desc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4 },
});
```

**Step 4: Create DefectCard component**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

interface DefectCardProps {
  itemLabel: string;
  description: string;
}

export function DefectCard({ itemLabel, description }: DefectCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Glyph k="alert" size={16} color={colors.nogo} />
        <Text style={styles.title}>Defect logged · {itemLabel}</Text>
      </View>
      <Text style={styles.desc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.nogoSoft, borderRadius: 10, padding: 12, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.sans600, fontSize: 12, color: colors.nogo },
  desc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink2 },
});
```

**Step 5: Compose Checklist screen**

```tsx
import React, { useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useChecklist } from '@/stores/checklist';
import { PhotoGrid } from '@/components/checklist/photo-grid';
import { ChecklistItem } from '@/components/checklist/checklist-item';
import { DefectCard } from '@/components/checklist/defect-card';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { Card } from '@/components/ui/card';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';
import { spacing } from '@/theme/tokens';
import { enqueue } from '@/lib/sync-queue';

const CHECKLIST_ITEMS = [
  { id: '1', label: 'Tires & visible damage', description: 'Check all 4 tires above min' },
  { id: '2', label: 'Oil & coolant levels', description: 'Visual dipstick check' },
  { id: '3', label: 'Lights & signals', description: 'Headlights, tail, indicators' },
  { id: '4', label: 'Windshield & wipers', description: 'No cracks, wipers functional' },
  { id: '5', label: 'Mirrors', description: 'Both side mirrors + rearview' },
  { id: '6', label: 'Horn', description: 'Functional test' },
  { id: '7', label: 'Fire extinguisher', description: 'Present, pressure in green' },
  { id: '8', label: 'First aid kit', description: 'Sealed, in-date' },
  { id: '9', label: 'Seat belts', description: 'All passenger belts functional' },
  { id: '10', label: 'GPS/IVMS device LED', description: 'Steady green = connected' },
  { id: '11', label: 'Fuel level', description: 'Minimum 50% for trip' },
  { id: '12', label: 'Brakes', description: 'Pedal firm, no pull' },
  { id: '13', label: 'Steering', description: 'No excessive play' },
  { id: '14', label: 'Emergency triangle', description: 'Present & accessible' },
  { id: '15', label: 'Spare tire & jack', description: 'Present & serviceable' },
  { id: '16', label: 'AC system', description: 'Cooling functional (desert ops)' },
  { id: '17', label: 'Water supply', description: 'Min 2L per passenger' },
  { id: '18', label: 'Vehicle documents', description: 'Mulkia, RAS, insurance in vehicle' },
];

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { step, items, photos, init, setItemStatus, setPhoto, nextStep, prevStep } = useChecklist();

  useEffect(() => {
    if (items.length === 0) {
      init('current', CHECKLIST_ITEMS.map((i) => ({ ...i, status: 'pending' as const })));
    }
  }, []);

  const completed = items.filter((i) => i.status !== 'pending').length;
  const defects = items.filter((i) => i.status === 'fail');
  const progress = items.length > 0 ? completed / items.length : 0;

  const handleCapture = async (position: string) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Camera permission required'); return; }
    }
    // In production: open camera modal, capture photo, get URI
    // For now: simulate with placeholder
    setPhoto(position as any, `file://placeholder-${position}.jpg`);
  };

  const handleContinue = () => {
    if (step < 5) {
      nextStep();
    } else {
      // Submit checklist
      defects.forEach((d) => {
        enqueue({ endpoint: '/events', method: 'POST', payload: { eventType: 'defect', description: `${d.label}: ${d.note ?? 'Failed inspection'}`, severity: 'medium' } });
      });
      router.push('/(driver)/qr-auth');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Glyph k="chevL" size={20} color={colors.ink0} />
        </Pressable>
        <Text style={styles.stepLabel}>STEP {step + 1} OF 6</Text>
        <Pressable onPress={() => router.back()}>
          <Glyph k="x" size={20} color={colors.ink0} />
        </Pressable>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressText}>{completed} / {items.length} COMPLETE · {defects.length} DEFECT{defects.length !== 1 ? 'S' : ''}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {step === 0 && <PhotoGrid photos={photos} onCapture={handleCapture} />}

        <Card noPadding>
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              label={item.label}
              description={item.description}
              status={item.status}
              onPass={() => setItemStatus(item.id, 'pass')}
              onFail={() => setItemStatus(item.id, 'fail', 'Failed inspection')}
            />
          ))}
        </Card>

        {defects.map((d) => (
          <DefectCard key={d.id} itemLabel={d.label} description={d.note ?? 'Failed inspection. Photo uploaded. This may trigger Conditional Release.'} />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && <Button title="Back" variant="secondary" onPress={prevStep} />}
        <View style={{ flex: 1 }}>
          <Button title={step < 5 ? 'Continue' : 'Submit checklist'} onPress={handleContinue} />
        </View>
      </View>
    </View>
  );
}

// Need to import Pressable at top
import { Pressable } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screenH, paddingVertical: 12 },
  stepLabel: { fontFamily: fonts.mono500, fontSize: 12, color: colors.ink2, letterSpacing: 0.5, textTransform: 'uppercase' },
  progressSection: { paddingHorizontal: spacing.screenH, gap: 6, marginBottom: 12 },
  progressText: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  progressBar: { height: 4, backgroundColor: colors.bg4, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: colors.go, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.screenH, gap: spacing.sectionGap },
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.screenH, paddingTop: 12, backgroundColor: 'rgba(246,244,238,0.96)', borderTopWidth: 1, borderTopColor: colors.lineSoft },
});
```

Note: The `Pressable` import needs to be at the top with other RN imports. Fix the import line in the actual file.

**Step 6: Commit**

```bash
git add mobile/src/stores/checklist.ts mobile/src/components/checklist/ mobile/app/(driver)/checklist.tsx
git commit -m "feat(mobile): Screen 05 — pre-trip checklist with photo grid, defect logging, MMKV persistence"
```

---

## Task 11: Screen 06 — QR Authentication

**Files:**
- Create: `mobile/app/(driver)/qr-auth.tsx`
- Create: `mobile/src/components/qr/qr-scanner.tsx`

**Step 1: Create QR scanner component**

State machine: scanning → detected → verifying → authenticated/failed.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Glyph } from '@/components/ui/glyph';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type ScanState = 'scanning' | 'detected' | 'verifying' | 'authenticated' | 'failed';

interface QrScannerProps {
  onScan: (data: string) => Promise<boolean>;
  maxAttempts?: number;
  onMaxFailed: () => void;
}

export function QrScanner({ onScan, maxAttempts = 3, onMaxFailed }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('scanning');
  const [attempts, setAttempts] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { requestPermission(); }, []);

  useEffect(() => {
    if (state === 'scanning') {
      Animated.loop(
        Animated.timing(pulseAnim, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true })
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [state]);

  const handleBarcode = async (result: { data: string }) => {
    if (state !== 'scanning') return;
    setState('detected');
    setTimeout(() => setState('verifying'), 500);

    const success = await onScan(result.data);
    if (success) {
      setState('authenticated');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= maxAttempts) {
        setState('failed');
        onMaxFailed();
      } else {
        setState('scanning');
      }
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission required for QR scan</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {state === 'scanning' && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcode}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Viewfinder frame */}
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Status */}
        <View style={styles.statusPill}>
          {state === 'scanning' && (
            <>
              <Animated.View style={[styles.blinkDot, { opacity: pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] }) }]} />
              <Text style={styles.statusText}>SCANNING{attempts > 0 ? ` · ${attempts} of ${maxAttempts}` : ''}</Text>
            </>
          )}
          {state === 'detected' && <Text style={styles.statusText}>QR DETECTED</Text>}
          {state === 'verifying' && <Text style={styles.statusText}>VERIFYING...</Text>}
          {state === 'authenticated' && (
            <>
              <Glyph k="check" size={14} color={colors.go} />
              <Text style={[styles.statusText, { color: colors.go }]}>AUTHENTICATED</Text>
            </>
          )}
          {state === 'failed' && (
            <>
              <Glyph k="x" size={14} color={colors.nogo} />
              <Text style={[styles.statusText, { color: colors.nogo }]}>FAILED — MAX ATTEMPTS</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.darkBg },
  permText: { color: colors.darkInk, fontFamily: fonts.sans400, fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: 220, height: 220, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.darkInk },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(74,144,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74,144,255,0.3)',
  },
  blinkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.info },
  statusText: { fontFamily: fonts.mono500, fontSize: 11, color: colors.darkInk, letterSpacing: 0.5 },
});
```

**Step 2: Compose QR Auth screen**

```tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QrScanner } from '@/components/qr/qr-scanner';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';
import { spacing } from '@/theme/tokens';

export default function QrAuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const handleScan = async (data: string): Promise<boolean> => {
    try {
      // QR contains vehicle ID or auth challenge
      await api.post('/auth/verify-qr', { qrData: data, driverId: user?.id });
      // Wait a moment to show success state, then navigate
      setTimeout(() => router.push('/(driver)/in-trip'), 1500);
      return true;
    } catch {
      return false;
    }
  };

  const handleMaxFailed = () => {
    // Show manual override option
  };

  const handleOverride = async () => {
    // Request manual override — audit-logged
    try {
      await api.post('/journeys/override', { driverId: user?.id, reason: 'QR scan failed — manual override requested' });
      router.push('/(driver)/in-trip');
    } catch {
      // Handle error
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Glyph k="chevL" size={20} color={colors.darkInk} />
        </Pressable>
        <Text style={styles.stepLabel}>STEP 5 OF 6</Text>
        <Pressable onPress={() => router.back()}>
          <Glyph k="x" size={20} color={colors.darkInk} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.sublabel}>DRIVER AUTHENTICATION</Text>
        <Text style={styles.title}>Scan your QR code</Text>
        <Text style={styles.instruction}>
          Hold your driver card QR code in front of the camera until you see the confirmation.
        </Text>
      </View>

      <View style={styles.scannerArea}>
        <QrScanner onScan={handleScan} onMaxFailed={handleMaxFailed} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.alertCard}>
          <Glyph k="alert" size={16} color={colors.cond} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>QR unreadable?</Text>
            <Text style={styles.alertDesc}>You can request manual override from your Journey Manager. All overrides are logged.</Text>
          </View>
        </View>
        <Button title="Request manual override" variant="ghost" onPress={handleOverride} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screenH, paddingVertical: 12 },
  stepLabel: { fontFamily: fonts.mono500, fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 },
  titleSection: { paddingHorizontal: spacing.screenH, gap: 6, marginBottom: 24 },
  sublabel: { fontFamily: fonts.mono500, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8 },
  title: { fontFamily: fonts.sans600, fontSize: 22, color: colors.darkInk },
  instruction: { fontFamily: fonts.sans400, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19 },
  scannerArea: { flex: 1 },
  footer: { paddingHorizontal: spacing.screenH, gap: 12 },
  alertCard: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  alertTitle: { fontFamily: fonts.sans600, fontSize: 12, color: colors.darkInk },
  alertDesc: { fontFamily: fonts.sans400, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});
```

**Step 3: Commit**

```bash
git add mobile/src/components/qr/ mobile/app/(driver)/qr-auth.tsx
git commit -m "feat(mobile): Screen 06 — QR authentication with camera scanner, state machine, manual override"
```

---

## Task 12: Screen 07 — In-trip Live

**Files:**
- Create: `mobile/app/(driver)/in-trip.tsx`
- Create: `mobile/src/components/map/mapbox-view.tsx`
- Create: `mobile/src/components/ui/bottom-sheet-wrapper.tsx`

**Step 1: Create Mapbox wrapper**

```tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

interface MapboxViewProps {
  center?: [number, number];
  zoom?: number;
  routeCompleted?: [number, number][];
  routeRemaining?: [number, number][];
  vehiclePosition?: { lat: number; lon: number; heading: number };
  children?: React.ReactNode;
}

export function MapboxView({ center = [55.78, 18.85], zoom = 11, routeCompleted, routeRemaining, vehiclePosition, children }: MapboxViewProps) {
  return (
    <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Light} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
      <MapboxGL.Camera centerCoordinate={center} zoomLevel={zoom} />

      {routeCompleted && routeCompleted.length > 1 && (
        <MapboxGL.ShapeSource id="routeCompleted" shape={{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeCompleted },
          properties: {},
        }}>
          <MapboxGL.LineLayer id="routeCompletedLine" style={{ lineColor: '#1ec991', lineWidth: 4, lineCap: 'round' }} />
        </MapboxGL.ShapeSource>
      )}

      {routeRemaining && routeRemaining.length > 1 && (
        <MapboxGL.ShapeSource id="routeRemaining" shape={{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: routeRemaining },
          properties: {},
        }}>
          <MapboxGL.LineLayer id="routeRemainingLine" style={{ lineColor: '#15181d', lineWidth: 3, lineOpacity: 0.55, lineDasharray: [4, 3] }} />
        </MapboxGL.ShapeSource>
      )}

      {vehiclePosition && (
        <MapboxGL.PointAnnotation id="vehicle" coordinate={[vehiclePosition.lon, vehiclePosition.lat]}>
          <MapboxGL.Callout title="" />
        </MapboxGL.PointAnnotation>
      )}

      {children}
    </MapboxGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
```

**Step 2: Create bottom sheet wrapper**

```tsx
import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import GorhomBottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { colors } from '@/theme/colors';

interface BottomSheetWrapperProps {
  snapPoints: (string | number)[];
  children: React.ReactNode;
}

export const BottomSheetWrapper = forwardRef<GorhomBottomSheet, BottomSheetWrapperProps>(
  ({ snapPoints, children }, ref) => {
    return (
      <GorhomBottomSheet
        ref={ref}
        snapPoints={snapPoints}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.bg}
      >
        <BottomSheetView style={styles.content}>
          {children}
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  handle: { width: 36, height: 4, backgroundColor: colors.lineStrong, borderRadius: 2 },
  bg: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  content: { padding: 14 },
});
```

**Step 3: Compose In-trip screen**

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { MapboxView } from '@/components/map/mapbox-view';
import { BottomSheetWrapper } from '@/components/ui/bottom-sheet-wrapper';
import { Pill } from '@/components/ui/pill';
import { Glyph } from '@/components/ui/glyph';
import { Button } from '@/components/ui/button';
import { subscribe } from '@/lib/ws';
import { api, unwrap } from '@/lib/api';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';
import { spacing } from '@/theme/tokens';

export default function InTripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [vehicle, setVehicle] = useState({ lat: 18.85, lon: 55.78, speed: 0, heading: 0, fuel: 0 });
  const [journey, setJourney] = useState<any>(null);

  useEffect(() => {
    // Load journey data
    // Subscribe to live updates
    const unsub = subscribe('journey:current:live', (data: any) => {
      if (data.lat) setVehicle(data);
    });
    return unsub;
  }, []);

  const handleSOS = () => {
    // Hold-to-activate would use LongPressGestureHandler in production
    api.post('/events', {
      eventType: 'panic',
      severity: 'critical',
      lat: vehicle.lat,
      lon: vehicle.lon,
      description: 'SOS activated by driver',
    });
  };

  return (
    <View style={styles.container}>
      <MapboxView
        center={[vehicle.lon, vehicle.lat]}
        zoom={11}
        vehiclePosition={vehicle}
      />

      {/* Top floating card — next waypoint */}
      <View style={[styles.waypointCard, { top: insets.top + 16 }]}>
        <Text style={styles.waypointLabel}>NEXT WAYPOINT</Text>
        <Text style={styles.waypointName}>{journey?.destination ?? 'Nimr-2 main camp'}</Text>
        <View style={styles.waypointMeta}>
          <Text style={styles.waypointDist}>40 km</Text>
          <Text style={styles.waypointEta}>ETA 16:50</Text>
        </View>
      </View>

      {/* Speed badge */}
      <View style={[styles.speedBadge, { bottom: 300 }]}>
        <Text style={styles.speedValue}>{vehicle.speed}</Text>
        <Text style={styles.speedUnit}>KM/H</Text>
      </View>

      {/* Status stack — right side */}
      <View style={[styles.statusStack, { bottom: 310 }]}>
        <View style={[styles.statusDot, { borderColor: colors.go }]}>
          <Glyph k="qr" size={14} color={colors.go} />
        </View>
        <View style={[styles.statusDot, { borderColor: colors.go }]}>
          <Glyph k="signal" size={14} color={colors.go} />
        </View>
        <View style={[styles.statusDot, { borderColor: colors.go }]}>
          <Glyph k="shield" size={14} color={colors.go} />
        </View>
      </View>

      {/* Bottom sheet */}
      <BottomSheetWrapper ref={sheetRef} snapPoints={['35%', '65%']}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.journeyId}>{journey?.journeyNo ?? 'JM-25-04018'} · ACTIVE</Text>
            <Text style={styles.routeTitle}>{journey?.origin ?? 'Marmul'} → {journey?.destination ?? 'Nimr-2'}</Text>
          </View>
          <Pill status="active" label="ON ROUTE" />
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PASSENGERS</Text>
            <Text style={[styles.statValue, { color: colors.go }]}>4 / 4</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>FUEL</Text>
            <Text style={styles.statValue}>{vehicle.fuel || 64}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TIME LEFT</Text>
            <Text style={styles.statValue}>0:28</Text>
          </View>
        </View>

        <View style={styles.sheetActions}>
          <Button title="Report defect" variant="secondary" onPress={() => {}} icon={<Glyph k="alert" size={16} color={colors.ink0} />} />
          <Pressable style={styles.sosButton} onLongPress={handleSOS} delayLongPress={3000}>
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
        </View>
      </BottomSheetWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  waypointCard: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  waypointLabel: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.5 },
  waypointName: { fontFamily: fonts.sans600, fontSize: 14, color: colors.ink0, marginTop: 2 },
  waypointMeta: { alignItems: 'flex-end' },
  waypointDist: { fontFamily: fonts.sans600, fontSize: 18, color: colors.ink0 },
  waypointEta: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  speedBadge: {
    position: 'absolute', left: 16,
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink0,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  speedValue: { fontFamily: fonts.mono500, fontSize: 22, color: colors.ink0 },
  speedUnit: { fontFamily: fonts.mono500, fontSize: 9, color: colors.ink3, letterSpacing: 0.5 },
  statusStack: { position: 'absolute', right: 16, gap: 8 },
  statusDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  journeyId: { fontFamily: fonts.mono400, fontSize: 10, color: colors.ink3, letterSpacing: 0.5 },
  routeTitle: { fontFamily: fonts.sans600, fontSize: 16, color: colors.ink0, marginTop: 2 },
  statGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: colors.bg3, borderRadius: 10, padding: 10, alignItems: 'center' },
  statLabel: { fontFamily: fonts.mono500, fontSize: 9, color: colors.ink3, letterSpacing: 0.5 },
  statValue: { fontFamily: fonts.sans600, fontSize: 18, color: colors.ink0, marginTop: 4 },
  sheetActions: { flexDirection: 'row', gap: 8 },
  sosButton: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: colors.sos, alignItems: 'center', justifyContent: 'center',
  },
  sosText: { fontFamily: fonts.sans600, fontSize: 14, color: colors.white },
});
```

**Step 4: Commit**

```bash
git add mobile/src/components/map/ mobile/src/components/ui/bottom-sheet-wrapper.tsx mobile/app/(driver)/in-trip.tsx
git commit -m "feat(mobile): Screen 07 — in-trip live with Mapbox, speed badge, bottom sheet, SOS"
```

---

## Task 13: Screen 08 — Request Pickup (Passenger)

**Files:**
- Create: `mobile/app/(passenger)/home.tsx`
- Create: `mobile/src/components/passenger/trip-form.tsx`
- Create: `mobile/src/components/passenger/poolable-card.tsx`

**Step 1: Create trip request form component**

From/To card, segmented trip type, time window picker, eligibility banner, poolable suggestions, notes.

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { Pill } from '@/components/ui/pill';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';
import { spacing, radii } from '@/theme/tokens';

const TRIP_TYPES = ['One-way', 'Round trip', 'Recurring'] as const;
const TIME_SLOTS = ['05:30', '06:00', '06:30', '07:00'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [tripType, setTripType] = useState(0);
  const [selectedTime, setSelectedTime] = useState(1); // 06:00
  const [pickup, setPickup] = useState({ name: 'Muscat HQ · Building 4 lobby', sub: 'Al Khuwair · Way 4302' });
  const [dropoff, setDropoff] = useState({ name: 'Marmul Camp · Block C', sub: 'PDO Block 6 · approved sites' });
  const [notes, setNotes] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/passenger/requests', {
        pickupName: pickup.name,
        dropName: dropoff.name,
        requestedTime: new Date().toISOString(),
        tripType: ['one_way', 'round_trip', 'recurring'][tripType],
        notes,
      });
      return unwrap(res);
    },
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{dateStr.toUpperCase()} · {TIME_SLOTS[selectedTime]} LATER</Text>
          <Text style={styles.title}>Request a trip</Text>
        </View>
        <View style={styles.avatar}>
          <Glyph k="user" size={18} color={colors.white} />
        </View>
      </View>

      {/* Trip type segmented */}
      <View style={styles.segmented}>
        {TRIP_TYPES.map((t, i) => (
          <Pressable key={t} style={[styles.segBtn, i === tripType && styles.segBtnActive]} onPress={() => setTripType(i)}>
            <Text style={[styles.segText, i === tripType && styles.segTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {/* From/To card */}
      <Card noPadding>
        <View style={styles.locRow}>
          <View style={[styles.dot, { backgroundColor: colors.go }]} />
          <View style={styles.locText}>
            <Text style={styles.locLabel}>PICKUP</Text>
            <Text style={styles.locName}>{pickup.name}</Text>
            <Text style={styles.locSub}>{pickup.sub}</Text>
          </View>
        </View>
        <View style={styles.locDivider} />
        <View style={styles.locRow}>
          <View style={styles.dashLine}>
            <View style={styles.dashDot} />
            <View style={styles.dashDot} />
            <View style={styles.dashDot} />
          </View>
          <View style={styles.locText}>
            <Text style={styles.locLabel}>DROP-OFF</Text>
            <Text style={styles.locName}>{dropoff.name}</Text>
            <Text style={styles.locSub}>{dropoff.sub}</Text>
          </View>
        </View>
        <View style={styles.routeInfo}>
          <Glyph k="route" size={14} color={colors.ink3} />
          <Text style={styles.routeText}>712 km · ~8h · pooled shuttle eligible</Text>
          <Glyph k="chevR" size={14} color={colors.ink4} />
        </View>
      </Card>

      {/* When card */}
      <Card>
        <View style={styles.whenHeader}>
          <Text style={styles.locLabel}>WHEN</Text>
          <Pill status="cond" label="SHIFT WINDOW" />
        </View>
        <Text style={styles.whenDate}>{dateStr} · {TIME_SLOTS[selectedTime]}</Text>
        <Text style={styles.whenHelper}>Within day-shift pickup window (05:30–07:00)</Text>
        <View style={styles.timeSlots}>
          {TIME_SLOTS.map((t, i) => (
            <Pressable key={t} style={[styles.timeBtn, i === selectedTime && styles.timeBtnActive]} onPress={() => setSelectedTime(i)}>
              <Text style={[styles.timeText, i === selectedTime && styles.timeTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Eligibility banner */}
      <View style={styles.eligBanner}>
        <Glyph k="check" size={16} color="#056b48" />
        <View style={{ flex: 1 }}>
          <Text style={styles.eligTitle}>You're eligible for this route</Text>
          <Text style={styles.eligSub}>PDO clearance valid · roster active · day-shift OK</Text>
        </View>
      </View>

      {/* Poolable card */}
      <Card>
        <View style={styles.poolHeader}>
          <View>
            <Text style={styles.locLabel}>POOLABLE WITH</Text>
            <Text style={styles.poolSub}>3 nearby requests · same shift</Text>
          </View>
          <Pill status="active" label="SAVE 18 min" />
        </View>
        {['H. Al-Lawati · 06:00 · Marmul Block C', 'S. Al-Harthy · 06:00 · Marmul Block A', 'K. Al-Busaidi · 06:30 · Nimr Gate'].map((p, i) => (
          <View key={i} style={[styles.poolRow, i < 2 && styles.poolRowBorder]}>
            <View style={styles.poolAvatar} />
            <Text style={styles.poolName}>{p}</Text>
          </View>
        ))}
      </Card>

      {/* Notes */}
      <Card>
        <Text style={styles.locLabel}>NOTES TO PLANNER · OPTIONAL</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="e.g. luggage, equipment, mobility needs..."
          placeholderTextColor={colors.ink4}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </Card>

      {/* Submit */}
      <Button
        title={submitMutation.isPending ? 'Submitting...' : 'Submit request'}
        onPress={() => submitMutation.mutate()}
        disabled={submitMutation.isPending}
        icon={<Glyph k="chevR" size={16} color={colors.white} />}
      />
      <Text style={styles.slaText}>GOES TO MUSCAT LOGISTICS PLANNER · SLA 30 min</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  content: { padding: spacing.screenH, gap: spacing.sectionGap, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.5 },
  title: { ...typ.title, color: colors.ink0 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', gap: 6 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.sm, backgroundColor: colors.bg3, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.ink0 },
  segText: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink2 },
  segTextActive: { color: colors.white },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  locDivider: { height: 1, backgroundColor: colors.lineSoft, marginHorizontal: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, borderWidth: 2, borderColor: colors.white },
  dashLine: { alignItems: 'center', gap: 3, marginTop: 6 },
  dashDot: { width: 2, height: 3, backgroundColor: colors.ink4 },
  locText: { flex: 1, gap: 2 },
  locLabel: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase' },
  locName: { fontFamily: fonts.sans500, fontSize: 14, color: colors.ink0 },
  locSub: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4 },
  routeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: colors.bg3, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  routeText: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink2, flex: 1 },
  whenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  whenDate: { fontFamily: fonts.mono500, fontSize: 18, color: colors.ink0 },
  whenHelper: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4, marginTop: 2 },
  timeSlots: { flexDirection: 'row', gap: 6, marginTop: 12 },
  timeBtn: { flex: 1, paddingVertical: 8, borderRadius: radii.sm, backgroundColor: colors.bg3, alignItems: 'center' },
  timeBtnActive: { backgroundColor: colors.ink0 },
  timeText: { fontFamily: fonts.mono500, fontSize: 13, color: colors.ink2 },
  timeTextActive: { color: colors.white },
  eligBanner: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, backgroundColor: 'rgba(122,160,91,0.12)' },
  eligTitle: { fontFamily: fonts.sans600, fontSize: 12.5, color: '#056b48' },
  eligSub: { fontFamily: fonts.sans400, fontSize: 11, color: '#0a5c3a', marginTop: 1 },
  poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  poolSub: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink3, marginTop: 1 },
  poolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  poolRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  poolAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary },
  poolName: { fontFamily: fonts.mono400, fontSize: 12, color: colors.ink1 },
  notesInput: { fontFamily: fonts.sans400, fontSize: 13, color: colors.ink0, marginTop: 8, minHeight: 60, textAlignVertical: 'top' },
  slaText: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, textAlign: 'center', letterSpacing: 0.5 },
});
```

**Step 2: Commit**

```bash
git add mobile/app/(passenger)/home.tsx
git commit -m "feat(mobile): Screen 08 — passenger trip request with pooling, eligibility, time windows"
```

---

## Task 14: Screen 09 — My Trip Live (Passenger)

**Files:**
- Create: `mobile/app/(passenger)/my-trip.tsx`

**Step 1: Compose My Trip Live screen**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { MapboxView } from '@/components/map/mapbox-view';
import { Glyph } from '@/components/ui/glyph';
import { subscribe } from '@/lib/ws';
import { colors } from '@/theme/colors';
import { fonts, type as typ } from '@/theme/typography';
import { spacing } from '@/theme/tokens';

const STOPS = [
  { name: 'Muscat HQ', time: '06:00', state: 'next', desc: 'you + 1 board' },
  { name: 'Athaibah camp', time: '06:14', state: 'pending', desc: '2 board' },
  { name: 'Bidbid PIT', time: '07:35', state: 'pending', desc: '1 board' },
  { name: 'Marmul gate', time: '13:45', state: 'pending', desc: 'drop · destination' },
];

export default function MyTripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [vehicle, setVehicle] = useState({ lat: 23.59, lon: 58.42, heading: 0 });
  const [eta, setEta] = useState('4 min away');

  useEffect(() => {
    const unsub = subscribe('journey:current:live', (data: any) => {
      if (data.lat) setVehicle(data);
      if (data.eta) setEta(data.eta);
    });
    return unsub;
  }, []);

  const handleShareEta = async () => {
    if (await Sharing.isAvailableAsync()) {
      // In production: generate share URL and share
    }
  };

  return (
    <View style={styles.container}>
      <MapboxView center={[vehicle.lon, vehicle.lat]} zoom={12} vehiclePosition={vehicle} />

      {/* Top pills */}
      <Pressable style={[styles.backPill, { top: insets.top + 16 }]} onPress={() => router.back()}>
        <Glyph k="chevL" size={16} color={colors.ink0} />
        <Text style={styles.backText}>My trip</Text>
      </Pressable>

      <Pressable style={[styles.sharePill, { top: insets.top + 16 }]} onPress={handleShareEta}>
        <Glyph k="share" size={14} color={colors.ink0} />
        <Text style={styles.shareText}>Share ETA</Text>
      </Pressable>

      {/* Bottom card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 92 }]}>
        <View style={styles.handle} />

        {/* Status */}
        <Text style={styles.statusLabel}>SHUTTLE IS ON THE WAY</Text>
        <Text style={styles.etaText}>{eta}</Text>
        <Text style={styles.pickupText}>Picking up at Muscat HQ · Building 4 lobby</Text>

        {/* Driver card */}
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar} />
          <View style={styles.driverInfo}>
            <View style={styles.driverRow}>
              <Text style={styles.driverName}>Daoud Al-Busaidi</Text>
              <Text style={styles.driverRating}>★ 4.92 · 3 trips</Text>
            </View>
            <Text style={styles.driverVehicle}>Toyota Coaster · 14 seats</Text>
            <Text style={styles.driverPlate}>Plate 34-D-1129</Text>
          </View>
          <Pressable style={styles.phoneBtn} onPress={() => Linking.openURL('tel:+96812345678')}>
            <Glyph k="phone" size={16} color={colors.white} />
          </Pressable>
        </View>

        {/* Stops timeline */}
        <Text style={styles.stopsLabel}>STOPS ON YOUR ROUTE</Text>
        {STOPS.map((stop, i) => (
          <View key={i} style={styles.stopRow}>
            <View style={styles.stopTimeline}>
              <View style={[styles.stopDot, stop.state === 'next' && styles.stopDotNext]} />
              {i < STOPS.length - 1 && <View style={styles.stopLine} />}
            </View>
            <View style={styles.stopInfo}>
              <View style={styles.stopHeader}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopTime}>{stop.time}</Text>
              </View>
              <Text style={styles.stopDesc}>{stop.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backPill: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
  },
  backText: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  sharePill: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.white, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  shareText: { fontFamily: fonts.sans500, fontSize: 12, color: colors.ink0 },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 14, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.lineStrong, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  statusLabel: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.5 },
  etaText: { fontFamily: fonts.mono500, fontSize: 28, color: colors.ink0, letterSpacing: -0.5, marginTop: 2 },
  pickupText: { fontFamily: fonts.sans400, fontSize: 12, color: colors.ink3, marginTop: 2 },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg3, borderRadius: 12, padding: 12, marginTop: 14 },
  driverAvatar: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.line },
  driverInfo: { flex: 1, gap: 2 },
  driverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverName: { fontFamily: fonts.sans600, fontSize: 13, color: colors.ink0 },
  driverRating: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  driverVehicle: { fontFamily: fonts.sans400, fontSize: 11.5, color: colors.ink3 },
  driverPlate: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink0 },
  phoneBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink0, alignItems: 'center', justifyContent: 'center' },
  stopsLabel: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  stopRow: { flexDirection: 'row', gap: 12 },
  stopTimeline: { alignItems: 'center', width: 12 },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink4 },
  stopDotNext: { backgroundColor: colors.go, shadowColor: colors.go, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 },
  stopLine: { width: 1, flex: 1, backgroundColor: colors.ink4, marginVertical: 2, minHeight: 24 },
  stopInfo: { flex: 1, paddingBottom: 16 },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  stopName: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  stopTime: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  stopDesc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4, marginTop: 1 },
});
```

**Step 2: Commit**

```bash
git add mobile/app/(passenger)/my-trip.tsx
git commit -m "feat(mobile): Screen 09 — passenger live tracking with map, driver card, stops timeline, share ETA"
```

---

## Task 15: Download Fonts & Final Wiring

**Files:**
- Create: `mobile/assets/fonts/` (5 font files)
- Verify: `pnpm install` works
- Verify: `expo start` launches

**Step 1: Download IBM Plex fonts**

```bash
cd mobile
mkdir -p assets/fonts
# Download from Google Fonts or IBM Plex GitHub releases:
# IBMPlexSans-Regular.ttf
# IBMPlexSans-Medium.ttf
# IBMPlexSans-SemiBold.ttf
# IBMPlexMono-Regular.ttf
# IBMPlexMono-Medium.ttf
```

Download from: `https://github.com/IBM/plex/releases` — extract TTF files for Sans (Regular, Medium, SemiBold) and Mono (Regular, Medium).

**Step 2: Install and verify**

```bash
cd mobile && pnpm install
npx expo start
```

Expected: Metro bundler starts, app loads on simulator/device.

**Step 3: Final commit**

```bash
git add mobile/assets/fonts/ mobile/
git commit -m "feat(mobile): add IBM Plex fonts, complete mobile app scaffold"
```

---

## Summary

| Task | What | Commit |
|------|------|--------|
| 1 | Workspace setup | `chore: add mobile + frontend to pnpm workspace` |
| 2 | Expo scaffold | `feat(mobile): scaffold Expo project with dependencies` |
| 3 | Design tokens | `feat(mobile): add design tokens — colors, spacing, typography` |
| 4 | Icon system | `feat(mobile): add Glyph icon component — 30+ custom SVGs` |
| 5 | UI primitives | `feat(mobile): add Pill, Button, Card UI primitives` |
| 6 | Lib (API, WS, storage, sync) | `feat(mobile): add API client, MMKV storage, WebSocket, sync queue` |
| 7 | Auth + root layout + login | `feat(mobile): add auth store, root layout with auth guard, login` |
| 8 | Tab layouts + placeholders | `feat(mobile): add driver 5-tab + passenger 4-tab layouts` |
| 9 | Screen 04 — Today | `feat(mobile): Screen 04 — Today (driver daily briefing)` |
| 10 | Screen 05 — Checklist | `feat(mobile): Screen 05 — pre-trip checklist` |
| 11 | Screen 06 — QR Auth | `feat(mobile): Screen 06 — QR authentication` |
| 12 | Screen 07 — In-trip Live | `feat(mobile): Screen 07 — in-trip live` |
| 13 | Screen 08 — Request Pickup | `feat(mobile): Screen 08 — passenger trip request` |
| 14 | Screen 09 — My Trip Live | `feat(mobile): Screen 09 — passenger live tracking` |
| 15 | Fonts + final wiring | `feat(mobile): add IBM Plex fonts, complete scaffold` |
