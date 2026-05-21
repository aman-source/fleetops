# Fleetops — Remaining Implementation Order

**Date:** 2026-05-20
**Status:** Active punchlist
**Context:** Status review completed against `AR_Technology_Journey_Fleet_Management.docx` spec and `implementation-order.md` plan. ~70% built. This document lists everything remaining, in execution order.

**How to use:** Each phase has copy-pasteable prompts for Claude Code. Do them in order. Don't skip ahead — later phases assume earlier ones are wired. After each fix, verify with the listed acceptance check before moving on.

---

## Priority Tiers

- **P0 — Safety wires** (this week): small fixes that close real safety gaps. Hours of work, days of risk reduction.
- **P1 — Missing core features** (next 2-3 weeks): spec-mandated features that don't exist yet.
- **P2 — Missing modules** (after P1): whole modules the spec calls for that weren't built.
- **P3 — Output & integration** (after P2): reports, notifications, exports, integrations.
- **P4 — Hardening** (before pilot): tests, rate limit, EXIF, load test, monitoring.

---

# P0 — Safety Wires

These are short fixes with disproportionate impact. **Do all of P0 before starting P1.**

## P0.1 — Panic event → incident → notification chain

**Why:** Panic button press currently writes an event but does not create an incident, does not start the playbook, does not notify HSE. `createPanicIncident()` is fully built and unused. This is the most consequential gap in the system.

**File:** `src/modules/ivms/mqtt-subscriber.ts` → `handlePanic()`

**Prompt for Claude Code:**

```
Fix the broken panic flow in src/modules/ivms/mqtt-subscriber.ts.

Currently handlePanic() ends with:
  // 3. TODO Phase 7: Create incident
  // 4. TODO Phase 9: BullMQ priority-1 notification job

The functions you need already exist:
- createPanicIncident() in src/modules/hse/hse.service.ts
- queueNotification() in src/modules/notifications/notifications.service.ts

Changes:
1. Modify storeAndPublishEvent to return the inserted event id (use .returning() on the insert).
2. After storeAndPublishEvent in handlePanic, call createPanicIncident with eventId, vehicleId, driverId, journeyId, lat, lon, orgId. Wrap in try/catch — log errors but never throw from the panic path.
3. Query users with role in ('hse','gm','journey_manager') for the org via Drizzle. For each, call queueNotification with priority 1, type 'panic', title and body describing the event, and channel 'in_app' (other channels are TODO for now).
4. Remove the two TODO comments.

Do not modify createPanicIncident — it is correct.
Do not add tests.
```

**Acceptance check:**
- Search the repo for `TODO Phase 7` and `TODO Phase 9` — should be gone.
- `pnpm lint` clean.
- Simulate panic via MQTT (`mosquitto_pub -t fleet/{deviceId}/panic ...`) and confirm a row appears in `incidents` table and `incident_steps`.

---

## P0.2 — Register the rate limiter

**Why:** `@fastify/rate-limit` is in package.json but never registered. Public `/auth/login` is wide open to brute force.

**File:** `src/server.ts`

**Prompt for Claude Code:**

```
Register @fastify/rate-limit in src/server.ts.

Add an import: import rateLimit from '@fastify/rate-limit'

Register it before route registration with:
- Global default: 100 requests per minute per IP
- Redis backend (use the existing redis client from src/infra/redis/client.ts) so limits work across multiple app instances
- Stricter rule on /auth/login: 5 attempts per minute per IP, key by IP, return 429 with code RATE_LIMITED

Use the @fastify/rate-limit per-route config option to set the login limit (search docs if unsure of the API shape).

After registration, /auth/login should return 429 on the 6th attempt within a minute from the same IP.
```

**Acceptance check:**
- `curl -X POST localhost:3000/api/v1/auth/login` six times in under a minute from same IP → 6th returns 429.

---

## P0.3 — EXIF stripping on photo uploads

**Why:** CLAUDE.md mandates this. Photos uploaded with embedded GPS metadata = passenger/driver location leak.

**Files:** anywhere a photo is uploaded — `src/modules/documents/documents.service.ts`, `src/modules/maintenance/maintenance.service.ts`, anywhere `uploadFile` is called.

**Prompt for Claude Code:**

```
Add EXIF stripping to all image uploads in the backend.

1. Install sharp: pnpm add sharp -F fleetops (root package)
2. Create src/shared/image.ts with an exported async function stripExif(buffer: Buffer, mimetype: string): Promise<Buffer>. It should:
   - Pass through non-images unchanged
   - Use sharp(buffer).rotate().withMetadata({ exif: {} }).toBuffer() for JPEG/PNG/HEIC
   - Throw a BadRequestError if mimetype is not image/jpeg, image/png, or image/heic
3. Modify every place that calls uploadFile with an image buffer (search for uploadFile across src/modules) to first run the buffer through stripExif when the mimetype starts with 'image/'.
4. Enforce a 10MB max size — reject earlier in the multipart handler.

Acceptance: any image uploaded should have no GPS, no camera serial, no datetime original in EXIF after upload.
```

**Acceptance check:**
- Upload a phone photo with GPS, download it back from MinIO, run `exiftool` on it → no GPS tags.

---

## P0.4 — DB-level status transition constraints

**Why:** CLAUDE.md says "Postgres constraints enforce valid status transitions." Currently they're only enforced in the service layer — anyone hitting the DB directly (or bypassing routes via a future bug) can set any status.

**Files:** `src/infra/db/schema/vehicles.ts`, new migration

**Prompt for Claude Code:**

