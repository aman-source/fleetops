# Fleetops — Playwright E2E Test Plan

**Date:** 2026-05-20
**Status:** Active — for Claude Code to implement
**Scope:** Web (Next.js frontend) + Mobile (Expo) — separate test suites
**Architecture:** Journey-based — tests walk full workflows, later steps depend on earlier
**Backend:** Real (Postgres + Redis + MQTT + MinIO + Fastify) via docker-compose
**Seed:** Existing `db:seed`, `db:seed-fleet`, `db:seed-ops` scripts produce realistic Omani fixtures

---

## 🛑 Critical Rule for Claude Code

**NEVER weaken an assertion to make a failing test pass.**

If a test fails, the test is correct — the functionality is wrong. Fix the functionality. Specifically:

- ❌ Do NOT add `.skip()` to make failures go away.
- ❌ Do NOT lower a threshold (e.g. change `expect(count).toBe(3)` to `expect(count).toBeGreaterThan(0)`) without checking with the manager first.
- ❌ Do NOT loosen a selector (e.g. swap `getByTestId('gate-2-block')` for `getByText(/.*/)` ) just to find an element.
- ❌ Do NOT mock the backend response to make the assertion pass.
- ❌ Do NOT add `try { ... } catch {}` around assertions to swallow failures.
- ✅ If the spec is ambiguous about expected behavior → STOP, report it, ask the manager.
- ✅ If functionality is genuinely missing → STOP, report it, ask the manager. Do not invent the functionality without approval.
- ✅ If a selector is missing → ADD a `data-testid` attribute to the component, then use it in the test.
- ✅ If timing is flaky → fix it via Playwright `waitFor` / `expect().toPass()` retries, not by adding arbitrary `setTimeout`.

After completing a test, run the failing assertion at least once locally with a deliberately broken backend to confirm the test would actually catch a regression. A test that passes with broken functionality is worse than no test.

---

## 🏷️ Precondition — Add Stable Selectors

Before writing any test, Claude Code must add `data-testid` attributes to the interactive elements being tested. Rules:

- One `data-testid` per logical element (button, input, status pill, row).
- Naming: `kebab-case`, scope-prefixed. Examples: `journey-composer-submit`, `gate-2-status`, `vehicle-row-{vehicleId}`, `panic-banner`, `mfa-code-input`.
- For lists, use a deterministic key in the testid: `vehicle-row-12-A-3471` not `vehicle-row-0`.
- Tests use `page.getByTestId('...')` exclusively for interactive flows. Text-based selectors only for content assertions like "headline contains X".

Claude Code must commit the testid additions as one preparatory PR per area before writing the test suite for that area.

---

## 📁 Repository Layout

```
fleetops/
├── e2e/
│   ├── web/
│   │   ├── playwright.config.ts
│   │   ├── fixtures/
│   │   │   ├── seed.ts              # programmatic seed runner + reset
│   │   │   ├── auth.ts              # role-based login fixtures
│   │   │   ├── mqtt-publisher.ts    # publishes test MQTT messages
│   │   │   └── ws-listener.ts       # subscribes to WebSocket rooms for assertions
│   │   ├── helpers/
│   │   │   ├── api.ts               # direct API client for verification reads
│   │   │   ├── db.ts                # direct DB queries (read-only) for verification
│   │   │   ├── time.ts              # date/time helpers (Oman UTC+4)
│   │   │   └── selectors.ts         # central testid map
│   │   ├── journeys/                # tier 1: full role workflows
│   │   │   ├── journey-manager.spec.ts
│   │   │   ├── driver-pretrip.spec.ts
│   │   │   ├── maintenance-release.spec.ts
│   │   │   ├── hse-incident-response.spec.ts
│   │   │   ├── passenger-request-to-fulfilment.spec.ts
│   │   │   ├── admin-workflow-config.spec.ts
│   │   │   └── gm-dashboard-readonly.spec.ts
│   │   ├── safety/                  # tier 2: critical safety paths
│   │   │   ├── gate-bypass-attempts.spec.ts
│   │   │   ├── status-blocking.spec.ts
│   │   │   ├── audit-log-coverage.spec.ts
│   │   │   ├── rbac-cross-role.spec.ts
│   │   │   └── multi-tenant-isolation.spec.ts
│   │   └── happy-and-negative/      # tier 3: small focused paths
│   │       ├── auth.spec.ts
│   │       ├── document-expiry.spec.ts
│   │       ├── conditional-release-revert.spec.ts
│   │       └── notification-delivery.spec.ts
│   └── mobile/
│       ├── README.md                # how to run mobile tests
│       ├── maestro/                 # Maestro flows (preferred for Expo)
│       │   ├── driver-today.yaml
│       │   ├── driver-checklist.yaml
│       │   ├── driver-qr-auth.yaml
│       │   ├── driver-in-trip-sos.yaml
│       │   ├── passenger-request.yaml
│       │   └── passenger-live-trip.yaml
│       └── playwright/              # Playwright running the Expo web build (fallback)
│           └── ...
└── docker-compose.test.yml          # test variant — fresh DB volumes, exposes MQTT/Redis/Postgres for assertions
```

