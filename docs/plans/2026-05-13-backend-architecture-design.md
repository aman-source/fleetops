# Fleetops Backend Architecture Design

**Date:** 13 May 2026
**Status:** Approved
**Team:** You + Claude (D-team)
**Context:** Production-grade oil & gas fleet management — not MVP, not demo

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Team model | You review, Claude builds | Max leverage, one language, extreme automation |
| Architecture | Modular monolith | One deploy, one debug, one log stream. Extract later if needed |
| Language | TypeScript everywhere | One language: backend + frontend + mobile. Fastest review velocity |
| HTTP framework | Fastify | 2x Express, schema-first, TypeScript-native, plugin system |
| ORM | Drizzle | Type-safe SQL, zero runtime overhead, raw PostGIS support |
| Validation | Zod (shared package) | Single schema → backend validation + frontend forms + API types |
| Database | PostgreSQL + PostGIS | Relational, JSONB, geospatial (geofences, route deviation, nearest vehicle) |
| Cache / real-time state | Redis | Live vehicle positions (GeoSet), pub/sub for WebSocket fan-out, session cache |
| Device ingestion | MQTT via Mosquitto | Industry standard IoT protocol. Real broker from day one, no fake simulators |
| Browser real-time | WebSocket (@fastify/websocket) | Push-based, Redis pub/sub fan-out, room-based subscriptions |
| Job queue | BullMQ | Redis-backed, retries, cron, delayed jobs (expiry reminders), dead letter queue |
| File storage | MinIO | S3-compatible, Docker, on-prem ready. Photos, docs, evidence |
| Auth | JWT access + refresh tokens | Stateless verification, Redis blacklist for revocation, MFA for admin/HSE/GM |
| Frontend web | Next.js 15 (App Router) | Same TypeScript, SSR where needed, file-based routing |
| Frontend mobile | React Native (Expo) | Same TypeScript, same Zustand stores, same API client, same Zod schemas |
| State management | Zustand | Lightweight, TypeScript-native, one store per domain |
| Data fetching | TanStack Query | Cache, dedup, background refetch, optimistic updates |
| Map | Leaflet (dev) → Mapbox/ESRI (prod) | Free for dev, swap tile provider for production |
| Deployment | Docker Compose | Works everywhere: laptop, VPS, Oman cloud, on-prem |
| Testing | Vitest + Supertest | Integration tests against real Postgres + Redis containers |

---

## Project Structure

```
fleetops/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── CLAUDE.md
│
├── src/
│   ├── server.ts
│   ├── env.ts
│   │
│   ├── infra/
│   │   ├── db/          (Drizzle schema, migrations, seed, client)
│   │   ├── redis/       (client, pub/sub, live-state)
│   │   ├── mqtt/        (Mosquitto client, topics, vendor adapters)
│   │   ├── ws/          (WebSocket server, rooms, auth)
│   │   ├── storage/     (MinIO/S3)
│   │   └── queue/       (BullMQ)
│   │
│   ├── modules/
│   │   ├── auth/        (RBAC, MFA, sessions)
│   │   ├── fleet/       (vehicles, drivers, devices)
│   │   ├── journey/     (plans, gates, approval workflow, risk)
│   │   ├── ivms/        (MQTT ingestion, event classification, geofence, telemetry)
│   │   ├── maintenance/ (work orders, Go/No-Go release, parts, tires)
│   │   ├── hse/         (incidents, panic, playbooks)
│   │   ├── passenger/   (requests, pooling, boarding, entitlement)
│   │   ├── documents/   (expiry tracking, renewal alerts)
│   │   ├── notifications/ (email, SMS, WhatsApp, push, in-app)
│   │   ├── audit/       (auto-logged mutations)
│   │   ├── admin/       (workflow engine, config, tenant)
│   │   └── analytics/   (KPIs, reports, exports)
│   │
│   └── shared/
│       ├── types/
│       ├── errors.ts
│       ├── pagination.ts
│       ├── middleware/   (auth, rbac, tenant, audit)
│       └── utils/       (dates, geo, validators)
│
├── packages/
│   └── shared/          (Zod schemas, types — consumed by backend + frontend + mobile)
│
├── tests/
│   ├── integration/
│   └── unit/
│
├── docs/
│   └── plans/
│
└── design_handoff_fleetops/
```