```
Add Postgres CHECK constraints enforcing valid vehicle status transitions.

1. Add a database trigger function `validate_vehicle_status_transition` that runs BEFORE UPDATE on vehicles. It should raise an exception if the transition from OLD.status to NEW.status is not in the allowed map. Use the following allowed transitions (read CLAUDE.md and the spec for context):

   available     → conditional, no_go, under_maintenance, expired_documents, ivms_fault, hse_hold, decommissioned
   conditional   → available, no_go, under_maintenance, hse_hold
   no_go         → conditional, under_maintenance, decommissioned
   under_maintenance → available, conditional, no_go
   expired_documents → available  (after renewal)
   ivms_fault    → available, under_maintenance
   hse_hold      → available, no_go  (HSE release only)
   decommissioned → (terminal — no transitions out)

2. Generate a Drizzle migration that creates the trigger function and binds it to the vehicles table.
3. Same exercise for journey status — add a trigger validating journey state transitions per the 11-state machine in implementation-order.md Phase 5.

Acceptance: directly UPDATE vehicles SET status='available' WHERE status='decommissioned' should raise a Postgres exception. The service-layer check should remain (defense in depth).
```

**Acceptance check:**
- `psql` directly into the DB, try an invalid transition → error.

---

## P0.5 — Boarding validation against manifest

**Why:** Current code: `validationResult = input.passengerId ? 'valid' : 'exception'`. Any non-empty passenger ID passes validation. Spec demands NFC/QR/employee ID/manual check against the approved manifest.

**File:** `src/modules/passenger/passenger.service.ts`

**Prompt for Claude Code:**

```
Replace the stubbed boarding validation in src/modules/passenger/passenger.service.ts.

Current code (search for "Validate passenger is on manifest — simplified check"):
  const validationResult = input.passengerId ? 'valid' : 'exception';

Replace with:
1. Query journey_passengers for this journeyId. Build a Set of approved passenger ids.
2. Validation rules:
   - If method is 'nfc': look up passenger by NFC card UID. If not found → 'exception' with exceptionNote='NFC card not registered'. If found but not on manifest → 'exception' with 'Passenger not on manifest'. Otherwise 'valid'.
   - If method is 'qr': same as nfc but lookup by QR token field on passenger.
   - If method is 'employee_id': lookup passenger by employee_id field on the manifest entry.
   - If method is 'manual': passengerId required; verify it exists on the manifest; if missing 'exception' with 'Manual override without manifest entry'.
3. After insert, check headcount reconciliation:
   - Count boarding events with validationResult='valid' for this journey.
   - Compare to journey_passengers count (the manifest).
   - If actual > manifest count: publish event 'headcount_mismatch' severity='warning' to Redis events:severity:critical channel, AND insert a row in events table.
4. If totalOccupants (valid boardings + 1 driver) > vehicle.seatCount: publish 'capacity_exceeded' severity='critical' and block the boarding by throwing GateError.

Do not touch the route handler. All logic in the service.
```

**Acceptance check:**
- Insert journey with manifest of 3 passengers, send 4 valid boardings via API → 4th rejected or warning fired.
- Send boarding for non-manifest passenger → returns exception.

---

# P1 — Missing Core Features

Spec-mandated, partially-stubbed or absent in the codebase. These need real implementation, not just wiring.

## P1.1 — Risk score computation (Gate 6)

**Why:** Gate 6 routes journeys to HSE only when risk is High. Currently the score formula is `night + duration` only. Spec wants route distance, time of day, weather, driver history, vehicle age. Without a real score, every high-risk journey may skip HSE review.

**Prompt for Claude Code:**

```
Implement a real risk score in src/modules/journey/gates.ts evaluateHSEGate().

Formula (deterministic, server-side):
  riskScore =
      night_departure_points  (3 if dep hour < 5 or > 22, else 0)
    + duration_points         (2 if duration > 8h, +2 more if > 12h)
    + driver_history_points   (query driver_scores: 3 if score < 60, 1 if < 80, 0 otherwise; also +2 if any incidents in last 30 days for this driver)
    + vehicle_age_points      (compute from vehicles.year: 2 if > 10 years, 1 if > 7 years)
    + route_distance_points   (sum waypoint distances if waypoints present; 2 if > 300km, 1 if > 150km)
    + recent_panic_points     (3 if this vehicle had any panic event in last 90 days)

Risk level:
  riskScore >= 7  → 'H' (BLOCK unless HSE approves — set Gate 6 to REVIEW)
  riskScore >= 4  → 'M' (REVIEW — HSE sign-off recommended)
  riskScore <  4  → 'L' (PASS)

Persist the riskScore on the journey row when submitJourney runs (add to journeys.riskScore numeric column if missing, create a migration).

Driver fatigue check: also compute hours_driven_last_24h from telemetry_logs (rough proxy: sum of durations of journeys closed in last 24h for this driver). If > 10 hours → add 'driver fatigue' check status BLOCK.

Update gate output to include riskScore and riskLevel in the check messages so the UI can display them.
```

**Acceptance check:**
- Submit a night journey, 14-hour duration, driver score 55, 12-year-old vehicle → score >= 7, gate 6 = REVIEW.
- Submit a normal daytime 4-hour journey, fresh driver, new vehicle → score < 4, gate 6 = PASS.

---

## P1.2 — Geofence check + route deviation in IVMS pipeline

**Why:** Spec mandates geofence containment on every position update and route deviation detection for active journeys. CC's report confirms `ST_Within` / `ST_DWithin` queries don't exist anywhere. This means red-zone entry, project-boundary breach, and route deviation alerts are all dead.

