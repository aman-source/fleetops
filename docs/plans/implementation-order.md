# Fleetops Implementation Order

Sequence matters. Each phase builds patterns reused by later phases. No phase starts until previous is wired and tested.

---

## Phase 0: Infrastructure (Day 1)

**Goal:** `docker-compose up` gives you running Postgres + Redis + Mosquitto + MinIO + App.

- [ ] `docker-compose.yml` — all 5 services
- [ ] `Dockerfile` — multi-stage Node build
- [ ] Postgres init script — enable PostGIS, create DB, create app role
- [ ] Mosquitto config — listener on 1883, websocket on 9001, auth plugin
- [ ] MinIO bucket creation on startup
- [ ] `src/env.ts` — Zod-validated environment variables
- [ ] `src/server.ts` — Fastify bootstrap with plugin registration
- [ ] `src/infra/db/client.ts` — Drizzle + pg pool
- [ ] `src/infra/redis/client.ts` — ioredis connection
- [ ] `src/infra/mqtt/client.ts` — mqtt.js connection to Mosquitto
- [ ] `src/infra/storage/s3.ts` — MinIO client
- [ ] `src/infra/queue/bull.ts` — BullMQ connection
- [ ] Health check endpoint — `GET /health` returns DB, Redis, MQTT, MinIO status
- [ ] Logger setup — pino via Fastify

**Test:** `docker-compose up && curl localhost:3000/health` returns all green.

---

## Phase 1: Auth & Multi-Tenant Foundation

**Goal:** Users can log in, RBAC enforced, tenant-scoped queries.

- [ ] DB schema: organizations, users, roles, permissions, sessions
- [ ] Seed: AR Technology org, 2 projects (Marmul, Nimr-2), 7 role types
- [ ] Auth routes: POST /auth/login, POST /auth/refresh, POST /auth/logout
- [ ] JWT generation + verification middleware
- [ ] RBAC middleware — `authorize('journey:create')` pattern
- [ ] Tenant middleware — extract org from token, scope all queries
- [ ] MFA support for admin/HSE/GM roles (TOTP)
- [ ] Audit middleware — auto-log every mutation

**Test:** Login → get token → access allowed endpoint → access denied endpoint → audit log written.

---

## Phase 2: Fleet Core (Vehicles, Drivers, Devices)

**Goal:** Vehicle master, driver profiles, device registry. Screen 15 data layer.

- [ ] DB schema: vehicles, drivers, devices, vehicle_photos
- [ ] Seed: 20 vehicles (realistic Omani plates, VINs, status mix), 15 drivers, 20 IVMS devices
- [ ] Vehicle CRUD routes with status management
- [ ] Driver CRUD routes with NFC card assignment
- [ ] Device CRUD routes with vehicle linking
- [ ] Vehicle status enum enforcement (Available, Conditional, No-Go, etc.)
- [ ] Status transition validation — only valid transitions allowed
- [ ] Vehicle profile aggregate endpoint — `/api/v1/vehicles/:id` with nested resources

**Test:** Create vehicle → assign device → change status → verify constraint blocks invalid transition.

---

## Phase 3: Documents & Expiry Engine

**Goal:** Document tracking with auto-block on expiry. Part of Go/No-Go gate.

- [ ] DB schema: documents (polymorphic — vehicle or driver entity)
- [ ] Seed: 6 document types per vehicle (Mulkia, insurance, RAS, permit, fire ext, first aid)
- [ ] Document CRUD routes with file upload (MinIO)
- [ ] Expiry reminder scheduling (BullMQ delayed jobs: 90/60/30/7d)
- [ ] Auto-block: expired document → vehicle status = Expired Documents
- [ ] Renewal flow: upload new doc → remove old expiry jobs → schedule new ones

**Test:** Create doc with expiry in 5 seconds → verify status auto-changes → renew → verify new schedule.

---

## Phase 4: IVMS Ingestion & Live Tracking

**Goal:** MQTT messages flow through to Redis live state and Postgres history. Screen 01 data layer.

