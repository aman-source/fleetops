# Mobile App Design — Fleetops

**Date:** 2026-05-14
**Status:** Approved

## Summary

Single React Native (Expo) app at `mobile/` with role-based routing. Driver (5-tab, screens 04-07) and Passenger (4-tab, screens 08-09). Login determines which tab group loads.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| App structure | Single app, role-based | 6 screens total, shared auth/tokens/API/icons. Split later if needed |
| Navigation | Expo Router (file-based) | Matches Next.js mental model, deep linking built-in |
| Maps | react-native-mapbox-gl | Native 60fps, offline tiles for desert, prod target per requirement.md |
| Driver auth | QR code (expo-camera) | Works on every phone, testable in simulator, no hardware reader needed |
| Offline storage | MMKV + custom sync queue | Lightweight, JSI-based. Checklist is 18 items + 4 photos — not complex enough for WatermelonDB |
| NFC | Dropped (QR replaces) | YAGNI. Add later if client requests |
| Location | `mobile/` top-level | Matches `frontend/`. pnpm workspace for shared packages |

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 53) |
| Navigation | Expo Router |
| Language | TypeScript (strict) |
| State | Zustand + TanStack Query |
| Maps | react-native-mapbox-gl |
| Camera/QR | expo-camera (barcode scanning) |
| Storage | react-native-mmkv |
| HTTP | Axios (same interceptors as web) |
| WebSocket | Native WebSocket API |
| Fonts | IBM Plex Sans + Mono (expo-font) |
| Icons | Custom SVGs (react-native-svg) |
| Bottom sheet | @gorhom/bottom-sheet |
| Shared | @fleetops/shared Zod schemas (pnpm workspace) |

## File Structure

```
mobile/
├── app/
│   ├── _layout.tsx              # Root layout (fonts, providers, auth guard)
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth stack layout
│   │   └── login.tsx            # Login screen
│   ├── (driver)/
│   │   ├── _layout.tsx          # 5-tab bar (Today/Trips/Checks/Defects/Me)
│   │   ├── today.tsx            # Screen 04 — daily briefing
│   │   ├── checklist.tsx        # Screen 05 — pre-trip inspection
│   │   ├── qr-auth.tsx          # Screen 06 — QR driver authentication
│   │   ├── in-trip.tsx          # Screen 07 — live journey map
│   │   ├── trips.tsx            # Trip history list
│   │   ├── defects.tsx          # Reported defects list
│   │   └── profile.tsx          # Driver profile (Me tab)
│   └── (passenger)/
│       ├── _layout.tsx          # 4-tab bar (Home/My Trips/Inbox/Me)
│       ├── home.tsx             # Screen 08 — request pickup
│       ├── my-trip.tsx          # Screen 09 — live trip tracking
│       ├── trips.tsx            # Trip history
│       ├── inbox.tsx            # Notifications
│       └── profile.tsx          # Passenger profile (Me tab)
├── components/
│   ├── ui/                      # pill, glyph, button, card, bottom-sheet
│   ├── map/                     # mapbox-view wrapper
│   ├── checklist/               # photo-grid, checklist-item, defect-card
│   └── qr/                     # qr-scanner with state machine
├── lib/
│   ├── api.ts                   # Axios + JWT refresh
│   ├── ws.ts                    # WebSocket manager (rooms, reconnect)
│   ├── storage.ts               # MMKV wrapper
│   └── sync-queue.ts            # Offline mutation queue
├── stores/
│   ├── auth.ts                  # Zustand auth
│   └── checklist.ts             # Offline checklist state
├── theme/
│   ├── tokens.ts                # Editorial mood + desert palette
│   ├── typography.ts            # Plex font styles
│   └── colors.ts                # Mood + palette colors
├── app.json
├── package.json
└── tsconfig.json
```

## Screen Data Flow

### Screen 04 — Today (Driver)
- `GET /api/v1/journeys?driverId=me&status=approved&limit=1`
- `GET /api/v1/vehicles/:id`
- WebSocket: `vehicle:{id}` for live status
- Action: "Start pre-trip" → Screen 05

### Screen 05 — Pre-trip Checklist
- 18 items across 6 steps, saved to MMKV (offline-safe)
- Photos via expo-camera → filesystem → queued upload
- Defects auto-logged on fail → `POST /api/v1/events` (queued)
- Sync on connectivity restore

### Screen 06 — QR Authentication
- expo-camera barcode scanner
- Scan → extract driver ID → verify against backend
- State machine: scanning → detected → verifying → authenticated/failed
- 3 attempts → manual override (audit-logged)

### Screen 07 — In-trip Live
- `GET /api/v1/journeys/:id` → route, waypoints, passengers
- WebSocket: `journey:{id}:live` → position, speed, heading, fuel, ETA
- Mapbox: green completed route, dashed remaining, rotating vehicle marker
- SOS: hold 3s → immediate `POST /api/v1/events` (panic, bypasses queue)

### Screen 08 — Request Pickup (Passenger)
- `GET /api/v1/locations` → from/to combobox
- Eligibility check → green/red banner
- Pooling suggestions → nearby requests
- `POST /api/v1/passenger/requests`

### Screen 09 — My Trip Live (Passenger)
- `GET /api/v1/journeys/:id` → driver, vehicle, stops
- WebSocket: `journey:{id}:live` → vehicle position, ETA
- Share ETA via native share sheet
- Call driver via `Linking.openURL('tel:...')`

## Offline Strategy

**Works offline (driver):**
- Screen 04: cached journey + vehicle data
- Screen 05: full checklist flow (MMKV + filesystem photos)
- Screen 06: QR scan (camera only), verification queued

**Requires connectivity:**
- Screen 07, 09: live tracking (show "no signal" banner)
- Screen 08: form state persists, submit when online

**Sync queue (MMKV):**
```
sync:queue    → [{id, type, endpoint, method, payload, retries, createdAt}]
sync:photos   → [{id, fileUri, uploadEndpoint, linkedTo}]
checklist:{jId} → {items: [{id, status, note, photoUris}], step, completedAt}
```

Flush: NetInfo connectivity restore → photos first → mutations FIFO → 3 retries exponential backoff.

**SOS exempt** — fires immediately, retries aggressively, `offline: true` flag if cached.

## Design System

**Theme:** Editorial mood + Desert palette (defaults, matches web frontend)

```
Surfaces: #f6f4ee / #efece4 / #e8e4d8
Ink: #0d0f13 / #5c5647 / #7a7468
Primary: #d97757 (desert terracotta)
GO: #7aa05b | COND: #e0a738 | NOGO: #c0392b
```

**Typography:** IBM Plex Sans (body) + Plex Mono (labels/data). Loaded via expo-font.

**Icons:** 30+ custom SVGs from design handoff. react-native-svg. No icon library substitution.

**Spacing:** 18 horizontal, 14 card padding, 12 section gap. Safe area via useSafeAreaInsets().

**Radii:** 4/6/10/14.

**Bottom sheet:** @gorhom/bottom-sheet for screens 07, 09.