**Prompt for Claude Code:**

```
Add geofence + route deviation checks to the IVMS pipeline.

1. Schema (create migration):
   - Add geofences table: id, name, type (red_zone | site | camp | corridor | refuel), geom geometry(Polygon, 4326), orgId, projectId, active, deletedAt. GIST index on geom.
   - Add journey_route_corridor: journeyId, corridor geometry(Polygon, 4326), bufferMeters int. Generated when journey is approved by buffering waypoints linestring by N meters.

2. Seed: insert sample red zones (e.g., Marmul restricted area), site boundaries, refuel stations. Use realistic Oman coordinates.

3. In src/modules/ivms/mqtt-subscriber.ts handleTelemetry, after Redis update but before publish:
   a. Geofence check: SELECT id, name, type FROM geofences WHERE ST_Contains(geom, ST_MakePoint(lon, lat)) AND orgId = orgId. For each match emit a geofence_enter event (cache last-known geofence per vehicle in Redis to avoid duplicate enter events; emit geofence_exit when previous-frame contained and current does not).
   b. Route deviation: if point.journeyId is set, fetch journey_route_corridor. SELECT NOT ST_Contains(corridor, point) — if true, increment a Redis counter `deviation:{journeyId}` with TTL 60s; when counter > 3 consecutive frames, emit route_deviation event severity='warning' and update journey.status to 'deviated'.

4. Use a 2-tier optimization for geofence: cache org-level bounding box in memory at startup, reject fast if point not in any org bbox. Only hit PostGIS if bbox matches.

5. Wire route corridor generation into approveJourney: ST_Buffer of the waypoint linestring at 500m (configurable per project). Store via Drizzle raw SQL.

Acceptance:
- Publish telemetry inside red zone → geofence_enter event in DB.
- Publish telemetry 1km off-route for an active journey 4 times → route_deviation event emitted, journey status flips to deviated.
- No regression in pipeline latency (< 50ms p99).
```

**Acceptance check:**
- `psql` query the `events` table for `eventType='geofence_enter'` and `'route_deviation'` after simulation.

---

## P1.3 — Approval chain wiring

**Why:** CC noted only the submitter step is auto-created on journey submit. The Journey Manager and HSE approval steps are not wired to routes. Without this, journeys go nowhere after submission.

**Prompt for Claude Code:**

```
Wire the journey approval chain in src/modules/journey/journey.service.ts.

Current behavior: submitJourney inserts only the submitter step in journey_approvals.

Required:
1. On submit, after all 6 gates pass, generate the full approval chain:
   - Step 1: submitter (auto-completed at submit time)
   - Step 2: journey_manager (pending)
   - Step 3: hse (pending, only if any gate returned REVIEW OR riskLevel='H')
   - Step 4: gm (pending, only if riskLevel='H' AND amount/distance crosses configurable threshold — for now, just include for H risk)

2. Set journey.status to 'pending_approval' after submit (not 'pending'). Update the journey status enum if needed.

3. approveJourney(journeyId, userId, userRole):
   - Find the next pending step.
   - Verify userRole matches step.step (e.g. journey_manager role required for journey_manager step). Throw ForbiddenError if not.
   - Update step to approved with userId and timestamp.
   - If next pending step exists, journey stays in pending_approval.
   - If no more pending steps, set journey.status to 'approved' and publish 'journey:approved' on Redis.

4. rejectJourney works at any step the current role is authorized for — sets journey.status='rejected', step.decision='rejected', and records reason. No further steps activate.

5. Add /journeys/:id/approvals endpoint returning the full chain so UI can render it.

6. Audit log already covers this via the hook — no manual audit calls needed.
```

**Acceptance check:**
- High-risk journey: submit → state pending_approval, 4 steps; JM approves → still pending; HSE approves → still pending; GM approves → journey approved.
- Low-risk journey: 2 steps (submitter + JM). JM approves → approved.

---

## P1.4 — Vehicle status enum completion

**Why:** Spec lists 8 vehicle statuses including `nfc_fault` and `hse_hold`. Code shows `available`, `conditional`, `no_go`, `under_maintenance`. Missing statuses mean those failure modes can't be represented, can't be blocked at gates.

**Prompt for Claude Code:**

```
Complete the vehicle status enum in src/infra/db/schema/vehicles.ts and update Gate 2.

1. Add these statuses to the vehicles.status enum (Drizzle pgEnum):
   - expired_documents
   - ivms_fault
   - nfc_fault
   - hse_hold
   - decommissioned

2. Create a migration that extends the enum.

3. Update Gate 2 (src/modules/journey/gates.ts evaluateVehicleGate):
   - vehicle.status 'available' or 'conditional' → PASS
   - vehicle.status anything else → BLOCK with a message referencing the status name

4. Add automatic status flipping:
   - In documents.expiry worker, when a vehicle document expires and blocksOnExpiry=true, set vehicle.status='expired_documents'. When all blocking docs renewed, flip back to 'available' (only if no other blocking condition).
   - In MQTT health handler (handleHealth), if device.healthStatus changes to 'fault' AND device.type='ivms', set the linked vehicle to 'ivms_fault'.
   - Same for nfc_fault.

5. createPanicIncident already sets hse_hold — verify that's still working after enum change.

Acceptance: Force a doc to expire (set expiryDate in past, run worker) → vehicle.status flips to expired_documents → submitJourney blocked at gate 2.
```

---

## P1.5 — Configurable checklist templates

**Why:** Mobile app currently hardcodes 18 checklist items. Spec demands admin-configurable templates. Without this, AR Tech can't customize per project.