- [ ] MQTT topic schema: `fleet/{deviceId}/telemetry`, `fleet/{deviceId}/event`
- [ ] MQTT subscriber — connect to Mosquitto, subscribe to `fleet/+/telemetry`
- [ ] Vendor adapter interface — normalize different device payloads
- [ ] Default adapter — generic telemetry format
- [ ] Redis live state: GEOADD positions, HSET vehicle state hash
- [ ] Postgres write: telemetry_logs table (append-only, partitioned by month)
- [ ] Event classification: overspeed, harsh braking, idle, tamper, offline
- [ ] Geofence check on every position update (PostGIS, bbox pre-filter)
- [ ] Redis pub/sub: publish to project/vehicle/journey/severity channels
- [ ] WebSocket server setup — upgrade handler, room management, token auth
- [ ] WebSocket rooms: fleet:live, vehicle:{id}, events:project:{id}
- [ ] Device health tracking: last_seen, signal quality, battery

**Test:** Publish MQTT message → verify Redis state updated → verify Postgres row → verify WebSocket client receives.

---

## Phase 5: Journey Management & Go/No-Go Gates

**Goal:** Create, validate, approve, monitor, close journeys. Screen 02 data layer. THE critical module.

- [ ] DB schema: journeys, journey_passengers, journey_waypoints, journey_approvals
- [ ] Journey states: Draft → Pending → Approved → Active → Completed → Closed (+ Rejected, Cancelled, Delayed, Deviated, Emergency)
- [ ] Journey CRUD routes
- [ ] **6 Gate validators:**
  - [ ] Gate 1: Driver authorization (license, DDC, medical, vehicle type auth, NFC card)
  - [ ] Gate 2: Vehicle readiness (maintenance status, tires, IVMS, NFC reader, panic button)
  - [ ] Gate 3: Documents & permits (all vehicle docs valid, not expiring within threshold)
  - [ ] Gate 4: Route & risk (approved roads, daylight window, weather, refuel, comms)
  - [ ] Gate 5: Passengers & headcount (manifest count ≤ seatbelts, eligibility)
  - [ ] Gate 6: HSE approval (risk level routing, last incident, fatigue check)
- [ ] `GET /api/v1/journeys/:id/gates` — returns full gate evaluation
- [ ] `POST /api/v1/journeys/:id/submit` — re-validates all gates server-side, rejects if any BLOCK
- [ ] Risk score computation (route distance, time of day, weather, driver history, vehicle age)
- [ ] Approval chain: submitter → journey mgr → HSE (if risk ≥ M) → final
- [ ] Active journey tracking: WebSocket room `journey:{id}:live`
- [ ] Journey close-out: auto-generate compliance report

**Test:** Journey with No-Go vehicle → submit rejected. Journey with expired license → submit rejected. All gates pass → submit succeeds. Direct API bypass attempt → server catches.

---

## Phase 6: Maintenance & Work Orders

**Goal:** Workshop operations, Go/No-Go release. Screens 11-12 data layer.

- [ ] DB schema: work_orders, work_order_parts, work_order_photos, work_order_activity
- [ ] Work order CRUD + status management (kanban: inbound → in bay → awaiting parts → HSE review → ready)
- [ ] Release decision endpoint: `POST /api/v1/work-orders/:id/release` — GO / CONDITIONAL / NO-GO
- [ ] Conditional release: expiry date required, auto-reverts to No-Go on expiry (BullMQ delayed job)
- [ ] HSE co-sign flow: when required, WO stuck in HSE review until approved
- [ ] Parts tracking: issue against WO, old-part disposal
- [ ] Tire management: serial, axle position, tread depth, rotation history
- [ ] Before/after photo evidence (MinIO upload)
- [ ] Activity timeline: every action attributed to user + timestamp

**Test:** Open WO → add parts → set CONDITIONAL with 1-hour expiry → verify auto-reverts → HSE co-sign flow.

---

## Phase 7: HSE & Incident Response

**Goal:** Panic handling, incident management, driver scores. Screen 13 data layer.

- [ ] DB schema: incidents, incident_steps, driver_scores
- [ ] Panic event handler: immediate path (no queue delay)
- [ ] Incident creation from panic event
- [ ] Response playbook: 6 steps, state machine, click-to-complete
- [ ] Tier escalation: Tier 1 → Tier 2 notification fan-out
- [ ] Driver score computation: overspeed events, harsh events, incidents, compliance
- [ ] HSE hold: block vehicle, require HSE release
- [ ] WebSocket: events:severity:critical room for HSE console