**Note on mobile:** Playwright can drive React Native apps via Expo Web, but for true device parity use [Maestro](https://maestro.mobile.dev/) — it's the closest mobile equivalent to Playwright for Expo apps. Claude Code should default to Maestro for mobile flows and only fall back to Playwright-on-web-build if Maestro proves insufficient.

---

## 🚀 Bootstrap & Run Lifecycle

### Test environment

A separate compose file `docker-compose.test.yml` brings up:
- `postgres-test` (fresh volume, port 5433)
- `redis-test` (fresh volume, port 6380)
- `mosquitto-test` (port 1884)
- `minio-test` (port 9001)
- `app-test` (the Fastify backend pointing at the above)

`pnpm test:e2e:up` brings up the stack, runs migrations, runs `db:seed && db:seed-fleet && db:seed-ops`. `pnpm test:e2e:down` tears it all down.

### Single global setup, persistent state

**Decision:** Tests share state across a journey. Each spec file represents one continuous workflow. The seed runs once at start of the suite, NOT before each test. Test order within a file matters — Playwright is configured with `test.describe.configure({ mode: 'serial' })` for journey specs.

Between spec files (between full journeys), data carries forward. This mirrors how the real system runs — vehicles created in one workflow exist in others.

When a journey spec needs a clean slate, it explicitly calls `await seed.reset()` in a `beforeAll`. This is rare and documented.

### Running locally

```
pnpm test:e2e:up          # spin up test stack
pnpm test:e2e             # all suites
pnpm test:e2e:journeys    # tier 1 only
pnpm test:e2e:safety      # tier 2 only
pnpm test:e2e:tier3       # tier 3 only
pnpm test:e2e -- --grep "panic"   # tag-based subset
pnpm test:e2e:down        # tear down
```

### CI

A `e2e.yml` GitHub Actions workflow runs the entire E2E suite on every PR. Failure blocks merge. Artifacts: Playwright HTML report, video on failure, trace on failure.

---

## 👥 Test User Personas (from seed)

| Role | Email | Org | Notes |
|---|---|---|---|
| Admin | `admin@artech.om` | AR Technology | Full access |
| Journey Manager | `jm.marmul@artech.om` | AR Technology — Marmul | Creates journeys |
| Journey Manager | `jm.nimr@artech.om` | AR Technology — Nimr-2 | Cross-tenant isolation test |
| HSE Officer | `hse@artech.om` | AR Technology | Reviews high-risk, handles incidents |
| GM / Ops | `gm@artech.om` | AR Technology | Dashboard, KPIs, exceptions |
| Maintenance Lead | `maint@artech.om` | AR Technology | Work orders, release decisions |
| Storekeeper | `stores@artech.om` | AR Technology | Parts only |
| Driver (Ali) | `ali@artech.om` | AR Technology — Marmul | Light vehicle, NFC card `04:A3:B1` |
| Driver (Khalid) | `khalid@artech.om` | AR Technology — Marmul | Truck, NFC card `04:C2:D4`, has fatigue history |
| Driver (Hassan) | `hassan@artech.om` | AR Technology — Nimr-2 | Cross-project boundary test |
| Passenger | `passenger.amal@artech.om` | AR Technology — Marmul | Valid transport entitlement |
| Passenger (no entitlement) | `passenger.zaid@artech.om` | AR Technology — Marmul | Should be rejected at request submit |
| Loading Clerk | `clerk@artech.om` | AR Technology — Marmul | Material logistics |

All passwords: `Test1234!` (seed-only). MFA disabled for these test users.

---

# TIER 1 — Journey Specs (Full Workflows)

Each spec is a single uninterrupted workflow. Tests within a spec run serially; later steps assume earlier passed.

---

## 1.1 `journey-manager.spec.ts` — Journey lifecycle, happy path

**Persona:** Journey Manager Marmul
**Goal:** Create a journey, watch it pass all gates, get approved, activated, monitored, closed.

```
beforeAll: ensure seed contains:
  - vehicle 12-A-3471 status=available, IVMS device online, all docs valid
  - driver Ali, all certs valid, license class L matches vehicle, NFC card assigned
  - planned route Marmul → Fahud → Marmul, daylight window
```

**Steps:**

1. **Login** as `jm.marmul@artech.om`.
2. **Navigate to /journeys/new**, see Journey Composer (Screen 02).
3. **Fill journey draft**: vehicle 12-A-3471, driver Ali, route, 2 passengers, planned departure tomorrow 06:00 Oman, planned arrival tomorrow 14:00 Oman, job purpose "Inspection — well 47".
4. **Save draft** → POST `/journeys` returns 201, UI shows journey in Draft.
5. **Evaluate gates** → GET `/journeys/:id/gates`. Assert all 6 gates returned. Assert each gate status is PASS or REVIEW. Assert `canSubmit=true`.
6. **UI verification**: each gate panel shows PASS green pill. No BLOCK red pills.
7. **Submit** → POST `/journeys/:id/submit`. Assert 200. Assert journey.status = `pending_approval` (UI badge updates).
8. **Verify approval chain created**: 2 steps (submitter completed, journey_manager pending). Direct DB query.
9. **Log out** as JM, **log in** as same JM (since JM approves their own journeys per current spec — adjust if approval chain says someone else).
10. **Approve journey** at JM step → journey.status = `approved`. UI green checkmark.
11. **Log in as Driver Ali** on mobile or web driver portal. Today screen shows the assigned journey.
12. **Complete pre-trip checklist** — 18 items, all PASS, no defects. Submit.
13. **Tap NFC** (simulated via MQTT publish) → backend validates driver↔vehicle pairing → journey can activate.
14. **Driver activates journey** → POST `/journeys/:id/activate` → journey.status = `active`.
15. **MQTT simulator publishes telemetry**: 30 position points along the planned route, every 10s. Driver speed under limit, in-corridor.
16. **WebSocket assertion**: subscribe to `journey:{id}:live`, assert at least 25 of the 30 position updates received within 5s of publish.
17. **Live map UI**: navigate to Active Journey screen as JM, assert vehicle marker appears, route line drawn, ETA visible.
18. **Trip completes** — final waypoint arrival published.
19. **Driver closes journey** → POST `/journeys/:id/close`. journey.status = `completed`.
20. **JM final close-out** → POST `/journeys/:id/close` (formal closure). journey.status = `closed`.
21. **Compliance report** — GET `/journeys/:id/closeout`. Assert deviations=0, on-time=true, passenger headcount matches.
22. **Audit log assertion** — query `/audit?entityType=journey&entityId={id}`. Assert ≥ 8 audit rows for the full lifecycle (create, submit, approve, activate, position updates batched, close events).

---

## 1.2 `driver-pretrip.spec.ts` — Driver path including offline checklist sync

**Persona:** Driver Ali
**Goal:** Driver receives journey, completes checklist with one defect, syncs after network restore.

1. **Login** as Ali on the driver app (Expo / Maestro).
2. **Today screen** — see assigned journey from spec 1.1 OR seed a new one.
3. **Tap "Start pre-trip"** → Checklist screen.
4. **Disable network** (Maestro / Playwright offline mode).
5. **Walk through 18 checklist items**: 17 PASS, 1 FAIL (item #1 Tires — capture photo + note "Front-left tire pressure low").
6. **Assert offline persistence**: kill the app, reopen, checklist state restored from MMKV. Failed item still shows fail.
7. **Try to submit** → either blocked with "no network" warning OR queued (depending on UX choice). Assert queue stored in MMKV.
8. **Restore network**.
9. **Assert sync within 30s**: checklist + photo + defect event reach backend. Query `/events?type=defect&vehicleId=X` should return 1 row. Photo URL resolvable.
10. **Assert defect creates a work order** if policy enabled. Query `/work-orders?vehicleId=X&status=inbound` should return ≥1 row referencing the defect.
11. **NFC authentication** — Maestro/Playwright sends a simulated NFC scan via MQTT helper. Assert UI confirms "Authenticated as Ali" within 3s.

---

## 1.3 `maintenance-release.spec.ts` — Work order to Conditional Release with auto-revert

**Persona:** Maintenance Lead → HSE → System (BullMQ worker)

1. **Login** as `maint@artech.om`.
2. **Open WO from defect** (created in spec 1.2) → kanban: inbound.
3. **Drag to in_bay**, assign technician, add 2 parts (oil filter, brake pad).
4. **Upload before photo**, upload after photo. Assert MinIO returns key, file downloadable.
5. **Move to hse_review** because spec says critical tire defect requires HSE co-sign.
6. **Login as HSE** → see WO in HSE review queue. Approve co-sign.
7. **Maintenance releases as CONDITIONAL** with expiry = 30 seconds from now. Vehicle status flips to `conditional` with `conditionalExpiry` set.
8. **Verify BullMQ job scheduled**: query Redis `bull:maintenance:delayed` directly or via /admin diagnostics. Assert job exists with the WO id.
9. **Try to submit a journey for this vehicle right now** → gate 2 status `PASS` (conditional ≠ blocked), `canSubmit=true`.
10. **Wait 35 seconds**.
11. **Assert vehicle.status now = `no_go`**. Direct DB query.
12. **Try to submit a journey now** → gate 2 status `BLOCK`. Submit returns 422 `GATE_FAILURE`.
13. **Assert notification dispatched** — query `/notifications?type=conditional_expired&userId=maintenance` ≥ 1 row.
14. **Audit log** — query confirms `release`, `hse_cosign`, and `auto_revert` actions are all logged.

---

## 1.4 `hse-incident-response.spec.ts` — Panic button to playbook closure

**Persona:** Driver (MQTT publisher acts on his behalf) → HSE Officer → System

1. **Pre-state**: vehicle 12-A-3471 in active journey (reuse from spec 1.1 or seed a fresh one).
2. **MQTT publisher publishes panic** to `fleet/{deviceId}/panic` with lat/lon/timestamp.
3. **Within 3 seconds**, assert:
   - `events` table has row with `eventType='panic'`, `severity='critical'`.
   - `incidents` table has row with `tier=1`, `status='active'`, situation includes "Panic".
   - `incident_steps` has 6 rows (the playbook), step 1 status `active`, rest `pending`.
   - `vehicles.status` for this vehicle = `hse_hold`.
   - WebSocket room `events:severity:critical` received the incident payload.
4. **Login as HSE Officer**. HSE Console screen loads incident at top of list.
5. **Click incident** → playbook view with 6 steps. Step 1 active.
6. **Click "Complete step 1"** → step 1 marked done, step 2 becomes active. Repeat for all 6 steps.
7. **Click "Close incident"** with closure report text. `incidents.status = 'closed'`.
8. **Vehicle status remains hse_hold** until HSE explicitly releases it.
9. **HSE releases vehicle** → status flips to `available`.
10. **Try to submit a new journey for this vehicle now** → gate 2 PASS, submit succeeds.
11. **Audit log**: panic_event, incident_open, step_complete×6, incident_close, hse_release all present and timestamped.

---

## 1.5 `passenger-request-to-fulfilment.spec.ts` — V1.1 passenger logistics extension

**Personas:** Passenger Amal → Logistics Planner → Driver → Passenger Amal again

1. **Login as Amal** (passenger app, web or Maestro).
2. **Submit pickup request**: from "Camp North", to "Fahud Office", requested tomorrow 07:00.
3. **Entitlement check passes** (Amal is on the seed allowlist) → request status `approved` or `pending`.
4. **Login as Passenger Zaid** (no entitlement) and try the same request → assert 422 with code `entitlement_invalid`. (Negative path nested here.)
5. **Logistics Planner logs in** (`jm.marmul@artech.om` or dedicated planner role). Sees Amal's request in the queue.
6. **Trigger auto-pool** → `POST /passenger/pools/auto-build`. Assert a pool created containing Amal's request.
7. **Planner assigns vehicle + driver + journey** to the pool → pool converts to a journey.
8. **Journey runs through gates** — assert all 6 PASS.
9. **Journey approved + activated**.
10. **Driver app** shows the trip with passenger manifest including Amal.
11. **Boarding validation**: driver scans Amal's QR (Maestro publishes a simulated QR scan to the API). Assert boarding_event row with `validationResult='valid'`.
12. **Try to board a non-manifest passenger** (random ID) → `validationResult='exception'` row + UI warning. Assert notification fired to JM + HSE.
13. **Try to board more passengers than seat capacity** → 422 `GATE_FAILURE` (capacity exceeded). Assert no boarding row.
14. **Headcount reconciliation**: at journey close, query the boarding events. Assert if any planned passenger did not board, an exception row exists with `no_show_reason`.
15. **Live trip tracking**: as Amal, navigate to "My Trip" screen. WebSocket subscription to `journey:{id}:live` shows vehicle moving. ETA updates.
16. **Trip score generated** on close — query `trip_scores` table for journey id, assert punctuality + service + safety + closure scores present.

---

## 1.6 `admin-workflow-config.spec.ts` — Admin configures workflow, executor runs it

**Persona:** Admin

(Note — this spec depends on P3.5 Workflow Executor being built. Until then, mark the executor portions as `test.skip()` is **not allowed** per the no-skip rule. Instead, mark the spec itself as `test.fixme()` with a comment pointing to the missing functionality, and document it as a blocker.)

1. **Login as Admin** (`admin@artech.om`).
2. **Navigate to /admin/workflows**. See pre-seeded workflows: `journey_approval`, `vehicle_release`.
3. **Create new workflow** "Conditional release notify" — DAG: trigger (workorder.released event with decision=conditional) → notification node (notify maint+HSE) → wait 1 hour → branch (if vehicle still conditional, notify again).
4. **Save as draft** → POST /admin/workflows.
5. **Publish workflow** → version 1 published.
6. **Trigger event**: simulate a conditional release via API (re-use spec 1.3 maintenance release).
7. **Assert workflow_executions row created** with state=running, currentNodeId pointing at the notification node.
8. **Assert notification queued** with the expected template.
9. **Force time forward** (test helper: artificially advance the BullMQ scheduler clock for the wait node).
10. **Assert next node runs**: branch evaluates current vehicle status, fires next notification if still conditional.
11. **Kill the app mid-execution** (Playwright triggers a backend restart between two nodes).
12. **Restart app** — assert paused workflow executions resume from `currentNodeId`. State machine is crash-safe.

---

## 1.7 `gm-dashboard-readonly.spec.ts` — GM dashboard cross-data integrity

**Persona:** GM / Ops

1. **Login as GM** (`gm@artech.om`).
2. **Navigate to /analytics** (Screen 14 — KPI dashboard).
3. **Assert KPI tiles present**: fleet utilization, journey on-time %, No-Go rate, incidents (period), avg driver score, LTI days.
4. **Cross-check tile values against direct DB queries** — within 5% tolerance for cached values.
5. **By-site breakdown** — assert Marmul + Nimr-2 rows visible.
6. **Stacked journey chart** — 30-day window, today's data point matches actual journeys count.
7. **Top operational risks list** — assert at least 1 row if any blocking conditions exist in the seed.
8. **Generate report** — POST /reports/generate type=vehicle_readiness. Poll until status=complete. Download PDF. Assert PDF non-empty, contains "AR Technology", contains vehicle plate numbers.
9. **CSV export** — GET /vehicles?format=csv. Assert headers, at least 20 rows (the seed fleet).
10. **Assert GM cannot perform write actions** on read-only screens (the writes themselves are tested in safety/rbac-cross-role).

---

# TIER 2 — Safety & Critical Paths

Tests that specifically attack the safety guarantees. Negative paths and bypass attempts.

---

## 2.1 `gate-bypass-attempts.spec.ts`

For each gate, attempt to bypass via direct API while UI shows BLOCK.

1. **Gate 1 bypass (Driver auth)**:
   a. Seed: driver with expired license.
   b. Create journey draft via API (skip UI). POST /journeys/:id/submit.
   c. Assert 422 GATE_FAILURE, blockedGates includes "Driver Authorization", `gates[0].checks[*].status` contains BLOCK with reason "License expired".

2. **Gate 2 bypass (Vehicle readiness)**: vehicle `no_go` → submit blocked.
3. **Gate 3 bypass (Documents)**: Mulkia expired → submit blocked.
4. **Gate 4 bypass (Route & risk)**: planned departure 02:00 Oman, 18-hour duration → status=REVIEW; if `canSubmit` returns false due to BLOCK on another sub-check, submit blocked.
5. **Gate 5 bypass (Headcount)**: 8 passengers on a 5-seat vehicle → blocked.
6. **Gate 6 bypass (HSE)**: high-risk score, no HSE approval recorded → submit creates pending_approval with HSE step; trying to activate before HSE approves → blocked.
7. **All-clean baseline**: ensure if all gates would PASS, submit returns 201. Confirms the test infrastructure isn't false-positive.

---

## 2.2 `status-blocking.spec.ts`

Verify every blocking status actually blocks. For each of `no_go`, `under_maintenance`, `expired_documents`, `ivms_fault`, `nfc_fault`, `hse_hold`, `decommissioned`:

1. Set vehicle to that status (via API or direct DB).
2. Try to create + submit a journey using that vehicle.
3. Assert 422 with specific message referencing the blocking status.
4. Verify gate 2 output contains the BLOCK with the status name.

Then verify the **invalid transitions** are rejected at DB level (post P0.4):

5. Direct DB UPDATE attempting `decommissioned` → `available` raises Postgres exception.
6. Direct DB UPDATE attempting `expired_documents` → `under_maintenance` raises.
7. Application-layer service throws ConflictError before reaching DB on invalid transitions.

---

## 2.3 `audit-log-coverage.spec.ts`

For each role, perform 5 mutating actions and assert exactly one audit_logs row per action.

1. Admin creates a user → 1 audit row, action `POST /api/v1/admin/users`.
2. JM creates a journey → 1 audit row.
3. Maintenance releases a WO → 1 audit row.
4. HSE closes an incident → 1 audit row.
5. Driver tap NFC (via MQTT — verify the NFC tap also produces an audit-equivalent event in `events`, since MQTT isn't HTTP).
6. Assert audit_logs row has: userId, action, entityType, entityId (when UUID in path), statusCode, ip, userAgent, orgId.
7. **Negative**: attempted unauthorized action by a non-allowed role → 403 → audit row present with statusCode=403 (so we can detect attack attempts).
8. **Assert no DELETE on audit_logs** — try DELETE FROM audit_logs as the app user → permission denied (DB role config check).

---

## 2.4 `rbac-cross-role.spec.ts`

A grid of (role × endpoint × expected status).

| Endpoint | Driver | Pax | Storekeeper | JM | Maint | HSE | GM | Admin |
|---|---|---|---|---|---|---|---|---|
| POST /journeys | 403 | 403 | 403 | 201 | 403 | 403 | 403 | 201 |
| POST /journeys/:id/approve | 403 | 403 | 403 | 200 | 403 | 200* | 200* | 200 |
| POST /work-orders/:id/release | 403 | 403 | 403 | 403 | 200 | 403 | 403 | 200 |
| POST /work-orders/:id/hse-approve | 403 | 403 | 403 | 403 | 403 | 200 | 403 | 200 |
| POST /incidents/:id/close | 403 | 403 | 403 | 403 | 403 | 200 | 403 | 200 |
| POST /admin/workflows | 403 | 403 | 403 | 403 | 403 | 403 | 403 | 201 |
| GET /analytics/kpis | 403 | 403 | 403 | 200 | 200 | 200 | 200 | 200 |
| POST /passenger/requests | 403 | 201 | 403 | 403 | 403 | 403 | 403 | 201 |
| GET /audit | 403 | 403 | 403 | 403 | 403 | 200 | 403 | 200 |

\* HSE/GM approve only when chain reaches their step.

Loop through the table. Each cell is one test. Assert exact status code.

---

## 2.5 `multi-tenant-isolation.spec.ts`

1. Login as `jm.marmul@artech.om`. Create journey A using Marmul vehicle.
2. Login as `jm.nimr@artech.om`. List journeys — assert journey A NOT visible.
3. Direct GET /journeys/{A.id} as Nimr JM → 404 (not 403 — implementation must not leak existence).
4. Direct PATCH /journeys/{A.id} as Nimr JM → 404.
5. Repeat for vehicles, drivers, work orders, incidents, documents, passenger requests.
6. **Cross-tenant join attempt**: Nimr JM creates a journey referencing a Marmul vehicle ID via API → 400 or 404. Should never succeed.
7. **Audit query for org Marmul** by Nimr admin → 404 / empty.

---

# TIER 3 — Happy + Negative Focused Paths

Small, single-concern specs.

---

## 3.1 `auth.spec.ts`

1. Login with valid email + password → access + refresh tokens returned.
2. Login with wrong password → 401, no token.
3. Login with non-existent email → 401 (same message — no user enumeration).
4. Login → access token → call protected endpoint → 200.
5. Wait for access token expiry → call protected endpoint → 401.
6. Refresh → new access token → call protected → 200.
7. Logout → access token blacklisted → call protected → 401.
8. **Rate limit** (post P0.2): 6 login attempts in 60s → 6th returns 429.
9. **MFA required** (post P3.6): admin login with no MFA configured → 403 mfa_setup_required.
10. **MFA enabled** flow: login → 200 mfaRequired:true → submit code → tokens returned.
11. **MFA wrong code** → 401, no tokens.

---

## 3.2 `document-expiry.spec.ts`

1. Create document with expiryDate = now + 5 seconds, blocksOnExpiry=true.
2. Assert BullMQ jobs scheduled for 90/60/30/7 days before AND for expiry day.
3. Wait 6 seconds.
4. Assert vehicle.status = `expired_documents`.
5. Try to submit journey → gate 3 BLOCK.
6. Renew document: PATCH with new expiryDate = now + 30 days.
7. Assert old jobs cancelled, new jobs scheduled.
8. Assert vehicle.status flips back to `available` (assuming no other blocking conditions).
9. Submit journey → gate 3 PASS.

---

## 3.3 `conditional-release-revert.spec.ts`

Already covered in 1.3 — this is the unit-of-functionality version, faster to run in CI.

---

## 3.4 `notification-delivery.spec.ts`

(Post P3.1 channel implementations.)

1. Configure user prefs: in_app + email enabled for `panic` event.
2. Trigger panic via MQTT.
3. Assert in_app notification appears in /notifications list within 3s.
4. Assert WebSocket `notifications:{userId}` received the payload.
5. Assert email recorded in `notification_deliveries` with status=sent (using a fake SMTP — MailHog container).
6. Manually fetch from MailHog: assert email present, subject contains "PANIC", body includes vehicle plate.
7. **Escalation**: don't acknowledge for 10 minutes (test helper advances clock). Assert next-tier notification dispatched.

---

# 📱 MOBILE — Maestro Flows

Maestro flows live in `e2e/mobile/maestro/*.yaml`. Same no-weakening rule. Same testid discipline — components must expose `testID` props.

## Mobile.1 `driver-today.yaml`

1. Launch app, login as Ali.
2. Tap "Driver" tab → Today screen.
3. Assert assigned journey card visible with plate + destination.
4. Assert "Start pre-trip" button enabled.

## Mobile.2 `driver-checklist.yaml`

1. Tap "Start pre-trip" → checklist screen.
2. Walk through 18 items: pass all but item 7 (Fire extinguisher) — mark fail, attach photo, add note.
3. Submit checklist.
4. Assert defect appears in /defects tab.
5. Assert sync queue cleared (offline indicator gone).

## Mobile.3 `driver-qr-auth.yaml`

1. Tap QR auth step → camera opens.
2. Maestro injects a known QR code (Ali's driver token).
3. Assert UI transitions: scanning → detected → verifying → authenticated.
4. Assert next button enabled.

Test **3 attempts limit**: inject wrong QR 3 times → assert "manual override" button appears, requires HSE approval flow.

## Mobile.4 `driver-in-trip-sos.yaml`

1. Start journey (already approved).
2. In-trip screen loads. Map visible.
3. Long-press SOS button for 3 seconds.
4. Assert immediate haptic + visual confirmation.
5. Assert backend received panic event within 5s (verify via API helper).
6. Assert UI shows "SOS sent" toast with timestamp.
7. **Network-offline variant**: airplane mode, repeat. Assert SOS still triggers, queued with `offline: true` flag, fires on reconnect.

## Mobile.5 `passenger-request.yaml`

1. Login as Amal.
2. Tap "Request pickup".
3. Select from = Camp North, to = Fahud Office, time = tomorrow 07:00.
4. Submit. Assert success state.
5. Tap "My Trips" → request appears with status pending/approved.

## Mobile.6 `passenger-live-trip.yaml`

(Requires journey 1.5 active.)

1. Open My Trip.
2. Assert map shows vehicle marker.
3. Assert ETA updates every WebSocket message.
4. Tap "Call driver" → assert telephony intent fired (Maestro check).
5. Tap "Share ETA" → native share sheet opens.

---

# 🧪 Test Helper Contracts (for Claude Code)

These helpers should be implemented in `e2e/web/helpers/` and `e2e/web/fixtures/`.

### `seed.ts`
```ts
export async function fullSeed(): Promise<void>;          // runs db:seed + db:seed-fleet + db:seed-ops
export async function reset(): Promise<void>;             // truncates all tables, re-runs full seed
export async function resetTenant(orgId: string): Promise<void>;  // scoped clean
```

### `auth.ts` (Playwright fixture)
```ts
export const test = base.extend<{
  authAs: (role: 'admin'|'jm'|'hse'|'gm'|'maint'|'driver'|'passenger') => Promise<void>;
  apiAs:  (role: ...) => APIRequestContext;
}>({...});
```

### `mqtt-publisher.ts`
```ts
export async function publishTelemetry(deviceId: string, point: TelemetryPoint): Promise<void>;
export async function publishPanic(deviceId: string, data: PanicPayload): Promise<void>;
export async function publishNfc(deviceId: string, cardUid: string, authorized: boolean): Promise<void>;
export async function simulateRoute(deviceId: string, route: LatLon[], intervalMs: number): Promise<void>;
```

### `ws-listener.ts`
```ts
export async function subscribeRoom(room: string, token: string): Promise<{ messages: any[]; close: () => void; waitFor: (predicate, timeoutMs) => Promise<any>; }>;
```

### `time.ts`
```ts
export function omanTime(yyyy_mm_dd: string, hh_mm: string): Date;  // returns ISO with +04:00
export async function advanceBullMqClock(seconds: number): Promise<void>; // for testing delayed jobs without real waiting
```

### `db.ts`
```ts
// READ-ONLY helpers for assertions. Tests must not write directly to DB unless explicitly required.
export async function getVehicleStatus(plateOrId: string): Promise<string>;
export async function getJourneyStatus(id: string): Promise<string>;
export async function getIncidentBy(eventId: string): Promise<Incident | null>;
export async function getAuditLogs(filter: {entityType?: string; entityId?: string; userId?: string}): Promise<AuditLog[]>;
```

---

# 🚦 Acceptance Criteria for the Test Suite Itself

When Claude Code completes the suite, verify ALL of the following:

1. `pnpm test:e2e:up && pnpm test:e2e` exits 0 on a clean repo.
2. All tier 1 specs run serially within their file but tier 1 specs can run in parallel with each other.
3. Total runtime under 25 minutes on a developer laptop with 8 cores.
4. CI workflow runs the full suite on every PR.
5. Each test has a clear `// arrange / // act / // assert` structure.
6. No `.skip()` in production code. No commented-out assertions.
7. Coverage: every Tier 1 spec touches at least one PASS path AND at least one BLOCK / negative path.
8. Every `data-testid` added is documented in `helpers/selectors.ts` as a single source of truth.
9. Failure output: when a test fails, the Playwright HTML report + DB state snapshot at failure are attached.
10. README at `e2e/README.md` explains: how to run, how to debug, the no-weakening rule, how to add a new spec.

---

# 🛠️ Implementation Order for Claude Code

Build the suite in this order. Don't proceed to next phase until previous is green.

| Step | Scope | Effort |
|---|---|---|
| 0 | Infra: `docker-compose.test.yml`, `playwright.config.ts`, helpers skeleton, `data-testid` audit pass on existing UI | 4h |
| 1 | Tier 1.1 `journey-manager.spec.ts` — the foundational happy path | 4h |
| 2 | Tier 1.2 `driver-pretrip.spec.ts` (Maestro mirror as Mobile.1+2+3) | 4h |
| 3 | Tier 1.3 `maintenance-release.spec.ts` (requires P0.4, P1.7) | 3h |
| 4 | Tier 1.4 `hse-incident-response.spec.ts` (requires P0.1) | 3h |
| 5 | Tier 1.5 `passenger-request-to-fulfilment.spec.ts` (requires P0.5, P1.4 pooling) | 5h |
| 6 | Tier 1.7 `gm-dashboard-readonly.spec.ts` (requires P3.2 reports) | 3h |
| 7 | Tier 1.6 `admin-workflow-config.spec.ts` (requires P3.5 executor — `test.fixme` until then) | 3h |
| 8 | Tier 2 all specs | 8h |
| 9 | Tier 3 all specs | 4h |
| 10 | Mobile Maestro flows 1-6 | 6h |
| 11 | CI workflow + report artifacts + README | 2h |

**Total ~49 hours of CC work.** Run in parallel with P0/P1 functionality work — tests for a phase only become enforceable once that phase's functionality lands.

---

# ⚠️ Standing Reminder

> If any of these tests fail, the functionality is wrong. Fix the functionality.
>
> If the spec is unclear, stop and ask. Don't invent.
>
> If a test is flaky, fix the timing or the selector, never weaken the assertion.

End of document.