**Prompt for Claude Code:**

```
Make pre-trip checklists server-driven and admin-configurable.

1. Schema:
   - checklist_templates: id, name, orgId, projectId (nullable), version, status (draft|published|archived), publishedAt, createdBy, deletedAt
   - checklist_items: id, templateId, stepNumber, category, label, description, requiresPhoto, isCritical (failing this = blocks gate 2), sortOrder

2. Admin routes in src/modules/admin/admin.routes.ts:
   - GET /admin/checklist-templates (list)
   - POST /admin/checklist-templates (create draft)
   - PUT /admin/checklist-templates/:id (edit draft only)
   - POST /admin/checklist-templates/:id/publish (publish version, archive previous published version)
   - GET /admin/checklist-templates/:id

3. Driver-facing route in fleet or journey module:
   - GET /vehicles/:id/checklist-template → returns the active published template for the org+project of this vehicle. Falls back to a default template if none defined.

4. Migration: create default template with the 18 items from mobile/app/(driver)/checklist.tsx so existing mobile code keeps working.

5. Mobile (don't touch yet — note for later): mobile must fetch template via API instead of using the hardcoded CHECKLIST_ITEMS array. Track as separate mobile-side task.

Acceptance: Admin can POST a new template, publish it, and GET /vehicles/:id/checklist-template returns the new items.
```

---

## P1.6 — NFC card history table

**Why:** Spec requires "maintain card issue/revoke history." Current schema has `nfcCardUid` as a single value on `drivers` — overwriting loses the audit trail.

**Prompt for Claude Code:**

```
Add NFC card history tracking.

1. Schema:
   - driver_nfc_cards: id, driverId, cardUid, issuedAt, issuedBy, revokedAt (nullable), revokedBy (nullable), revokeReason
   - Keep drivers.nfcCardUid as a denormalized current-card cache (no breaking change)

2. Modify src/modules/fleet/fleet.service.ts:
   - assignNfcCard: insert new row in driver_nfc_cards, revoke any existing active card for this driver (set revokedAt), update drivers.nfcCardUid
   - revokeNfcCard: set revokedAt on the active card, set drivers.nfcCardUid=null
   - getNfcHistory(driverId): list all cards (active + revoked) ordered by issuedAt desc

3. Add routes:
   - GET /drivers/:id/nfc-history

Acceptance: assign card A, assign card B → history shows A revoked, B active. Drivers.nfcCardUid = B's uid.
```

---

## P1.7 — Conditional release auto-revert verification

**Why:** Plan says vehicles released CONDITIONAL with expiry should auto-revert to no_go via BullMQ. CC's report flags this as "code path not verified." Important — a conditional release that never reverts means a temporary clearance becomes permanent.

**Prompt for Claude Code:**

```
Audit and harden the conditional release auto-revert in src/modules/maintenance/maintenance.service.ts.

1. Find the function that handles work order release (releaseWorkOrder or similar) when releaseDecision='conditional'.
2. Verify it schedules a BullMQ delayed job with delay = releaseExpiry - now and a stable jobId like `wo-${workOrderId}-revert`.
3. Verify there's a worker (createWorker) listening on the maintenance queue that, when this job fires:
   - Re-reads the vehicle: if vehicle.status is still 'conditional' AND the conditionalExpiry is still in the past → flip to 'no_go'
   - Logs the auto-revert
   - Publishes a notification to maintenance and HSE roles
4. Verify that updating a conditional release (e.g. extending expiry, or re-releasing as GO) cancels the old job and reschedules.
5. If any of the above is missing, build it.

Acceptance: Release a vehicle as conditional with expiry 30 seconds in the future. Wait 35 seconds. Vehicle status should be 'no_go'. A notification should have been queued for maintenance + HSE.
```

---

# P2 — Missing Modules

Entire functional areas the spec calls for that don't exist in the codebase.

## P2.1 — Job Plan Execution module (spec 6.5)

**Why:** Spec mandates linking journeys to work orders or job plans, with destination, waypoint list, and proof records. Not in repo.

**Prompt for Claude Code:**

```
Build the Job Plan Execution module per spec section 6.5.

1. Schema (src/infra/db/schema/job-plans.ts):
   - job_plans: id, jobNumber (auto, e.g. JOB-23045), journeyId (nullable, FK), workOrderRef (text, optional ERP ref), jobType (delivery|pickup|service|inspection|survey|maintenance), purpose, destinationLat, destinationLon, plannedStart, plannedEnd, status (draft|assigned|in_progress|completed|closed|cancelled), orgId, createdBy, deletedAt
   - job_waypoints: id, jobId, sequence, name, lat, lon, plannedArrival, actualArrival (nullable), proofType (signature|photo|nfc_scan|none), proofData (jsonb), notes
   - job_proofs: id, jobId, waypointId (nullable), type, fileUrl (MinIO key), capturedBy, capturedAt, deviceLat, deviceLon

2. Module folder src/modules/jobs/ with .routes.ts, .service.ts, .schema.ts following the standard module pattern.

3. Routes:
   - GET /jobs (paginated, filterable by journeyId, vehicleId, status)
   - POST /jobs (create draft)
   - GET /jobs/:id (with nested waypoints + proofs)
   - PATCH /jobs/:id
   - POST /jobs/:id/assign-journey (link to journey)
   - POST /jobs/:id/waypoints (add waypoint)
   - POST /jobs/:id/waypoints/:wpId/complete (driver marks arrival, with proof upload)
   - POST /jobs/:id/close

4. RBAC: 'job:create', 'job:update', 'job:complete' (driver), 'job:close' permissions.

5. Tie into journey close: when journey is closed, if linked job exists and any waypoint has no actualArrival, journey status goes to 'closed_with_exceptions' and the gap is recorded.

6. Register in src/server.ts.
```

