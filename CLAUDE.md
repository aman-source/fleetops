# Fleetops — Claude Instructions

## What This Is

Production oil & gas fleet management system for AR Technology, Oman. NOT a demo/MVP. Safety-critical — vehicles in desert, real people, real compliance.

## Core Rule (Never Violate)

**A journey cannot start unless driver authorized, vehicle fit, documents valid, headcount confirmed, journey approved.** Server enforces this. UI reflects it. No client-side safety decisions. No bypassing gates.

## Architecture

- **Modular monolith** — one Node.js process, modules with clean boundaries
- **TypeScript everywhere** — backend (Fastify), frontend (Next.js 15), mobile (React Native/Expo)
- **PostgreSQL + PostGIS** — relational data + geospatial (geofences, route deviation)
- **Redis** — live vehicle state (GeoSet), pub/sub for WebSocket fan-out, cache, BullMQ backing
- **MQTT (Mosquitto)** — IVMS device ingestion. Real broker, real protocol.
- **WebSocket** — browser real-time. Push-based. Zero polling anywhere.
- **BullMQ** — async jobs (notifications, reports, expiry reminders)
- **MinIO** — S3-compatible file storage (photos, documents, evidence)
- **Docker Compose** — all services. Works laptop/VPS/on-prem.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5+ (strict mode) |
| HTTP | Fastify |
| ORM | Drizzle |
| Validation | Zod (shared between backend + frontend) |
| DB | PostgreSQL 16 + PostGIS |
| Cache/RT | Redis 7 |
| MQTT | Mosquitto + mqtt.js |
| WebSocket | @fastify/websocket |
| Queue | BullMQ |
| Storage | MinIO (S3-compatible) |
| Frontend | Next.js 15 (App Router) |
| Mobile | React Native (Expo) |
| State | Zustand + TanStack Query |
| Maps | Leaflet (dev) → Mapbox/ESRI (prod) |
| Testing | Vitest + Supertest |
| Deploy | Docker Compose |

## Project Structure

```
src/
├── server.ts          — Fastify bootstrap
├── env.ts             — Zod-validated env vars
├── infra/             — Database, Redis, MQTT, WebSocket, Storage, Queue
├── modules/           — auth, fleet, journey, ivms, maintenance, hse, passenger,
│                        documents, notifications, audit, admin, analytics
└── shared/            — types, errors, pagination, middleware, utils

packages/shared/       — Zod schemas consumed by backend + frontend + mobile
tests/                 — integration/ and unit/
```

## Module Pattern

Every module follows:
```
module/
├── module.routes.ts    — Fastify route definitions
├── module.service.ts   — Business logic
├── module.schema.ts    — Zod schemas (import from packages/shared when shared)
└── [domain-specific].ts — Gates, workflow, risk, pooling, etc.
```

## Coding Rules

### Safety
- Server re-validates ALL gates on journey submit. Never trust UI state.
- Audit log is automatic (Fastify onResponse hook). Don't add manual audit calls.
- Soft-delete only for safety records. No hard delete. No DELETE endpoint for incidents, events, panic logs, work orders.
- Postgres constraints enforce valid status transitions.
- File uploads: max 10MB, JPEG/PNG/HEIC only, EXIF stripped server-side.

### Data
- All list endpoints: cursor-based pagination, filtering, sorting, date-range.
- All mutations: Zod validation on input, typed response.
- Multi-tenant: every query scoped by tenant_id (org hierarchy).
- Timestamps: always UTC, ISO 8601.
- IDs: UUIDs (crypto.randomUUID()).
- Money: integers (baisa, not OMR). 1 OMR = 1000 baisa.

### API
- REST, versioned `/api/v1/`.
- Response envelope: `{ data, meta?, error? }`.
- Error format: `{ error: string, code: string, details?: object }`.
- HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable (gate failures), 500 Internal.

### Real-Time
- Vehicle positions: Redis GeoSet + Hash. Updated on every MQTT message.
- WebSocket rooms: `fleet:live`, `journey:{id}:live`, `vehicle:{id}`, `events:project:{id}`, `events:severity:critical`.
- Stale threshold: 60s since last_seen → show "device offline" status.
- Panic events: immediate path — no batching, no queue delay. Direct Redis publish + DB write + priority-1 notification job.

### Testing
- Integration tests for every safety flow (gate rejection, status blocking, audit logging).
- Tests run against real Postgres + Redis in Docker (not mocks).
- Test data uses realistic Omani names, plates (12-A-3471 format), Oman coordinates.

### Code Style
- No `any`. Use `unknown` and narrow.
- No classes for services. Plain functions + dependency injection via Fastify plugins.
- Prefer `const` over `let`. No `var`.
- Error handling: typed error classes extending base AppError. Fastify error handler maps to HTTP responses.
- No console.log in production code. Use Fastify's built-in pino logger.

## Design System

- Fonts: IBM Plex Sans + IBM Plex Mono (self-hosted)
- Color tokens: see requirement.md Section 9
- Three moods: industrial (dark, default), editorial (light cream), warroom (black + amber)
- Three palettes: cool (default), desert (terracotta), cyber (cyan)
- Status colors: go (#1ec991), cond (#f5a524), nogo (#ef4747), info/primary (#4a90ff)
- All 30+ icons are custom SVGs from design handoff (IK object in shared.jsx). Do NOT substitute icon libraries.

## Key Domain Concepts

- **Go/No-Go** — vehicle release decision. Three options: GO (full release), CONDITIONAL (with expiry), NO-GO (blocked). HSE co-sign may be required.
- **6 Journey Gates** — driver auth, vehicle readiness, documents, route & risk, passengers, HSE approval. All must pass for journey submission.
- **Workflow Engine** — admin-configurable DAG (trigger → gate → branch → approval → notification → action). Stored as JSON, executed as persistent state machine.
- **Panic** — highest priority event. Auto-opens HSE console, immediate notification fan-out, response playbook (state machine).
- **Conditional Release** — vehicle approved with time-limited restriction. Auto-reverts to No-Go on expiry.

## Oman-Specific

- Plate format: `\d{1,2}-[A-Z]-\d{3,4}` (e.g., 12-A-3471)
- Phone: +968 XXXXXXXX
- Currency: OMR (1 OMR = 1000 baisa). Store as integer baisa.
- Coordinates: interior Oman (Marmul 18.13N/55.20E, Nimr 19.13N/55.93E, Fahud 22.34N/56.50E)
- Language: English first, Arabic RTL ready
- Documents: Mulkia (registration), RAS (inspection), PDO site permits

## Files Reference

- `requirement.md` — complete functional + design spec (read this first)
- `docs/plans/2026-05-13-backend-architecture-design.md` — architecture decisions
- `design_handoff_fleetops/` — UI prototypes (open Fleetops.html in browser)
- `design_handoff_fleetops/README.md` — design handoff documentation
- `design_handoff_fleetops/styles.css` — all design tokens
- `design_handoff_fleetops/shared.jsx` — icons, primitives, map component