---

## DSA & Optimization

| Problem | Solution | Complexity |
|---------|----------|-----------|
| Live vehicle positions | Redis GeoSet (GEOADD/GEOSEARCH) | O(log N) update, O(log N + M) range |
| Geofence containment | PostGIS GIST R-tree index | O(log F) per point |
| Route deviation | In-memory bbox pre-filter + PostGIS ST_Distance | O(1) fast, O(log N) precise |
| Gate validation | Promise.all parallel + short-circuit | O(1) wall-clock |
| Request pooling | Hash group + first-fit decreasing bin pack | O(N log N) |
| Event fan-out | Redis pub/sub + Streams (capped ring buffer) | O(1) publish |
| Workflow execution | DAG walk + persistent state machine | O(E) per execution |
| Document expiry | BullMQ delayed jobs (Redis sorted set) | O(log N) schedule |
| Multi-tenant | Postgres RLS or query-level tenant_id | O(1) per query |

---

## Real-Time Pipeline

```
IVMS device
  → MQTT (Mosquitto broker in Docker)
  → Node MQTT subscriber
  → Normalize event (per-vendor adapter)
  → Write to Postgres (async, don't block pipeline)
  → Update Redis GeoSet + Hash (live state)
  → Check geofences (PostGIS, cached bbox pre-filter)
  → Check route deviation (if active journey)
  → Classify event (overspeed? panic? idle? deviation?)
  → Redis PUBLISH to channels (project, vehicle, journey, severity)
  → WebSocket server delivers to subscribed browsers
  → If PANIC: immediate DB write + BullMQ priority-1 notification job
```

Zero polling. Every hop is push-based.

---

## Safety Layers (Bug Prevention)

1. **Zod shared schemas** — single source of truth for backend + frontend + API client. Field mismatch = compile error.
2. **Server re-validates** — UI shows gate state but server re-checks all 6 gates on submit. Cannot bypass.
3. **Postgres constraints** — CHECK constraints on vehicle status, append-only audit logs (no UPDATE/DELETE).
4. **Database RLS** — tenant isolation at query level.
5. **WebSocket Zod validation** — malformed real-time data logged + dropped, never crashes UI.
6. **Integration tests** — every safety flow tested (No-Go vehicle rejection, expired license, headcount mismatch, gate bypass attempt).
7. **Audit hook** — automatic Fastify onResponse hook. Every mutation logged. Developer cannot forget.

---

## Frontend Wiring

- **Contract-driven:** Zod schema → backend validates, frontend validates forms, API client gets types
- **Server is law:** UI reflects server state. Safety decisions made server-side only.
- **WebSocket rooms:** fleet:live, journey:{id}:live, events:project:{id}, events:severity:critical
- **State:** Zustand stores per domain, TanStack Query for server state
- **Offline mobile:** Queue checklist/photos/defects, sync on reconnect

---

## Screen Build Order

| Phase | Screens | Patterns Established |
|-------|---------|---------------------|
| 1 — Foundation | Auth, tokens, primitives, shells | Design system, RBAC, WebSocket provider |
| 2 — Read-heavy | 15 (Vehicle Master) | REST fetch, cache, tabbed lazy-load, detail page |
| 3 — Real-time | 01 (Live Fleet Map) | WebSocket subscription, Leaflet, event stream |
| 4 — Safety-critical | 02 (Journey Composer) | Server-driven gates, multi-step form, disabled submit |
| 5 — Mobile | 04-07 (Driver App) | React Native, offline-first, NFC, camera |
| 6 — Assembly | 03, 08-14 (remaining) | All patterns established — assembly, not invention |
| 7 — Complex | 16 (Admin Workflows) | Node-graph editor, deferred last |

---

## Docker Compose Services

```yaml
services:
  app:        # Node.js (Fastify + MQTT subscriber + WebSocket + BullMQ worker)
  postgres:   # PostgreSQL 16 + PostGIS
  redis:      # Redis 7
  mosquitto:  # Eclipse Mosquitto MQTT broker
  minio:      # S3-compatible object storage
```

Five containers. One `docker-compose up`. Works on laptop, VPS, on-prem.