---

## P2.2 — Loading/Unloading segments (Material Logistics)

**Why:** Spec calls for segment-based load/unload records with clerk identity, timestamp, quantity, photo, signature, closure. Not in repo.

**Prompt for Claude Code:**

```
Build the Material Logistics / Loading-Unloading segment module per spec.

1. Schema (src/infra/db/schema/loading.ts):
   - loading_segments: id, journeyId, jobId (nullable), sequence, materialRef (text), materialDescription, quantity, uom (text, e.g. 'tonnes' | 'pieces' | 'm3'), loadingLat, loadingLon, unloadingLat (nullable), unloadingLon (nullable), loadTime (nullable), unloadTime (nullable), loadingClerkId (FK user), supervisorApprovedBy (nullable FK), status (planned|loaded|in_transit|unloaded|closed|exception), notes, orgId, deletedAt
   - loading_evidence: id, segmentId, type (load_photo|unload_photo|signature|document), fileUrl, capturedAt, capturedBy, exifStripped (boolean default false then true after sharp process)

2. Module folder src/modules/logistics/

3. Routes:
   - GET /logistics/segments (filterable)
   - POST /logistics/segments (create)
   - PATCH /logistics/segments/:id
   - POST /logistics/segments/:id/load (records loadTime, location, clerkId from auth, accepts photo upload)
   - POST /logistics/segments/:id/unload (records unloadTime, unloading location, accepts photo + signature)
   - POST /logistics/segments/:id/close (supervisor approval)
   - POST /logistics/segments/:id/evidence (additional evidence upload)

4. Role: add 'loading_clerk' to seeded roles with permissions logistics:load, logistics:unload.

5. Add gate / notification: if journey is being closed AND any linked segment has status != closed → emit 'loading_segment_not_closed' notification per spec section 11.

6. Register in src/server.ts.
```

---

## P2.3 — Inspection Campaigns

**Why:** Spec describes time-bound focused inspection campaigns scheduled by central workshop or HSE. Not in repo.

**Prompt for Claude Code:**

```
Build the Inspection Campaigns module per spec.

1. Schema (src/infra/db/schema/inspections.ts):
   - inspection_campaigns: id, name, campaignType (routine|focused|incident_response|compliance), description, vehicleScope (jsonb — criteria: by type, by project, by ageYears, or explicit vehicle ids), startDate, endDate, status (draft|scheduled|active|completed|cancelled), createdBy, createdByRole, orgId, findingsSummary, deletedAt
   - inspection_assignments: id, campaignId, vehicleId, assignedTo (FK driver or inspector user), dueDate, status (pending|in_progress|passed|failed|skipped), startedAt, completedAt, result (jsonb), photoCount, criticalDefects (int)
   - inspection_items: id, campaignId, label, description, isCritical
   - inspection_responses: id, assignmentId, itemId, status (pass|fail|na), note, photoUrl

2. Module folder src/modules/inspections/

3. Routes:
   - GET /inspections/campaigns (list, filterable)
   - POST /inspections/campaigns (create as workshop or HSE only)
   - POST /inspections/campaigns/:id/schedule (auto-create assignments from scope criteria)
   - POST /inspections/campaigns/:id/activate
   - GET /inspections/campaigns/:id/assignments
   - PATCH /inspections/assignments/:id (driver/inspector updates)
   - POST /inspections/assignments/:id/submit (complete inspection with responses)
   - GET /inspections/campaigns/:id/report (aggregate findings)

4. Gate impact: add a Gate 2 sub-check — if vehicle has an active inspection campaign assignment with status='failed' and any criticalDefects > 0 → BLOCK.

5. Background job: BullMQ scheduled job to flip campaign status to 'active' at startDate and 'completed' at endDate.

6. Register in src/server.ts.
```

---

## P2.4 — Pooling engine for passenger requests

**Why:** Currently planner can only create pools manually. Spec wants auto-grouping by route, shift, destination, vehicle capacity with bin-packing.

**Prompt for Claude Code:**

```
Implement the request pooling engine in src/modules/passenger/passenger.service.ts.

1. Add a function autoPool(orgId, options): groups passenger_requests with status='approved' that don't yet belong to a pool.

2. Grouping algorithm:
   a. Group requests by (route_id OR (pickup_zone, drop_zone), shift_time_bucket=15-min-window, project_id).
   b. Within each group, sort by priority desc then requested_time asc.
   c. Bin-pack into pools using First Fit Decreasing: for each request, place in the first pool that has capacity (capacity = vehicle.seatCount - 1 for driver, default 14 if vehicle not yet selected).
   d. Create new pool when no existing pool fits.

3. Add admin route: POST /passenger/pools/auto-build — triggers autoPool, returns created pool ids.

4. Schedule a BullMQ cron job (every 10 minutes) that calls autoPool for all orgs.

5. Add entitlement check earlier: when passenger submits a request, query transport_entitlements: must have an active entitlement covering this route AND requested time within allowed days/times. Reject with 422 entitlement_invalid if not.

6. Trip score computation on journey close: compute punctualityScore (planned vs actual times), passengerServiceScore (no-shows + manifest mismatches inverted), safetyScore (driver score for this trip averaged with incident count), closureScore (was journey closed cleanly = 1.0, else lower). Store in trip_scores table.

Acceptance: submit 30 passenger requests across 3 routes, run auto-pool, get 3-5 pools each at or under capacity.
```