**Test:** Simulate panic MQTT event → incident created → HSE WebSocket notified → playbook steps complete → escalation triggers.

---

## Phase 8: Passenger Module

**Goal:** Request, pool, assign, validate boarding. Screens 08-10 data layer.

- [ ] DB schema: passenger_requests, transport_entitlements, request_pools, boarding_events
- [ ] Passenger request CRUD
- [ ] Entitlement check: eligible routes, allowed times, active clearance
- [ ] Pooling engine: group by route/shift/destination, bin-pack into vehicles
- [ ] Planner assignment: convert pool → journey plan
- [ ] Boarding validation: NFC/QR/employee ID/manual
- [ ] Headcount reconciliation: manifest vs actual, mismatch alert
- [ ] Trip score: punctuality, service, safety, closure

**Test:** Submit request → pool formed → vehicle assigned → boarding validated → headcount matches → trip scored.

---

## Phase 9: Notifications

**Goal:** Multi-channel notification delivery.

- [ ] DB schema: notifications, notification_preferences
- [ ] Channel implementations: email (nodemailer), SMS (Twilio/gateway), WhatsApp (API), push (Expo), in-app
- [ ] Template system: per-event templates with variable substitution
- [ ] BullMQ notification queue with retry + dead letter
- [ ] User preference: which channels per event type
- [ ] Escalation rules: if no ack within SLA → escalate to next role

**Test:** Trigger overspeed event → correct users notified on correct channels → escalation fires on timeout.

---

## Phase 10: Analytics & Reports

**Goal:** KPI computation, dashboard data, PDF/CSV export. Screen 14 data layer.

- [ ] KPI endpoints: fleet utilization, journey on-time, No-Go rate, incidents, driver score avg, cost/km
- [ ] Aggregate queries with 60s cache (Redis)
- [ ] By-site breakdown table
- [ ] Stacked journey chart data (30-day)
- [ ] Fleet readiness breakdown by status
- [ ] Top operational risks list
- [ ] PDF report generation (BullMQ background job)
- [ ] CSV export for all list endpoints
- [ ] Scheduled reports: daily/weekly/monthly email

**Test:** Seed 30 days of data → verify KPI computations → export PDF → verify content.

---

## Phase 11: Admin & Workflow Engine

**Goal:** Configurable workflows, system admin. Screen 16 data layer.

- [ ] DB schema: workflows, workflow_versions, workflow_executions, workflow_step_logs
- [ ] Workflow CRUD: create, edit draft, publish version (never edit published)
- [ ] DAG storage: nodes + edges as JSONB
- [ ] Workflow executor: persistent state machine (crash-safe)
- [ ] Node types: Trigger, Gate, Approval, Notification, Action, Branch, Wait
- [ ] Journey approval workflow (pre-built, configurable)
- [ ] Vehicle release workflow (pre-built, configurable)
- [ ] Checklist template management
- [ ] Configurable expiry reminder rules
- [ ] System settings: per-tenant config

**Test:** Create workflow → publish → trigger execution → verify state transitions → crash mid-workflow → restart → resume from last state.

---

## Phase 12: Frontend — Foundation + First Screens

Detailed in separate frontend implementation plan. Backend must be wired first.

---

## Phase 13: Mobile — Driver App

Detailed in separate mobile implementation plan. Depends on Phase 5 (journey) + Phase 4 (IVMS).

---

## Phase 14: Hardening

- [ ] Rate limiting (per user, per IP)
- [ ] CORS configuration
- [ ] Helmet security headers
- [ ] Request size limits
- [ ] SQL injection prevention (Drizzle parameterized by default)
- [ ] XSS prevention (Zod strips unexpected fields)
- [ ] EXIF stripping on photo uploads
- [ ] Penetration testing
- [ ] Load testing (k6 — simulate 264 vehicles × 10s updates)
- [ ] Backup/restore verification
- [ ] Monitoring: health checks, error rates, latency percentiles