---

# P3 — Output & Integration

After data exists and logic runs, surface it. Reports, notifications, integrations.

## P3.1 — Notification channel implementations

**Why:** All external channels (email, SMS, WhatsApp, push) are explicit TODOs. Without these, alerts only show in-app.

**Prompt for Claude Code:**

```
Implement notification channels in src/modules/notifications/notifications.service.ts.

1. Add env vars to src/env.ts (Zod-validated):
   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (optional — feature disabled if missing)
   - SMS_PROVIDER (twilio|gateway|none), TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
   - WHATSAPP_PROVIDER (twilio|cloud_api|none) + credentials
   - EXPO_ACCESS_TOKEN (for push)

2. Channel adapters in src/modules/notifications/channels/:
   - email.ts — nodemailer transport, exports sendEmail(to, subject, html, text)
   - sms.ts — Twilio client, exports sendSms(to, body)
   - whatsapp.ts — Twilio WhatsApp or Cloud API, exports sendWhatsApp(to, body, mediaUrl?)
   - push.ts — Expo SDK, exports sendPush(expoPushToken, title, body, data)
   - All adapters return { success, providerId, error? } — never throw. Log errors.

3. Templates in src/modules/notifications/templates/ — JSON or TS objects keyed by eventType + locale. Variables interpolated via simple {{var}} replacement. Start with: panic, route_deviation, gate_blocked, document_expiring, conditional_expired, work_order_critical, journey_approved.

4. Worker startNotificationWorker:
   - For each queue job, look up user prefs and templates.
   - Render template with payload.data.
   - Call each enabled channel adapter.
   - Record delivery in notification_deliveries (new table: id, notificationId, channel, providerId, status, sentAt, error).
   - Mark deliveries that failed for retry (BullMQ default retry policy).

5. Add user preference seeding: every user gets default in_app=enabled for all event types; email enabled for HSE/GM; sms enabled for panic only.

6. Implement escalation: every 5 minutes, BullMQ cron checks notifications where critical severity AND not acknowledged in 10 minutes → escalate to next role tier.

Acceptance: trigger a panic event via MQTT → in-app notification + email to HSE + SMS to GM (if configured).
```

---

## P3.2 — Reports — PDF generation

**Why:** Spec lists 17 named reports; none built.

**Prompt for Claude Code:**

```
Build async PDF report generation.

1. Install: pnpm add @react-pdf/renderer puppeteer (pick one — recommend puppeteer for HTML→PDF since the team is TS/React-fluent and HTML templates are easier to iterate)

2. Schema:
   - report_jobs: id, type (active_journey|compliance|driver_behavior|vehicle_readiness|go_no_go|maintenance|parts|tire|licensing|passenger|incident|audit), params (jsonb — date range, filters), status (queued|running|complete|failed), fileUrl (MinIO key when complete), generatedBy, generatedAt, downloadCount, error, orgId

3. Routes:
   - POST /reports/generate { type, params } → returns 202 with jobId
   - GET /reports/:jobId → status + download URL if complete
   - GET /reports → list user's recent reports

4. BullMQ worker 'reports':
   - Reads job, generates the report (server-render an HTML template per report type, run through puppeteer headless to PDF)
   - Uploads PDF to MinIO under reports/{orgId}/{yyyy-mm-dd}/{jobId}.pdf
   - Updates report_jobs row

5. HTML templates in src/modules/analytics/report-templates/ — start with 5 priority ones:
   - active_journey (per current journeys)
   - vehicle_readiness (status breakdown + by-site)
   - go_no_go (release decisions log with reasons)
   - driver_behavior (driver scores + recent events)
   - incident (per-incident detail with timeline)

6. Other 12 report types: stub controllers that return 501 not_implemented for now, slate for follow-up.

Acceptance: POST /reports/generate { type: 'vehicle_readiness', params: {} } → poll GET /reports/:id → file downloadable, opens in PDF viewer, content matches.
```

---

## P3.3 — Reports — CSV export

**Why:** Spec demands CSV/Excel export on all list endpoints. Cheap to add via streaming.

**Prompt for Claude Code:**

```
Add CSV export to all list endpoints.

1. Helper in src/shared/csv.ts: exportCsv(reply, headers, rows, filename) that streams CSV with correct headers (Content-Type: text/csv, Content-Disposition: attachment).

2. For each module with a list route (fleet vehicles, journeys, events, work orders, documents, incidents, passenger requests, notifications, audit logs):
   - Add ?format=csv to the existing GET endpoint
   - When format=csv, bypass pagination, stream up to a max of 50,000 rows
   - Set sensible CSV columns (don't dump all fields — pick the ones useful for ops)

3. Auth-gate by the same role as the list endpoint.

4. Audit hook should log csv exports too — confirm the audit middleware captures these.

Acceptance: GET /api/v1/vehicles?format=csv → downloads a CSV with plate, fleet#, status, project columns.
```

---

## P3.4 — Scheduled reports (daily/weekly/monthly email)

**Prompt for Claude Code:**

```
Build scheduled report email delivery.

1. Schema:
   - scheduled_reports: id, name, reportType, params (jsonb), cron (text), recipients (text[]), enabled, lastRunAt, nextRunAt, createdBy, orgId

2. Routes:
   - GET /admin/scheduled-reports
   - POST /admin/scheduled-reports
   - PATCH /admin/scheduled-reports/:id
   - DELETE /admin/scheduled-reports/:id

3. BullMQ cron worker that ticks every minute, finds scheduled_reports where nextRunAt <= now AND enabled=true:
   - Enqueues a report generation job
   - When complete, sends email to recipients with the PDF attached (uses the email channel from P3.1)
   - Updates lastRunAt and nextRunAt (compute from cron)

4. Use a small cron parser (cron-parser package, ~30KB).

Acceptance: schedule a vehicle_readiness report daily at 08:00. Tomorrow 08:00 → recipients receive the PDF.
```

---

## P3.5 — Workflow executor

**Why:** Admin can create/publish workflows but they never run. Without this, the configurability story is hollow.

**Prompt for Claude Code:**

```
Build the workflow execution engine.

1. Existing schema: workflows, workflow_versions, workflow_executions, workflow_step_logs. Confirm they exist; add columns if missing per below.

2. workflow_executions columns needed: id, workflowId, versionId, triggerEvent (jsonb), state (pending|running|completed|failed|paused), currentNodeId, context (jsonb — accumulated state), startedAt, completedAt, error.

3. Node types — implement handlers in src/modules/admin/workflow/handlers/:
   - trigger.ts (entry point, captures event payload into context)
   - gate.ts (re-runs gate evaluation, fails branch on BLOCK)
   - approval.ts (creates approval record, pauses execution until decided)
   - notification.ts (calls queueNotification with rendered template)
   - action.ts (e.g. set vehicle status, create work order — limited safe-action allowlist)
   - branch.ts (evaluates JSONLogic condition, picks next edge)
   - wait.ts (sleeps via BullMQ delayed continuation)

4. Executor src/modules/admin/workflow/executor.ts:
   - startExecution(workflowId, triggerEvent) — creates execution row, schedules first node
   - executeNode(executionId, nodeId) — loads handler, runs, persists context, schedules next node (or set state=completed)
   - All node executions are wrapped in try/catch — failure sets state=failed, logs to workflow_step_logs
   - On crash mid-execution, on app start, pick up paused/running executions from DB and resume from currentNodeId

5. Trigger surfaces: on journey submit, fire start_journey_approval workflow if defined for the org. On work order release set conditional, fire conditional_release workflow.

6. Seed two pre-built workflows per the spec: journey_approval and vehicle_release.

7. Tests: at minimum one integration test — submit journey, verify workflow execution row created and progressed through 3 nodes.

Acceptance: kill the app mid-execution (with a node in 'wait' state), restart, verify execution continues.
```

---

## P3.6 — MFA / TOTP

**Why:** Spec mandates MFA for admin/HSE/GM. Currently schema-only.

**Prompt for Claude Code:**

```
Implement TOTP-based MFA for admin/HSE/GM roles.

1. Install: pnpm add otplib qrcode (root)
2. Schema additions: users.mfaSecret (text, nullable), users.mfaEnabled (bool — already exists), backup_codes table (id, userId, codeHash, usedAt)

3. Auth routes:
   - POST /auth/mfa/setup (authenticated) → generates new secret, returns provisioning URI + base64 QR code. Secret stored on user (not enabled until verify).
   - POST /auth/mfa/verify { code } → verifies TOTP, sets mfaEnabled=true, generates 10 backup codes (returned once, hashed in DB)
   - POST /auth/mfa/disable → admin only or self-with-password

4. Login flow update:
   - POST /auth/login with email+password → if user.mfaEnabled, return 200 with { mfaRequired: true, mfaToken } (short-lived 5-min JWT)
   - POST /auth/login/mfa { mfaToken, code } → verifies, returns access+refresh tokens

5. Force enforcement: for users with roles 'admin', 'hse', 'gm', if mfaEnabled=false, return 403 with code mfa_setup_required on any protected route until they set up MFA.

Acceptance: admin user can complete the setup → next login asks for code → wrong code rejected → correct code returns tokens.
```

---

# P4 — Hardening

Don't ship to pilot without these.

## P4.1 — Integration test suite

**Why:** Zero tests today. Plan calls for tests on every safety flow. Without these, every P0-P3 fix risks silent regression.

**Prompt for Claude Code:**

```
Build the integration test foundation.

1. Setup:
   - tests/setup.ts: spins up test Postgres + Redis via testcontainers OR uses docker-compose.test.yml
   - tests/helpers/db.ts: truncate-all-tables between tests
   - tests/helpers/auth.ts: create test users with roles, return signed JWT tokens
   - tests/helpers/seed.ts: minimal seed for each test (org, project, 1 vehicle, 1 driver, 1 device, valid docs)

2. Critical-path tests to add (one file per concern):
   - tests/integration/auth.test.ts — login/refresh/logout, MFA required, RBAC denial
   - tests/integration/gates.test.ts — each of the 6 gates: PASS case, BLOCK case, REVIEW case
   - tests/integration/gate-bypass.test.ts — direct POST /journeys/:id/submit with no_go vehicle → 422 GateError
   - tests/integration/status-transitions.test.ts — invalid transition rejected by DB trigger
   - tests/integration/expiry.test.ts — doc expires → vehicle.status flips to expired_documents
   - tests/integration/panic.test.ts — publish MQTT panic message → incident row created, playbook steps inserted, vehicle.status=hse_hold, notification queued
   - tests/integration/audit.test.ts — every mutation produces an audit_log row with user, action, entity
   - tests/integration/multi-tenant.test.ts — user from org A cannot read/write entities in org B

3. Configure CI in .github/workflows/test.yml: run pnpm test on push, fail PR if any test fails.

4. Coverage target: 80%+ on src/modules/journey, src/modules/auth, src/modules/hse, src/shared/middleware.

Acceptance: pnpm test passes all listed tests. CI green.
```

---

## P4.2 — Load test

**Prompt for Claude Code:**

```
Set up k6 load tests.

1. Install k6 (instructions to user, not pnpm)
2. Create tests/load/telemetry.k6.ts that simulates 264 vehicles each publishing telemetry every 10 seconds over MQTT for 10 minutes. Target: zero dropped messages, p99 pipeline latency < 100ms.
3. Create tests/load/api.k6.ts that simulates 50 concurrent users hitting /journeys, /fleet/live, /events at 5 RPS each for 10 minutes. Target: p99 < 500ms, zero 5xx.
4. Document run instructions in tests/load/README.md.

This task does not require code execution — produce scripts and a runbook only.
```

---

## P4.3 — Monitoring & observability

**Prompt for Claude Code:**

```
Add basic monitoring without external dependencies.

1. /metrics endpoint exposing Prometheus-style metrics:
   - http_requests_total (by method, route, status)
   - http_request_duration_seconds (histogram)
   - mqtt_messages_received_total
   - journey_gate_failures_total (by gate)
   - notification_delivery_total (by channel, status)
   - queue_depth (BullMQ — per queue)
   - active_websocket_connections

2. Use prom-client package. Auth-protect /metrics with a basic-auth env-configured username/password.

3. Pino log enrichment: include orgId, userId, requestId on every log line within request scope.

4. Add health-check expansion: /health/deep that runs a 1-row query on every critical table to confirm DB integrity.

Acceptance: curl /metrics returns Prometheus exposition format. Grafana can scrape it.
```

---

## P4.4 — Backup & retention

**Prompt for Claude Code:**

```
Add data lifecycle controls.

1. Document backup procedure in docs/runbooks/backup.md:
   - pg_dump cron (daily) → MinIO bucket
   - MinIO bucket replication or off-site rsync
   - Redis: AOF persistence already on (verify)
   - Test restore procedure quarterly

2. Implement retention policies in BullMQ daily-cron worker:
   - telemetry_logs: keep 13 months, then archive to cold storage parquet (postpone if no cold-storage decision yet — note as TODO)
   - audit_logs: keep 7 years (regulatory) — no auto-delete
   - events: keep 24 months hot, then archive
   - notifications: keep 90 days
   - report_jobs: keep file 1 year, metadata forever

3. Add to admin module:
   - GET /admin/system/retention — current sizes per table
   - GET /admin/system/audit-integrity — verify audit log chain (if hash chaining is added later)

4. Soft-delete behavior verification: all entities with deletedAt should NOT be returned in default queries. Run an audit query in the test suite confirming this.
```

---

# Summary Table

| Phase | Task | Effort | Risk if not done |
|-------|------|--------|------------------|
| P0.1 | Panic → incident wire | 1h | Panic button useless |
| P0.2 | Rate limiter | 30m | DoS / brute force |
| P0.3 | EXIF stripping | 1h | Location leak from photos |
| P0.4 | DB transition constraints | 2h | Status bypass possible |
| P0.5 | Boarding validation | 2h | Anyone "valid" — manifest meaningless |
| P1.1 | Risk score | 3h | HSE skipped on high-risk journeys |
| P1.2 | Geofence + route deviation | 6h | Red-zone entry undetected, no deviation alerts |
| P1.3 | Approval chain wiring | 3h | Journeys stuck after submit |
| P1.4 | Vehicle status enum | 2h | Failure modes unrepresentable |
| P1.5 | Configurable checklists | 4h | Can't customize per project |
| P1.6 | NFC card history | 2h | No card audit trail |
| P1.7 | Conditional release auto-revert | 2h | Temporary clearance becomes permanent |
| P2.1 | Job Plan Execution | 8h | Spec module missing |
| P2.2 | Loading/Unloading segments | 8h | Spec module missing |
| P2.3 | Inspection Campaigns | 10h | Spec module missing |
| P2.4 | Pooling engine | 4h | Manual pool creation only |
| P3.1 | Notification channels | 6h | Alerts in-app only |
| P3.2 | PDF reports | 8h | No exportable compliance evidence |
| P3.3 | CSV exports | 3h | No raw data export |
| P3.4 | Scheduled reports | 4h | No automated reporting |
| P3.5 | Workflow executor | 12h | Admin config does nothing |
| P3.6 | MFA / TOTP | 4h | Spec compliance gap |
| P4.1 | Integration tests | 12h | Future regressions silent |
| P4.2 | Load tests | 4h | Performance unknown |
| P4.3 | Monitoring | 4h | Issues invisible in prod |
| P4.4 | Backup & retention | 4h | Data loss / compliance gap |

**Total estimated effort:** ~130 hours of focused Claude Code work + parallel review. Roughly 3-4 weeks if dedicated, longer with context switching.

---

# Working Protocol

For each task above:
1. Manager (you) gives the prompt to Claude Code.
2. Claude Code executes, commits with a clear message, reports back.
3. Manager pastes CC's summary or relevant code diffs into this chat.
4. I review the diff and the acceptance check, flag issues, approve or request changes.
5. Move to next task only when current is verified.

For changes from WhatsApp / client conversations:
- Capture them in a separate file `docs/changes/YYYY-MM-DD-from-client.md` first
- Categorize: P0 emergency / P1 reprioritize / P2 add-to-backlog
- Insert into this plan with a clear marker `[CLIENT-DD-MM]`

---

**End of document.**
