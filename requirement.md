# Fleetops — Journey Management & Fleet Monitoring System

## Complete Requirements Document

Production-grade oil & gas fleet operations platform — digital control tower linking vehicle, driver, journey plan, job plan, passengers, maintenance, tires, documents, IVMS data, and HSE approvals.

| Field | Value |
|-------|-------|
| Prepared for | AR Technology |
| Version | 2.0 (merged functional spec + design handoff) |
| Functional spec date | 09 May 2026 |
| Design handoff date | 13 May 2026 |
| Status | Full production scope — NOT an MVP |
| Design fidelity | High-fidelity (pixel-final) HTML/React prototypes |
| Source files | `design_handoff_fleetops/` folder |

---

## Table of Contents

1. [Executive Summary & Core Rules](#1-executive-summary--core-rules)
2. [Design Principles](#2-design-principles)
3. [System Overview & Architecture](#3-system-overview--architecture)
4. [User Roles & Access Control](#4-user-roles--access-control)
5. [Personas & Surfaces](#5-personas--surfaces)
6. [Core Functional Modules](#6-core-functional-modules)
7. [Detailed Workflows](#7-detailed-workflows)
8. [Screen Specifications — All 16 Screens](#8-screen-specifications--all-16-screens)
9. [Design System & Tokens](#9-design-system--tokens)
10. [Component Primitives](#10-component-primitives)
11. [Maps & Geo](#11-maps--geo)
12. [Interactions & Behavior](#12-interactions--behavior)
13. [State Management](#13-state-management)
14. [Theming — Mood, Palette, Map Style](#14-theming--mood-palette-map-style)
15. [Responsive Behavior & RTL](#15-responsive-behavior--rtl)
16. [Data Model](#16-data-model)
17. [Hardware & IoT Integration](#17-hardware--iot-integration)
18. [API & Integration Requirements](#18-api--integration-requirements)
19. [Reporting Requirements](#19-reporting-requirements)
20. [Notifications & Escalations](#20-notifications--escalations)
21. [Cybersecurity & Audit](#21-cybersecurity--audit)
22. [Non-Functional Requirements](#22-non-functional-requirements)
23. [Assets & Fonts](#23-assets--fonts)
24. [Implementation Order](#24-implementation-order)
25. [Acceptance Criteria](#25-acceptance-criteria)
26. [Open Questions](#26-open-questions)

---

## 1. Executive Summary & Core Rules

This document defines the complete scope for an integrated Journey Management, Fleet Monitoring, IVMS, Maintenance Control, Driver Identification, Passenger Headcount, and HSE Compliance system.

The target platform provides **one digital control tower** where the vehicle, driver, journey plan, job plan, passengers, maintenance status, tires, documents, IVMS data, and HSE approvals are linked before and during vehicle movement.

### The Non-Negotiable Core Rule

> **A journey cannot start unless the driver is authorized, the vehicle is technically fit, documents are valid, headcount is confirmed, and the journey is approved. Maintenance and HSE users release, block, or conditionally approve vehicles using a Go / No-Go workflow.**

This rule is the system's "physics." The entire UI is shaped to enforce it:
- Every screen surfaces the current Go/No-Go state
- Gates are explicit and named
- Overrides go through documented audit-logged workflows
- The Submit button on the Journey Composer is disabled until all blocking gates pass (`opacity: 0.55, cursor: not-allowed`)
- **No override is possible without the audit-logged HSE workflow path**

### Includes

- **Passenger Logistics App** extension for employee pickup/drop requests, planner request pooling, vehicle/driver assignment, live trip progress, driver trip visibility, passenger validation, inspection campaigns, loading/unloading records, and analytics.

---

## 2. Design Principles

| Principle | Description |
|-----------|-------------|
| Safety first | A vehicle marked No-Go, expired, unsafe, or non-compliant must not be assignable to an approved journey. |
| Modular architecture | Built in modules so fleet, journey, maintenance, HSE, documents, reporting, and integrations can evolve independently. |
| Driver-vehicle-journey linkage | Every trip must be linked to a verified driver, vehicle, journey plan, passenger record, and job execution record. |
| Auditability | Every important action must be timestamped and attributed to a user, device, or system event. |
| Oman hosting readiness | Support cloud, local Oman cloud, or on-premise deployment. |
| Configurable workflow | Approvals, checklists, escalation times, required fields, and report templates must be configurable by admin users. |

---

## 3. System Overview & Architecture

The system includes web dashboards, mobile applications, IoT/IVMS device ingestion, role-based workflows, and reporting. This is a **multi-module enterprise platform**, not a simple GPS tracking tool.

| Layer | Main Components |
|-------|----------------|
| Vehicle / Edge Layer | IVMS/GPS tracker, NFC/RFID driver reader, CAN/J1939/OBD integration, ignition input/relay, panic button, passenger counter, camera/MDVR optional, driver mobile app. |
| Connectivity Layer | 4G/5G SIM, private APN where required, MQTT/HTTPS/WebSocket, secure device authentication, offline buffering. |
| Platform Layer | Journey management, fleet tracking, maintenance control, HSE workflows, parts/tires, documents, reports, notifications, APIs. |
| User Layer | Driver, Journey Manager, Maintenance, HSE, General Manager, Storekeeper, Admin, Client/Contractor viewer. |

### Backend Expectations

- **Hardware-agnostic IVMS ingestion layer** (MQTT + HTTPS webhooks) with normalized event model and per-device adapters.
- **Role-based access control** at UI, API, and workflow-engine layers; admin/HSE/GM roles require MFA.
- **Strict audit log** for every status change, approval, override, export. Soft-delete with retention; no hard delete of safety records.
- **Multi-tenant** structure: company -> contractor -> project -> site -> camp.
- **REST API + webhooks**, versioned `/api/v1/`, OpenAPI documented.
- **Offline-first driver app** — pre-trip checklist, photos, defect reports must capture offline and sync on reconnect.
- **i18n** — English first, Arabic-ready (RTL) for UI and reports.
- **Hosting** — must support SaaS, Oman local cloud, and on-premise.

---

## 4. User Roles & Access Control

Role-based access control enforced across UI, API, workflow engine, reports, and data exports. Users only see and approve records matching their authority level.

| Role | Allowed Actions | Restricted Actions |
|------|----------------|-------------------|
| **Driver** | View assigned journeys, complete pre-trip checklist, tap NFC, confirm passengers, report defects, upload photos, raise SOS/breakdown. | Cannot approve journey, release vehicle, edit maintenance status, or override HSE hold. |
| **Journey Manager / Dispatcher** | Create journeys, assign approved vehicles/drivers, monitor route execution, close journeys, handle delays and deviations. | Cannot assign No-Go vehicles or override HSE/Maintenance blocks without formal authorization. |
| **Maintenance Team** | Open work orders, add maintenance photos, update service records, replace parts/tires, recommend or set Go/No-Go based on policy. | Cannot approve high-risk HSE release if workflow requires HSE approval. |
| **HSE Team** | Audit journeys, block unsafe vehicles, review incidents, approve conditional releases, monitor IVMS compliance, review headcount and safety reports. | Cannot alter financial records or inventory values unless explicitly granted. |
| **General Manager / Operations Manager** | View fleet KPIs, approve exceptions, review utilization/downtime/compliance, approve major operational overrides. | Should not bypass mandatory HSE/legal controls without audit trail. |
| **Storekeeper / Procurement** | Manage spare parts, issue parts to work orders, upload invoices, monitor stock levels. | Cannot release vehicle unless granted maintenance authority. |
| **System Administrator** | Manage users, permissions, configuration, integrations, templates, master data, and audit settings. | Should not delete audit logs or safety records. |
| **Logistics Planner** | Pool passenger requests, group by route/shift, assign vehicle/driver, convert to journey plan. | Cannot override HSE/maintenance blocks. |
| **Passenger / Employee** | Submit pickup/drop requests, track trip, view ETA, provide feedback. | Cannot access fleet management, maintenance, or HSE functions. |

---

## 5. Personas & Surfaces

| Surface | Role(s) | Form Factor | Design Reference |
|---------|---------|-------------|-----------------|
| **Control Tower** | Journey Manager / Dispatcher | Desktop web (1280x820+) | `control-tower-map.jsx`, `control-tower-journey.jsx` |
| **Driver App** | Driver | iOS/Android phone (390x844) | `driver-app.jsx` |
| **Passenger App** | Employee / contractor passenger | iOS/Android phone (390x844) | `passenger-app.jsx` |
| **Logistics Planner Hub** | Logistics Planner | Desktop web | `ops-consoles.jsx` (PlannerHub) |
| **Maintenance Workshop** | Maintenance team, Storekeeper | Desktop web | `ops-consoles.jsx` (MaintWorkshop) |
| **Maintenance Work Order** | Maintenance team | Desktop web | `ops-consoles.jsx` (MaintWorkOrder) |
| **HSE Console** | HSE officer | Desktop web | `ops-consoles.jsx` (HSEConsole) |
| **GM/Ops Dashboard** | GM / Operations Manager | Desktop web | `ops-consoles-2.jsx` (GMDashboard) |
| **Vehicle Master** | All ops roles (read-mostly) | Desktop web | `ops-consoles-2.jsx` (VehicleProfile) |
| **Admin Config** | System Administrator | Desktop web | `ops-consoles-2.jsx` (AdminConfig) |

---

## 6. Core Functional Modules

### 6.1 User, Role & Organization Module

- Multi-tenant structure for company, contractor, department, project, and site.
- Role-based permissions for driver, journey manager, maintenance, HSE, GM/Ops, storekeeper, admin, logistics planner, passenger, and read-only viewer.
- User status, account lock, MFA support for admin/manager roles, and user audit log.
- Organization hierarchy: business unit, project, base, camp, workshop, and site.

### 6.2 Vehicle Master File Module

- Create full vehicle profile by plate number, fleet number, VIN/chassis number, engine number, make, model, year, type, owner, project, and base location.
- Current status enum: `Available`, `Conditional Release`, `Under Maintenance`, `No-Go`, `Expired Documents`, `IVMS Fault`, `HSE Hold`, `Decommissioned`.
- Attach documents: registration/Mulkia, insurance, RAS/inspection certificate, site permit, photos, and device installation records.
- Track odometer, engine hours, IVMS device ID, SIM number, APN, camera/MDVR ID, NFC reader ID, and passenger counter ID.
- Vehicle profile page (Screen 15) has: photo gallery, identity card, live telemetry, 9-tab interface (Overview, Documents, Maintenance, Tires, Parts, Journeys, Events, Devices, Audit), 4-up health summary cards, documents table, maintenance history, tire axle-position diagram.

### 6.3 Driver Management & NFC Authentication Module

- Create driver profile with name, ID, license class, defensive driving certificate, medical/fitness status, authorized vehicle types, and active/inactive status.
- Assign NFC/RFID card or iButton to each driver and maintain card issue/revoke history.
- Vehicle must request driver identification by NFC before or immediately after ignition.
- Unauthorized driver attempts must trigger alerts and be recorded as events.
- Each trip must automatically attach the driver name, ID, card number, vehicle, timestamp, and location.
- NFC screen (Screen 06): full-bleed dark immersive screen with animated pulse rings (3 concentric, 2.4s ease-out infinite, staggered 0.6s), NFC card visualization showing driver name + UID, listening state with blinking dot (1.2s), state transitions (Listening -> Detected -> Authenticated), manual override always available but audit-logged.

### 6.4 Journey Management Module

- Create, submit, approve, monitor, and close journey plans.
- Required fields: journey ID, vehicle, driver, passengers, start location, destination, route, waypoints, job purpose, planned departure/arrival, risk level, emergency contact, journey manager, and approval status.
- System must validate vehicle readiness, driver validity, documents, maintenance status, IVMS status, NFC status, headcount, and route risk before approval.
- Journey states: `Draft`, `Pending Approval`, `Approved`, `Active`, `Delayed`, `Deviated`, `Completed`, `Closed`, `Rejected`, `Cancelled`, `Emergency`.
- **Journey Composer (Screen 02) — the central interaction**: 4-step wizard (Plan -> Resources -> Validate -> Submit) with 6 validation gates. Submit button disabled until all blocking gates pass.

#### The Six Go/No-Go Gates

Each gate is a collapsible panel with header showing GO/REVIEW/BLOCK pill and count of failed checks:

1. **Driver Authorization** — license, DDC cert, medical, authorized vehicle types, NFC card
2. **Vehicle Readiness** — maintenance status, tires, IVMS device, NFC reader, panic button
3. **Documents & Permits** — Mulkia, insurance, RAS, site permit, fire extinguisher, first aid
4. **Route & Risk** — approved roads, daylight window, weather, refuel, comms coverage
5. **Passengers & Headcount** — manifest count, capacity, eligibility, boarding method
6. **HSE Approval** — risk level, last incident, fatigue, HSE officer assigned

Gate validation runs on every field change. Gates re-evaluate live. Summary banner shows: "Cannot submit yet — X blocking items, Y review items -- Z / 6 gates cleared."

### 6.5 Job Plan Execution Module

- Attach each journey to a work order or job plan where required.
- Job status: `Assigned`, `En Route`, `Arrived`, `In Progress`, `Completed`, `Delayed`, `Failed`, `Cancelled`.
- GPS-based check-in/out at waypoints and destination.
- Proof of arrival/completion: photos, QR, NFC, digital signature, supervisor approval, or geofence confirmation.
- Digital forms and checklists by job type.

### 6.6 IVMS / Fleet Tracking Module

- Live GPS location, speed, ignition, route, geofence, trip distance, idle time, engine hours, harsh braking, harsh acceleration, and movement history.
- Link IVMS trip data to driver, vehicle, journey plan, and job plan.
- Event-based alerts: overspeed, harsh driving, panic, tamper, device offline, GPS loss, route deviation, delayed arrival, unauthorized movement, and night driving violation.
- History replay and export by vehicle, driver, journey, date range, and project.
- Live fleet map (Screen 01) shows all vehicles with real-time WebSocket feed, event stream, KPI strip.

### 6.7 Passenger / Headcount Module

- Maintain passenger manifest for each journey.
- Support passenger NFC/RFID check-in where required.
- Support automatic passenger count for buses/vans using door counter, cabin camera, or seat occupancy sensors.
- Alert if actual headcount does not match approved passenger list or maximum capacity.
- Log passenger count at start, waypoints, destination, and journey closure.
- 4 boarding validation methods: NFC card, QR code, employee ID entry, manual supervisor confirmation. Configurable per route.

### 6.7A Passenger Logistics Mobile App Module

Oil & gas-grade module. Functional requirements:

- Employee/passenger users request pickup and drop services between approved company locations.
- Requests pooled into central planner hub — grouped by route, shift timing, destination, vehicle capacity, eligibility, and priority.
- Planner assigns approved vehicle, driver, route, pickup/drop sequence, journey plan, and passenger manifest.
- Passengers see: request status, approval/rejection reason, vehicle details, driver name (where permitted), pickup location, ETA, trip progress, delay alerts, closure status.
- Drivers see: allocated trips, passenger pickup/drop list, route sequence, check-in/out actions, boarding validation, trip closure.
- Boarding validation: QR code, NFC/RFID card, employee ID, or manual supervisor confirmation.
- Actual boarding count reconciled with manifest and vehicle capacity before journey start and at closure.
- Loading/unloading activities recorded per journey segment where material logistics enabled.
- Vehicle inspectors complete routine inspections; workshops and HSE schedule focused inspection campaigns.
- Analytics: request demand, approval rate, vehicle utilization, route performance, delays, no-shows, trip scores, inspection findings, service quality.

| Sub-Module | Minimum Functional Requirement |
|------------|-------------------------------|
| Passenger / Employee App | Pickup/drop request, entitlement check, request status, live trip progress, ETA, notifications, cancellation, feedback. |
| Logistics Planner Hub | Request pooling, grouping, route planning, capacity validation, vehicle/driver assignment, approval/rejection, exception handling. |
| Driver App | Allocated journeys, passenger list, route sequence, boarding validation, trip start, arrivals, trip closure, driver trip score view. |
| Passenger Validation | QR/NFC/employee ID/manual validation, headcount reconciliation, capacity control, no-show logging, manifest audit. |
| Material Logistics Add-on | Segment-based loading/unloading record, loading clerk role, quantity/photo/signature evidence, journey segment closure. |
| Inspection Campaigns | Routine inspections by vehicle inspectors and time-bound focused campaigns scheduled by central workshop or HSE. |
| Analytics | Demand trends, utilization, delay reasons, no-shows, trip fulfilment, route performance, inspection findings, HSE compliance. |

### 6.8 Maintenance, Service & Vehicle Release Module

- Manage: preventive maintenance, major/minor service, corrective maintenance, breakdowns, accident repair, tire replacement, battery replacement, IVMS/camera/NFC repair, and license renewal tasks.
- Maintenance reports with before/after photos, odometer/engine hours, fault description, technician, parts replaced, approval status.
- Apply **Go / No-Go / Conditional Release** decision to each vehicle.
- Automatically block journey assignment for No-Go, Under Maintenance, Expired Documents, IVMS Fault, NFC Fault, or HSE Hold status.
- Authorized override only through documented workflow with reason, expiry time, approving user, and audit log.
- Workshop kanban (Screen 11): 5-column board (Inbound queue, In bay, Awaiting parts, HSE review, Ready for release) with KPI strip (NO-GO, IN BAY, MTTR, PARTS DUE, PM COMPLIANCE).
- Work order release (Screen 12): three explicit radio-card options (GO full release, CONDITIONAL with expiry, NO-GO with reason), HSE co-sign toggle, before/after photo evidence strip, parts replaced table, activity timeline.

### 6.9 Spare Parts & Replacement History Module

- Track: part number, part name, OEM/aftermarket, supplier, warranty period, quantity, replacement date, linked vehicle, linked work order, technician, old/new photos, cost field (optional/configurable).
- Stock issue against work order and return/disposal record for old parts.
- Replacement history by vehicle VIN, plate number, and fleet number.

### 6.10 Tire Management Module

- Track: tire serial number, brand, model, size, installation date, axle position, odometer at installation, tread depth, pressure, damage photos, rotation history, repair, replacement, disposal reason.
- Reports: tire condition, tire age, tire mileage, replacement frequency, unsafe tire, tire cost-per-km (where cost data enabled).
- Critical tire defect triggers No-Go or Conditional Release status based on policy.
- Vehicle profile includes SVG axle-position diagram showing P1/P2/P3/P4 with tread depth values, averages, and next rotation suggestion.

### 6.11 Licensing, Renewal & Document Control Module

- Track: Mulkia/registration, insurance, inspection/RAS, site permits, IVMS calibration, fire extinguisher expiry, first aid kit expiry, driver license, defensive driving certificate.
- Reminders at configurable periods: 90/60/30/7 days before expiry.
- Expired critical documents automatically place vehicle or driver in blocked status until renewed.
- Documents table shows: document name, reference number, issued date, expiry date, reminder schedule, status pill (VALID/EXPIRES Xd/EXPIRED), file link.

### 6.12 CCTV / Dashcam / Evidence Module

- Optional integration with dashcam, cabin camera, MDVR/NVR, or 360-degree camera systems.
- Event-triggered video/photo attachment for harsh braking, collision, panic, accident, or maintenance evidence.
- Cabin camera access follows privacy policy and user permissions.

### 6.13 Reporting & Analytics Module

- Dashboards: fleet readiness, active journeys, delayed journeys, No-Go vehicles, open defects, driver score, service compliance, document expiry, tire condition, passenger headcount, HSE violations.
- Export: PDF, Excel/CSV, and API format.
- Scheduled daily, weekly, and monthly email reports.

---

## 7. Detailed Workflows

### 7.1 Journey Workflow

1. Journey Manager creates journey plan — selects vehicle, driver, route, job, passengers.
2. System validates driver, vehicle, documents, maintenance release status, IVMS/NFC status, route risk, headcount.
3. If validation passes -> submit for approval. If fails -> display blocking reasons.
4. Approver approves or rejects. High-risk journeys may require HSE approval.
5. Driver completes pre-trip checklist and taps NFC/RFID card.
6. Passenger/headcount confirmed manually or automatically.
7. Vehicle movement monitored live until destination and closure.
8. System generates journey close-out report, exceptions, and compliance metrics.

### 7.1A Passenger Request to Journey Fulfilment Workflow

1. Passenger/employee submits pickup/drop request from mobile app.
2. System validates user eligibility, department/project, date/time, route availability.
3. Request enters central logistics planner hub — pooled with similar requests by route, shift, destination, camp, project, or pickup window.
4. Planner groups requests, validates vehicle capacity, selects approved vehicle and authorized driver, creates/links journey plan.
5. Passenger receives status notifications: approved/rejected/pending, vehicle/driver details, pickup time, pickup point, ETA, live trip progress.
6. Driver receives allocated trip and passenger manifest, performs pre-trip checklist and NFC authentication.
7. Boarding validated by QR/NFC/employee ID/manual approval; actual count reconciled with manifest and capacity.
8. During trip: platform monitors route, ETA, delays, deviations, IVMS events, passenger count, waypoint arrival/departure.
9. At closure: records completion, missed passengers/no-shows, trip score, driver score, passenger feedback, analytics data.

**Exception Scenarios:**

| Exception | Required System Behaviour |
|-----------|--------------------------|
| Request without eligibility | Reject or route to supervisor approval with reason recorded. |
| Vehicle capacity exceeded | Block assignment until planner removes passengers or assigns larger/additional vehicle. |
| Passenger boarded but not on manifest | Generate exception; require supervisor/driver confirmation. |
| Passenger no-show | Record no-show reason/time and continue per policy. |
| Driver starts without passenger validation | Block start or generate HSE/Journey Manager alert based on config. |
| Loading/unloading mismatch | Require correction, photo evidence, or supervisor approval before segment closure. |

### 7.2 Maintenance & Go / No-Go Workflow

1. Fault created by driver, IVMS, maintenance team, HSE, or system scheduler.
2. Work order opened with fault category, priority, photos, odometer, engine hours, GPS location.
3. Maintenance team inspects vehicle — updates work order with findings, photos, replaced parts, labor notes.
4. Vehicle status set to: Available, Conditional Release, Under Maintenance, No-Go, IVMS Fault, Expired Documents, or HSE Hold.
5. Critical safety defects require HSE review before release.
6. Journey assignment engine reads release status — No-Go/blocked vehicles cannot be selected.
7. All decisions and overrides recorded in audit log.

### 7.3 HSE Panic / Emergency Workflow

1. Panic button pressed on vehicle or SOS triggered in driver app.
2. HSE Console (Screen 13) auto-opens with critical banner, pulsing red icon, elapsed timer.
3. Map zooms to incident with approved corridor (dashed blue), actual deviation (solid red), geofence, pulsing marker, nearby resources (HSE vehicle, camp, ambulance).
4. Response playbook activates — 6 ordered steps (Tier 1) with done/active/pending states.
5. Each step has click-to-complete affordance; next auto-becomes active.
6. Steps can be skipped with documented reason (audit).
7. "Escalate to Tier 2" triggers separate notification fan-out (Ops desk, GM, emergency services per policy).

---

## 8. Screen Specifications — All 16 Screens

### Section A: Control Tower (Journey Manager) — Desktop

#### Screen 01 — Live Fleet Map (`CTLiveMap`)
- **Purpose:** Operational nerve center. Dispatcher sees every vehicle's live position, status, and journey at a glance.
- **Layout:** 220px sidebar + main column (52px topbar + KPI strip + main grid). Main grid: large left map panel + 340px right rail (event stream + active journey list).
- **Sidebar (CTSidebar):** Logo, search (Cmd+K), nav sections: Operate (Live fleet map, Journeys [47], Job plans, Passengers [12]), Fleet (Vehicles, Drivers, Maintenance [8], Documents), Safety (HSE console, Events [3]), Insights (Reports, Admin). User card at bottom.
- **Topbar (CTTopbar):** Title, subtitle, LIVE pill ("LIVE . 248 devices online"), notification bell, "New journey" primary button.
- **KPI strip:** 4 panels — ACTIVE 47 (+6 vs yest), GO 218 (of 264 fleet), NO-GO 14 (3 critical), DEFECTS 8 (2 overdue) — each with inline sparkline.
- **Filter tabs above map:** All fleet, Active journeys, No-Go, Geofences, Heat.
- **Map:** Leaflet, centered on [20.0, 56.1] zoom 7, dark CartoDB Dark Matter tiles. Real routes (multi-segment polylines), geofence rectangles, vehicle pins with status-colored glowing dots and popup labels.
- **Event stream (right):** Virtualized list of recent IVMS events with severity color rail (left edge bar): overspeed, idle, waypoint, deviation, harsh braking, journey closed. Timestamp, event type, description, vehicle plate.
- **Active journeys (right):** Card list with journey ID, status pill, destination, vehicle/driver, ETA, progress bar tinted by status.
- **Map legend:** Go (green), Cond (amber), No-Go (red), En route (blue) with 25km scale bar.

#### Screen 02 — Journey Composer / Go-No-Go Gates (`CTJourneyComposer`)
- **Purpose:** The flagship gating screen. User cannot submit until all six gates pass.
- **Layout:** Sidebar + topbar (with breadcrumb and stepper) + body (scrollable gate column + 340px right summary rail).
- **Stepper:** 4 steps (Plan [done], Resources [done], Validate [active], Submit [pending]) with green check/blue number/gray number indicators connected by lines.
- **Submit button:** Primary CTA "Submit for approval" — disabled (opacity 0.55, cursor: not-allowed) until all blocking gates pass. Shield-check icon.
- **Summary banner:** Amber-bordered panel showing blocking count, review count, gates cleared (X/6 display number), clickable list of blocking items.
- **Six gate panels:** Each collapsible with header (icon badge, title, subtitle, PASS/REVIEW/BLOCK pill, chevron). Expanded shows all check rows with status indicators (green check / amber alert / red X), check name, status label, detail text.
- **Right rail — Journey summary:** Route (origin -> destination), distance, duration, risk pill, mini route preview (SVG on terrain bg), departure/ETA/purpose/job plan/risk score/emergency contact details.
- **Right rail — Passengers:** Passenger list with avatar (gradient), name, ID, department, status (REVIEW pill for flagged), pickup point.
- **Right rail — Approver chain:** Timeline pattern with done/active/pending dots connected by vertical lines. Submitter, Journey Mgr review, HSE officer, Final approval — each with name and timestamp.

#### Screen 03 — Active Journey / Live Track (`CTActiveJourney`)
- **Purpose:** Monitor an in-flight journey end-to-end.
- **Layout:** Sidebar + topbar (actions: Contact driver, Share trip, Flag event, Recall journey [danger]) + main split (left map+speed chart, right 360px rail).
- **Map:** Leaflet centered on journey midpoint. Completed segment green, remaining dashed blue. Pulsing vehicle marker with popup showing plate + speed + coords. Site labels at origin/destination.
- **Map HUD buttons:** Replay 10 min, Hide off-route, Show passengers.
- **Telemetry HUD strip (overlaid on map bottom):** 9 tiles — SPEED (87 km/h, blue), LIMIT (100), DISTANCE (102.4 km), REMAINING (40 km), FUEL (64%, green), ENGINE (2,140 rpm), IGNITION (ON, green), NFC (D.AL-BUSAIDI, green), DEVICE (ONLINE, green).
- **Speed & events strip:** SVG sparkline of speed over last 90 min with overspeed limit line (dashed red "LIMIT 100"), event dots (red circle for overspeed). Summary: "1 OVERSPEED . 0 HARSH . 0 DEVIATION".
- **Right rail — Driver card:** Photo placeholder, name, license/DDC info, NFC AUTHENTICATED pill, 3-up stats (SCORE 94, TRIPS 1,247, INCIDENTS 0 . 90d).
- **Right rail — Route timeline:** Waypoint list with done/current/pending states (green/blue/gray dots with vertical connecting lines). Each: timestamp, waypoint name, detail text.
- **Right rail — Passengers boarded:** "4 / 4 MATCH" (green). List with green checks and NFC timestamps.

### Section B: Driver Mobile App — iPhone (390x844)

Light "warm cream" surfaces (#f6f5f1) with charcoal text. Dark status bar.

#### Screen 04 — Today (`DrvToday`)
- **Purpose:** Driver's daily overview with assigned trip and pre-departure tasks.
- **Salutation header:** "Salaam, Daoud" with date (MONDAY . 13 MAY) and avatar.
- **Next trip callout:** Dark card (#0f141b) with blue radial gradient accent. "NEXT TRIP . APPROVED", route (Marmul -> Nimr-2), journey ID, passenger count, distance. READY pill (green). 3-up stats: DEPART 14:30, ETA 16:50, RISK M (amber).
- **Vehicle card:** White card with truck icon (52px), plate (12-A-3471, mono), model (Toyota Hilux DC . 2024 . 47,820 km), bay/base info. Status pills row: MAINT GO, DOCS, IVMS (all green), RAS 18d (amber conditional).
- **Before you depart checklist:** 4 items with checkboxes (22px round) — Complete pre-trip checklist, Tap NFC card at ignition, Confirm passenger boarding, Acknowledge journey plan. Done items struck through, opacity reduced.
- **Primary CTA:** "Start pre-trip" — full-width dark button with arrow icon.
- **Bottom tab bar:** Today, Trips, Checks, Defects, Me — with icon glyphs.

#### Screen 05 — Pre-trip Checklist (`DrvChecklist`)
- **Purpose:** Structured vehicle inspection with photo capture and defect reporting.
- **Navigation:** Back arrow, step indicator (STEP 1 OF 6), close X.
- **Header:** "PRE-TRIP . VEHICLE EXTERIOR" / "Walk-around".
- **Progress:** "8 / 18 COMPLETE" with "1 DEFECT" (red). Progress bar (44%, dark fill).
- **Photo capture grid:** 4-up (Front, L side, R side, Rear) — filled = striped pattern with check, unfilled = dashed border with camera icon. Labels in mono.
- **Checklist items:** White cards with status checkboxes (22px rounded-square, green check/red X/empty). 12 items shown: tires, lights, mirrors, fluid leaks, seatbelts, fire extinguisher (FAIL), first aid, warning triangle, GPS/IVMS, NFC reader, panic button, documents. Pending items show chevron.
- **Defect detail card:** Red-tinted card auto-renders on failure. Shows: alert icon, "Defect logged . Fire extinguisher", description ("Pressure gauge reads below green band"), 2 photo thumbnails, note about Auto Conditional Release and Maintenance notification.
- **Footer CTAs:** Back (outlined) + Continue to Safety equipment (dark, full-width).

#### Screen 06 — NFC Authentication (`DrvNFC`)
- **Purpose:** Driver identity verification via NFC card tap.
- **Full-bleed dark immersive:** Radial gradient background (#1a2530 -> #0a0d12).
- **Header:** "DRIVER AUTHENTICATION" label, "Tap your NFC card" title, instruction text.
- **Centered animation:** 220x220px container with 3 concentric pulse rings (1.5px border, blue 40% opacity, 2.4s ease-out infinite, staggered 0.6s). Inner radial gradient glow. NFC card visualization (140x88px, dark gradient, rounded corners, NFC icon, "FLEETOPS" label, driver name, UID 04:E2:1F:8B).
- **Status:** "LISTENING . 12 SEC" pill with blinking blue dot (1.2s). Reader identifier: "VEH 12-A-3471 . DASH-RDR-04".
- **State transitions:** Listening -> Detected -> Authenticated (green check + welcome message). Failed read -> "Try again . 2 of 3 attempts" -> after 3 fails: manual override request flow.
- **Footer:** "Card unreadable?" warning card with override explanation. "Request manual override" outlined button. All overrides logged and notify HSE.

#### Screen 07 — In-trip Live (`DrvInTrip`)
- **Purpose:** Active trip display with map, speed, and status.
- **Full-bleed map:** Light Leaflet tiles. Completed route green (3.5px), remaining dashed dark. Origin green pin, destination dark pin, vehicle blue pulsing circle (36px, white border, arrow icon).
- **Top floating card:** Glass effect (white 92% opacity, blur 20px, shadow). "NEXT WAYPOINT" label, destination name, distance (40 km), ETA (16:50).
- **Speed badge:** Bottom-left, 72px circle, white with dark border (3px). Speed number (87) + "KM/H" label, mono font.
- **Status stack:** Bottom-right, 3 circular buttons (38px, white) for NFC OK, signal OK, shield OK — all green.
- **Bottom sheet:** White card with rounded top corners (22px), handle bar (36x4px), journey ID, route, "ON ROUTE" green pill. 3-up stats (PASSENGERS 4/4 green, FUEL 64%, TIME LEFT 0:28). CTAs: "Report defect" (outlined) + "SOS" (red, hold-to-activate in production).

### Section C: Passenger App — iPhone (390x844)

#### Screen 08 — Request Pickup (`PaxRequest`)
- **Purpose:** Employee submits transport request with pooling intelligence.
- **Header:** "TUE . 14 MAY . 06:42 LATER" / "Request a trip" with avatar.
- **Trip type segmented control:** One-way (selected, dark) / Round trip / Recurring.
- **From-To card:** Dot+line connector pattern. PICKUP: "Muscat HQ . Building 4 lobby" (Al Khuwair . Way 4302). DROP-OFF: "Marmul Camp . Block C" (PDO Block 6 . approved sites). Footer: route icon + "712 km . ~8h . pooled shuttle eligible".
- **When card:** "SHIFT WINDOW" amber pill. Date/time (Tue 14 May . 06:00), shift window note. Time-window segmented picker: 05:30, 06:00 (selected), 06:30, 07:00.
- **Eligibility check banner (green):** Green check circle + "You're eligible for this route" + "PDO clearance valid . roster active . day-shift OK".
- **Poolable with card:** "3 nearby requests . same shift", "SAVE 18 min" blue pill. 3 employee cards with avatars, names, times, destinations.
- **Notes textarea:** "NOTES TO PLANNER . OPTIONAL" with placeholder.
- **Submit footer:** "Submit request" dark button (52px, full-width, rounded 14px). Subtext: "GOES TO MUSCAT LOGISTICS PLANNER . SLA 30 min".

#### Screen 09 — My Trip Live (`PaxLive`)
- **Purpose:** Passenger tracks assigned shuttle in real-time.
- **Full-bleed map:** Leaflet (Muscat region, zoom 12). Completed route green, remaining dashed dark. Vehicle marker: white circle with truck icon (44px, dark border).
- **Top pills:** "My trip" back pill (white, glass). "Share ETA" button.
- **Bottom card:** White card, rounded top (22px), handle bar. Status: "SHUTTLE IS ON THE WAY" + "ON TIME" green pill. "4 min away" (28px mono bold). "Picking up at Muscat HQ . Building 4 lobby".
- **Driver card:** Photo placeholder, driver name, rating (4.92 . 3 trips), vehicle (Toyota Coaster . 14 seats), plate (34-D-1129), phone call button (dark circle).
- **Stops timeline:** 4 stops with done/pending dots connected by lines. Muscat HQ (06:00, next, "you + 1 board"), Athaibah camp (06:14, pending, "2 board"), Bidbid PIT (07:35, pending, "1 board"), Marmul gate (13:45, pending, "drop . destination").
- **Tab bar:** Home, My trips, Inbox, Me.

### Section D: Specialist Consoles — Desktop

All use `OpsShell` — shared chrome with sidebar + topbar + body. Sidebar adapts per role prop with role-specific nav items and colored role badge.

#### Screen 10 — Logistics Planner Hub (`PlannerHub`)
- **Purpose:** Pool individual passenger requests by route/shift/time/capacity, then assign vehicle + driver.
- **Filter pills:** Pending 24 (amber), Pooled 6 (blue), Assigned 11 (green), Closed today 47 (neutral).
- **Main table:** Checkbox, request ID, passenger (avatar + dept), From->To, Window, SLA, Priority columns. Rows with request data, SLA countdown (amber/red when overdue).
- **Right composer panel (380px):** "Building pool — 4 / 14 seats filled . Coaster" with progress bar (29%), mini route preview, suggested vehicle card (with capacity/fuel/score), driver card (with score/DDC/trips), "Convert to journey plan" primary CTA.

#### Screen 11 — Maintenance Workshop (`MaintWorkshop`)
- **Purpose:** Workshop bay kanban — see the queue, what's in bay, what's blocked.
- **KPI strip:** NO-GO 14 (red), IN BAY 2 (blue), MTTR 3.4h (neutral), PARTS DUE 5 (amber), PM COMPLIANCE 94% (green).
- **5-column kanban:** Inbound queue, In bay, Awaiting parts, HSE review, Ready for release.
- **Work-order cards:** WO number, priority pill (HIGH/MEDIUM/LOW), plate, age ("2h ago"), fault description, optional photos, optional parts ETA, optional technician + bay, optional GO/CONDITIONAL release decision.

#### Screen 12 — Work Order / Go-No-Go Release (`MaintWorkOrder`)
- **Purpose:** The maintenance-side Go/No-Go decision — the other half of the journey gate physics.
- **Hero summary:** Status pill, opener name, title, body description, timer (00:45 elapsed . target 1H).
- **Photo evidence strip:** 4 thumbnails labeled BEFORE gauge / BEFORE seal / AFTER gauge / AFTER installed.
- **Parts replaced table:** Part no., qty, supplier, warranty, old-part disposal flag.
- **Activity timeline:** Every action attributed to a user with timestamp. Steps with done/active/pending states.
- **Right rail — Release decision (340px):** Three explicit radio-card options (no default — user must consciously pick):
  - GO . full release (green)
  - CONDITIONAL release (amber) — requires expiry date/time picker
  - NO-GO . keep blocked (red) — requires reason
  - Reason/note text area
  - HSE co-sign toggle: Auto / Required / Skipped
  - Primary CTA: "Apply GO . request HSE co-sign" with audit notice
- **Conditional release:** Until expiry, vehicle auto-restricted to certain journey types (config'd in Admin).
- **HSE co-sign:** When "Required" is picked, WO moves to "HSE review" kanban lane; doesn't release until HSE approves.

#### Screen 13 — HSE Console / Panic Event (`HSEConsole`)
- **Purpose:** Tier-1 emergency response surface. Activated on panic button press.
- **Critical banner (top):** Pulsing red panic icon (1.4s ease-in-out) + "ACTIVE EMERGENCY . TIER 1 . 4 MIN 18 SEC ELAPSED" + driver/vehicle/situation summary + "Next action: Verify driver safety call".
- **Map:** Zoomed to incident ([22.68, 56.82] zoom 12). Approved corridor dashed blue, actual deviation solid red, geofence circle, pulsing red marker with detailed popup. Nearby resources labeled (HSE veh, Camp 12, Ambulance).
- **HUD strip at map bottom:** SPEED, ENGINE, DOOR, FUEL, SIGNAL.
- **Right rail — Driver & journey card:** Call button prominent.
- **Right rail — Response playbook (Tier 1):** 6 ordered steps with done/active/pending states. State machine: click-to-complete per step, auto-advance to next. Skip requires documented reason (audit).
- **Right rail — Last 5 IVMS events.**
- **Auto-opens** on panic event ingestion (drops in front of any other screen with toast + acoustic cue).
- **"Escalate to Tier 2"** triggers separate notification fan-out.

#### Screen 14 — GM/Ops KPI Dashboard (`GMDashboard`)
- **Purpose:** Monthly board view for GM / Operations Manager.
- **Header:** Title "GM Operations . monthly board view", month picker (May 2026), Export PDF, Share to BI buttons.
- **6-up KPI grid:** Fleet utilization (72%), Journey on-time (94.1%), No-Go rate (5.3%), Incidents 30d (3, TRIR 0.14), Driver score avg (88.4/100), Cost OMR/km (0.146) — each with delta, sparkline, trend color.
- **Mid row — Fleet readiness:** 264 vehicles broken down by status (Go 218, Conditional 16, Under maintenance 8, No-Go critical 3, Expired docs 5, IVMS/NFC fault 6, HSE hold 4, Decommissioned 4) with horizontal bar percentages.
- **Mid row — Journeys last 30 days:** Stacked bar chart (30 bars, approved green/delayed amber/deviated red).
- **Mid row — Top operational risks:** List of 6 risks with severity rail (red/amber) and counts (RAS renewals 12 vehicles, DDC expiring 7 drivers, Tire age >5yr 14 units, IVMS offline 3 vehicles, Insurance renewals 4 vehicles, Speeding pattern 8 events/7d).
- **Bottom — By project/site table:** Marmul base, Nimr-2, Fahud, Bahja, Saih Rawl, Workshop pool — columns: Vehicles, Journeys, On-time %, Driver score, Incidents, No-Go rate, Cost/km.

#### Screen 15 — Vehicle Master Profile (`VehicleProfile`)
- **Purpose:** Full record for a single vehicle. The "source of truth" page.
- **Header:** Plate + model in title, VIN/Fleet ID/Owner/Project in subtitle. Actions: Export profile, Upload doc, Open work order.
- **Left rail (280px):**
  - Photo + 4 thumbnails
  - Current status with "Change" button (CONDITIONAL . 12d)
  - Identity card: Plate, VIN, Engine no., Make, Model, Year, Type, Owner, Project, Base
  - Telemetry live card: Odometer, Engine hrs, Last seen, Position, IVMS device, SIM, NFC reader
- **Right area — Tab bar:** Overview (active), Documents (3), Maintenance (8), Tires, Parts, Journeys, Events (12), Devices, Audit — with badge counts. Tabbed lazy-loading.
- **4-up health summary cards:** MAINTENANCE GO, DOCUMENTS 6/6 (COND - RAS expires), TIRES GO, IVMS/NFC ONLINE.
- **Documents table:** Mulkia, Insurance, RAS (EXPIRES 18D amber), Site permit, Fire extinguisher, First aid — with reference no., dates, reminder schedule, status pills, file links.
- **Recent maintenance table:** Last 5 WOs with date, WO number, type, technician, result pill.
- **Tires card:** SVG axle-position diagram (P1 6.2mm GO, P2 5.8mm GO, P3 4.4mm COND, P4 6.0mm GO). Stats: AVG TREAD 5.6mm, OLDEST 14mo, NEXT ROT P3->P1.

#### Screen 16 — Admin Workflow Config (`AdminConfig`)
- **Purpose:** Admin builds the rules of the system here.
- **Left rail — Workflow list:** Journey approval (v2.3, selected), Vehicle release (v1.7), Document renewal (v3.1), Driver onboarding (v1.4), HSE incident (v2.0), Passenger request (v1.2), Inspection campaign (v1.0 BETA), Tire replacement (v1.5). Each with version stamp. Selected item has blue left border.
- **Flow canvas:** Node-graph editor with dot-grid background. Toolbar: Trigger, Gate, Approval, Notification, Action, Branch, Wait. 7 nodes connected by arrows with PASS/FAIL/branch-condition labels. Nodes: Trigger (Journey submitted), Validate gates (6 gate checks auto), Branch (on validation result), Reject (red, notify submitter), Risk check (compute risk score), Journey Mgr approve (auto if <=3.5), HSE approve (required, SLA 30 min, selected).
- **Minimap:** Bottom-right, 180x100px.
- **Right inspector (320px):** Properties for selected node (HSE approve): Approver group (HSE Officers . Block 6, 4 users), Trigger condition (`risk_score >= 3.6 OR passengers > 6`), SLA (30 minutes), On timeout (Escalate to GM), Notification channels (chips: Email, SMS, WhatsApp, In-app checked; Phone call unchecked), Required attachments (Risk assessment form, HSE sign-off note, Driver fatigue check), On approve actions (Set journey -> APPROVED, Lock vehicle 30 min, Notify driver app . push checklist).
- **Versioning:** Never edit published workflow in place; create draft, publish on review. "Publish v2.4" button. "DRAFT . 8 NODES . 11 EDGES" status.

---

## 9. Design System & Tokens

All tokens are CSS custom properties on `:root`. Reimplement in your design-token system (Style Dictionary, Tailwind config, etc.).

### Typography

| Token | Value |
|-------|-------|
| `--font-sans` | `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` |
| `--font-mono` | `'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace` |

**Type Scale:**

| Class | Size / Weight / Color |
|-------|----------------------|
| Body default | 13px / 400 / `--ink-1` / line-height 1.45 |
| `.label` | 10px / 500 / `--ink-3` / uppercase / letter-spacing 0.08em |
| `.meta` | 11px mono / `--ink-2` / letter-spacing 0.02em |
| `.h3` | 13px / 600 / `--ink-0` |
| `.h2` | 16px / 600 / `--ink-0` / letter-spacing -0.005em |
| `.h1` | 20px / 600 / `--ink-0` / letter-spacing -0.01em |
| `.display` | 28px mono / 500 / `--ink-0` / letter-spacing -0.02em |
| `.display-lg` | 40px mono / 500 / `--ink-0` |
| Mono inline | `--font-mono`, tabular-nums, `font-feature-settings: 'zero'` |

### Color — Industrial Mood (default), Cool Palette (default)

**Surfaces (cool charcoal stack):**

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-0` | `#0a0d12` | Root background |
| `--bg-1` | `#0f141b` | Sidebar / topbar |
| `--bg-2` | `#151b24` | Sub-panel |
| `--bg-3` | `#1c2430` | Raised |
| `--bg-4` | `#242d3a` | Hover |
| `--panel` | `#11161e` | Panel background |
| `--surface` | `#151b24` | Card surface |
| `--raised` | `#1c2430` | Raised card |

**Lines:**

| Token | Hex |
|-------|-----|
| `--line` | `#232c39` |
| `--line-soft` | `#1b232e` |
| `--line-strong` | `#2e3a4a` |

**Ink:**

| Token | Hex | Use |
|-------|-----|-----|
| `--ink-0` | `#f1f4f8` | High emphasis |
| `--ink-1` | `#d6dce5` | Default body |
| `--ink-2` | `#95a0b0` | Secondary |
| `--ink-3` | `#5e6776` | Tertiary |
| `--ink-4` | `#3e4654` | Disabled |

**Safety Status (cool palette — canonical):**

| Token | Hex | Meaning |
|-------|-----|---------|
| `--go` | `#1ec991` | GO / approved / safe |
| `--go-soft` | `rgba(30,201,145,0.14)` | GO background |
| `--cond` | `#f5a524` | CONDITIONAL / review / soft-warn |
| `--cond-soft` | `rgba(245,165,36,0.14)` | CONDITIONAL background |
| `--nogo` | `#ef4747` | NO-GO / blocked / critical |
| `--nogo-soft` | `rgba(239,71,71,0.14)` | NO-GO background |
| `--info` / `--primary` | `#4a90ff` | Active / informational |
| `--info-soft` / `--primary-soft` | `rgba(74,144,255,0.14)` | Active background |
| `--primary-2` | `#2f6fe0` | Primary hover |
| `--neutral` | `#6b7689` | Inert / closed |
| `--neutral-soft` | `rgba(107,118,137,0.14)` | Neutral background |

**Chart accents:** `--cyan: #38d4d4`, `--violet: #a78bfa`, `--pink: #f472b6`.

### Radii

| Token | Value | Use |
|-------|-------|-----|
| `--r-1` | `4px` | Tiny chips, sublabel |
| `--r-2` | `6px` | Buttons, inputs, cards |
| `--r-3` | `10px` | Panels |
| `--r-4` | `14px` | Modals, large cards |

### Spacing

4px baseline. Utility classes: gap-4, gap-6, gap-8, gap-10, gap-12, gap-16, gap-20, gap-24. Inline padding commonly 8/10/12/14/16/20px.

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-1` | `0 1px 0 rgba(255,255,255,0.02) inset, 0 0 0 1px var(--line)` |
| `--shadow-2` | `0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px var(--line)` |

---

## 10. Component Primitives

Reimplement these as components in your design system:

| Component | Description |
|-----------|-------------|
| **Pill** | Status badge with leading dot. Mono font. Variants: `.go`, `.cond`, `.nogo`, `.info`, `.neutral`, `.solid-go`, `.solid-nogo`. |
| **Glyph** | 30+ custom SVG icons (lean geometric strokes, 1.6 stroke-weight, no fills). Do NOT swap for icon library without checking visual rhythm. |
| **Logo** | Fleetops wordmark: 4-spoke steering-helm rotor with central blue dot + "Fleetops" text. SVG, themable via `light` prop. |
| **Placeholder** | Striped neutral block for missing imagery, mono caption. |
| **Spark** | Inline SVG sparkline for KPI cards. Polyline + area fill at 12% opacity. |
| **LeafletMap** | Map component with theme support (dark/light/schematic). ResizeObserver + polled invalidateSize recovery. |
| **Btn** | Button with variants: default, primary, danger, go, ghost. Sizes: default (28px), lg (36px), sm (24px). |
| **Input** | 32px height, focus ring with primary color. |
| **Tbl** | Full-width table with sticky headers, hover rows. |
| **NavItem** | Sidebar nav item with icon, text, optional badge count. Active state. |
| **CheckBox** | 18px rounded checkbox. States: unchecked, checked (green), fail (red). |
| **Avatar** | 28px circle with gradient background and initials. Mono font. |
| **Bar** | 4px progress bar. Variants: default (primary), go, cond, nogo. |
| **Panel / Card / Raised** | Three levels of container elevation. |
| **OpsShell** | Shared sidebar+topbar+body chrome for specialist consoles. Takes `role`, `active`, `title`, `sub`, `headerRight`, `children`. Role determines sidebar nav and colored role badge. |
| **CTSidebar / CTTopbar** | Journey Manager-specific chrome for Control Tower screens. |
| **IOSDevice** | iPhone frame (402x874) with dynamic island, status bar, home indicator. For mobile screen prototypes. |

### Icon Set (IK object — 30+ glyphs)

All SVG path data, 24x24 viewBox: map, route, truck, user, users, shield, wrench, chart, bell, cog, inbox, doc, search, plus, filter, download, check, x, alert, panic, flag, clock, pin, fuel, battery, gauge, shieldChk, arrow, arrowL, chevD, chevR, chevU, refresh, dots, grid, list, expand, car, package, qr, nfc, sun, moon, link, eye, upload, camera, signal, phone.

---

## 11. Maps & Geo

### Prototype

- Leaflet 1.9.4 + CartoDB raster tiles (Dark Matter for dark theme, Voyager for light theme).
- No API key required but **CartoDB requires attribution** ("OpenStreetMap contributors / CARTO").

### Production Evaluation

| Provider | Notes |
|----------|-------|
| Mapbox | Vector tiles, sharpest at zoom, paid by MAU. Best polish. |
| MapTiler | Vector + raster, EU-hosted option (Omani data residency). |
| ESRI ArcGIS | Enterprise oil & gas standard, may be in client stack. |
| Self-hosted OSM (Tegola/Tileserver-GL) | If on-prem deployment mandatory. |

### Real Coordinates (Oman)

| Location | Coordinates |
|----------|-------------|
| Marmul base | 18.13 N, 55.20 E |
| Nimr-2 main camp | 19.13 N, 55.93 E |
| Fahud | 22.34 N, 56.50 E |
| Saih Rawl | 20.94 N, 56.65 E |
| Bahja | 19.65 N, 56.05 E |
| Muscat | 23.59 N, 58.42 E |

### Map Features

- `L.polyline` for routes (dashArray for dashed). Colors keyed to journey status.
- `L.rectangle` / `L.circle` for geofences (1.2px stroke, 4 4 dashArray, 5-7% fill opacity).
- `L.marker` with `L.divIcon` for all vehicle pins and site labels. Custom HTML via `vehiclePinHTML()` and `siteLabelHTML()` helpers.
- Map non-interactive by default for mini-maps; interactive for main fleet map and active journey map.
- ResizeObserver + polled invalidateSize() recovery for late-laid-out containers.

---

## 12. Interactions & Behavior

### Global

- **Live updates:** IVMS-sourced state (vehicle position, speed, events) flows via WebSocket. Stale-while-revalidate; show "device offline" pill if last-seen >60s. "LIVE . 248 devices online" topbar pill reflects aggregate.
- **Audit log:** Every status change creates audit entry: user / timestamp / IP / device / before-value / after-value.
- **Soft delete:** Safety records (events, panic logs, work orders) never hard-deleted. UI never offers "Delete" for these; only "Archive."

### Journey Composer (Screen 02)

- Validation runs on every field change. Gates re-evaluate live.
- Submit disabled while any blocking gate fails. Disabled state: `opacity: 0.55, cursor: not-allowed`. Show blocking summary banner with clickable list.
- Gate cards expand/collapse on header click.
- Approver chain updates in real time as approvals come in.

### Driver NFC (Screen 06)

- Animated pulse rings: 3 concentric, 2.4s ease-out infinite, staggered 0.6s.
- Blinking listening dot: 1.2s infinite.
- States: Listening -> Detected -> Authenticated (green check). Failed -> "Try again . 2 of 3 attempts" -> after 3 fails: manual override request.
- Manual override must always be available, must log event, must notify HSE.

### HSE Panic (Screen 13)

- Auto-opens on panic event ingestion. Toast + acoustic cue.
- Pulsing red animation: 1.4s ease-in-out infinite.
- Response playbook is state machine. Click-to-complete per step; auto-advance. Skip requires documented reason.
- "Escalate to Tier 2" triggers separate notification fan-out.

### Maintenance Release (Screen 12)

- Three explicit options — radio cards, no default. User must consciously pick.
- Conditional release asks for expiry (date/time picker). Until expiry, vehicle auto-restricted.
- HSE co-sign: when "Required", WO moves to HSE review lane; doesn't release until HSE approves.

### Passenger Boarding Validation

- 4 methods: NFC card, QR code, employee ID entry, manual supervisor confirmation. Configurable per route.
- System reconciles manifest vs actual boarded headcount before journey start; mismatch -> alert.

### Animations

| Animation | Timing |
|-----------|--------|
| NFC pulse rings | 2.4s ease-out infinite, staggered 0.6s |
| Panic icon / red No-Go pills (war-room only) | 1.4s ease-in-out infinite |
| NFC listening dot | 1.2s infinite blink |
| All hover/focus transitions | 0.12-0.18s ease |

### Form Validation Rules

| Field | Rule |
|-------|------|
| Plate number | Oman format `\d{1,2}-[A-Z]-\d{3,4}` ("Plate must be like 12-A-3471") |
| VIN | 17 chars alphanumeric, no I/O/Q |
| License expiry | Must be >7 days in future for journey assignment (configurable) |
| Manifest size | Must be <= vehicle seatbelt count |
| File uploads | Max 10MB photos, JPEG/PNG/HEIC, EXIF stripped server-side |

---

## 13. State Management

| Surface | State Source |
|---------|-------------|
| **Live fleet map** | WebSocket `/v1/fleet/live`. Each vehicle: `{id, plate, position, speed, heading, status, journey_id, driver_id, last_seen}`. Events: `/v1/events/live` filtered by role + project. |
| **Journey composer** | Form state for journey draft. On field change, re-run validation (client-side hint, server-authoritative). `GET /v1/journeys/:id/gates` returns gate state. |
| **Active journey** | WebSocket `/v1/journeys/:id/live`. Includes telemetry, waypoint progress, event stream. |
| **Driver app** | Offline-first (Replicache, ElectricSQL, or hand-rolled queue with optimistic UI). Pre-trip checklist, photos, defect reports queue when offline. |
| **Passenger app** | `/v1/passenger/requests/:id` + `/v1/passenger/trips/:id/live`. |
| **Planner Hub** | Polling or websocket on request pool. Selected requests form client-state pool. "Convert to journey plan" POSTs to `/v1/journeys`. |
| **Maintenance kanban** | Subscription on work-order status changes. Drag-and-drop moves emit `PATCH /v1/work-orders/:id`. |
| **Work order** | Release-decision form. Submit calls `POST /v1/work-orders/:id/release` with `{decision, reason, expiry?, hse_cosign_required}`. |
| **HSE console** | Subscription to incidents. Playbook completions: `POST /v1/incidents/:id/steps/:n/complete`. |
| **GM dashboard** | Cached aggregate queries — 60s cache acceptable. `/v1/analytics/kpis?range=mtd&site=...`. |
| **Vehicle Master** | Detail view: `/v1/vehicles/:id` + nested resources. Tabbed lazy-loading. |
| **Admin workflows** | Editable flow graph saves as `PUT /v1/workflows/:id` with `{nodes, edges}` JSON. Versioning mandatory — never edit published; create draft, publish on review. |

---

## 14. Theming — Mood, Palette, Map Style

Three independent axes. Store in user preferences (per user, per role default).

### Mood (aesthetic / surface palette)

| Value | Description |
|-------|-------------|
| `industrial` (default) | Charcoal control-room. Dark surfaces, white text. |
| `editorial` | Warm cream surfaces (#f6f4ee) for execs/clients. Ink-blue primary (#2a4a8f). Earthy safety colors (#1a7a52 / #9a5a00 / #b81717). |
| `warroom` | Pure black (#050608) with amber primary (#ffb020). Pulsing No-Go pills (1.4s ease-in-out). |

Implementation: CSS attribute selectors `[data-mood="..."]` on `<html>` override CSS variables.

### Palette (status color identity)

| Value | Primary | Go | Cond | No-Go |
|-------|---------|-----|------|-------|
| `cool` (default) | #4a90ff | #1ec991 | #f5a524 | #ef4747 |
| `desert` | #d97757 (terracotta) | #7aa05b (sage) | #e0a738 (sand) | #c0392b (clay) |
| `cyber` | #22d3ee (cyan) | #14eba0 (mint) | #fbbf24 (amber) | #ff3d8a (hot-pink) |

Implementation: CSS attribute selectors `[data-palette="..."]` on `<html>`.

### Map Style

| Value | Description |
|-------|-------------|
| `dark` (default) | CartoDB Dark Matter tiles |
| `light` | CartoDB Voyager tiles |
| `schematic` | Stylized vector grid, no real tiles (presentation mode) |

Implementation: React Context (`FleetopsTweakCtx`), per-map preference.

---

## 15. Responsive Behavior & RTL

### Desktop Consoles (Control Tower + Specialist)

- Designed for >= 1280x800.
- Below 1280: sidebar collapses to 56px icon rail.
- Below 1024: map and right rail stack (rail becomes top drawer).
- Below 768: read-only summary mode. Full editing on phone not supported for these roles.

### Mobile Apps (Driver + Passenger)

- Mobile-first, designed at 390x844 (iPhone 14/15).
- Use safe-area insets (`env(safe-area-inset-bottom)`) on bottom CTAs.

### Tablet

- Driver app stretches gracefully.
- Control Tower scales down by hiding right rail (becomes popover trigger).

### RTL (Arabic)

- Bake in `dir="rtl"` support from day one.
- Icons with directional meaning (arrow, chevron, route) must mirror.
- Numbers stay LTR.
- Status pills do not change layout direction.

---

## 16. Data Model

### 16.1 Main Entities

| Entity | Key Fields |
|--------|-----------|
| Organization | organization_id, name, type, parent_organization_id, project_id, active_status |
| User | user_id, name, email/mobile, role_id, organization_id, MFA_status, active_status |
| Driver | driver_id, employee_id, name, license_no, license_class, card_id, authorized_vehicle_types, certification_expiry, status |
| Vehicle | vehicle_id, plate_no, fleet_no, VIN, engine_no, make, model, year, type, owner, project, current_status, odometer, engine_hours |
| Device | device_id, type, serial_no, IMEI, SIM, APN, vehicle_id, firmware, last_seen, health_status |
| Journey Plan | journey_id, vehicle_id, driver_id, route_id, passengers, purpose, planned_start, planned_end, status, risk_score, approver_id |
| Job Plan | job_id, journey_id, work_order_no, job_type, destination, waypoint_list, status, proof_records |
| Passenger Manifest | manifest_id, journey_id, passenger_id/name, NFC_card, check_in_time, check_out_time, verification_method |
| Maintenance Work Order | wo_id, vehicle_id, issue_type, priority, status, photos_before, photos_after, technician_id, release_decision |
| Part Replacement | part_record_id, wo_id, part_number, part_name, quantity, supplier, warranty, installed_date, old_part_photo, new_part_photo |
| Tire Record | tire_id, vehicle_id, serial_no, size, axle_position, install_date, install_odometer, tread_depth, pressure, replacement_date, disposal_reason |
| Document | document_id, entity_type, entity_id, document_type, expiry_date, file_url, status, reminder_rules |
| Event / Alert | event_id, vehicle_id, driver_id, journey_id, event_type, severity, timestamp, location, action_status |
| Audit Log | audit_id, user_id/system_id, action, entity_type, entity_id, before_value, after_value, timestamp, IP/device |

### 16.2 Passenger Logistics Entities

| Entity | Key Fields |
|--------|-----------|
| PassengerRequest | request_id, passenger_user_id, pickup_location_id, drop_location_id, requested_time, priority, status, reason, created_by, approved_by |
| TransportEntitlement | user_id, company/project, eligible_routes, allowed_days/times, approver_id, validity_start, validity_end, entitlement_status |
| RequestPool | pool_id, route_id, shift_time, pickup_window, planner_id, request_count, capacity_required, pool_status |
| PassengerManifest | manifest_id, journey_id, passenger_id, boarding_status, validation_method, boarded_time, dropped_time, no_show_reason |
| BoardingValidationEvent | event_id, journey_id, passenger_id, method, timestamp, location, validation_result, exception_flag |
| TripScore | trip_id, driver_score, punctuality_score, passenger_service_score, safety_score, closure_score, comments |
| LoadingActivitySegment | segment_id, journey_id, item/material_ref, quantity, loading_clerk_id, load_time, unload_time, photos, signature |
| InspectionCampaign | campaign_id, campaign_type, vehicles_scope, start_date, end_date, created_by_workshop_or_hse, status, findings_summary |

---

## 17. Hardware & IoT Integration

Software must be **hardware-agnostic**. Design a device ingestion layer supporting multiple vendors.

| Hardware Component | Expected Data / Function |
|-------------------|------------------------|
| GPS / IVMS device | Location, speed, ignition, trip start/stop, harsh events, tamper, power loss, device health, driver ID. |
| NFC/RFID driver reader | Driver card UID, authorized/unauthorized status, timestamp, vehicle ID, start authorization event. |
| Ignition / immobilizer relay | Enable/disable start based on approved policy, NFC verification, and vehicle release status. |
| CAN/J1939/OBD interface | Engine hours, odometer, RPM, fuel, engine status, fault codes. |
| Panic button | Emergency alert with vehicle, driver, location, time, and journey context. |
| Passenger counter | Automatic headcount events, boarding/alighting count, actual vs planned count. |
| Dashcam / MDVR | Event clips, still images, optional live view, incident evidence, maintenance evidence. |
| Mobile app | Checklist, photos, journey status, offline capture, signature, defect reports, SOS. |

### Device Integration Requirements

- Support inbound MQTT and HTTPS webhooks for device events.
- Store raw payloads for troubleshooting and normalized events for application use.
- Device mapping table: link device serial/IMEI to vehicle and project.
- Device health dashboard: online/offline, last seen, GPS quality, battery/power, SIM status, firmware version.
- Allow new device adapters without rewriting business logic.

---

## 18. API & Integration Requirements

| Integration Area | Expected Capability |
|-----------------|-------------------|
| ERP / Finance | Vehicle master, cost centers, work orders, supplier invoices, purchase orders, optional cost fields. |
| HR System | Driver/user profile sync, employment status, department, training/certification records. |
| GIS System | Routes, sites, geofences, road hazards, approved roads, red zones, camps, project boundaries. |
| IVMS / GPS Vendors | Device telemetry ingestion, driver ID events, trip events, alerts, device health. |
| SMS / Email / WhatsApp Gateway | Notifications and escalation messages. |
| BI / Power BI | Scheduled export or API for dashboards and management reports. |
| Document Storage | Secure file storage for photos, PDF certificates, insurance, inspection, service records, videos. |
| Passenger Logistics App | Create/update passenger requests, pool requests, assign trips, sync status, validate boarding, update ETA/progress, close trips, export analytics via API/webhooks. |

### API Design

- REST API for core CRUD and reporting exports.
- Webhook support for journey status, device alerts, maintenance status, approval events.
- Webhook retry and failure log.
- Pagination, filtering, sorting, date-range queries for all list endpoints.
- Strict API permission checks matching user roles.
- API versioning from first release: `/api/v1/`.
- Swagger/OpenAPI documentation required.

---

## 19. Reporting Requirements

| Report | Primary Users | Minimum Content |
|--------|--------------|----------------|
| Active Journey Report | Journey Manager, HSE | Active vehicles, route, driver, passengers, status, ETA, alerts, last location. |
| Journey Compliance Report | HSE, GM/Ops | Approved vs actual route, delays, deviations, closure status, checkpoint compliance. |
| Driver Behavior Report | HSE, Operations | Overspeed, harsh braking, harsh acceleration, fatigue/driving hours, driver score. |
| Vehicle Readiness Report | GM/Ops, Maintenance, HSE | Available, Conditional, No-Go, under maintenance, expired documents, IVMS/NFC faults. |
| Go / No-Go Report | Maintenance, HSE, Journey Manager | Release decision, reason, approver, expiry, linked work order, photos. |
| Maintenance Report | Maintenance, GM/Ops | Service history, defects, before/after photos, parts, technician, next due. |
| Parts Replacement Report | Maintenance, Procurement | Part number, name, quantity, supplier, vehicle, work order, warranty. |
| Tire Report | Maintenance, HSE | Tire serial, axle position, tread depth, pressure, replacement date, photos, unsafe findings. |
| Licensing & Renewal Report | Admin, GM/Ops, HSE | Mulkia, insurance, inspection, permits, IVMS calibration, fire extinguisher, first aid, expiry reminders. |
| Passenger / Headcount Report | Journey Manager, HSE | Planned passengers, actual count, mismatch events, check-in/out, capacity compliance. |
| Incident / Panic Report | HSE, Emergency, GM/Ops | SOS event, location, driver, vehicle, journey, event timeline, action closure. |
| Audit Log Report | Admin, HSE, Compliance | Approvals, overrides, edits, deletions, status changes, exports, user actions. |
| Passenger Request Fulfilment | Logistics Planner, GM/Ops | Requests submitted/approved/rejected/pooled/assigned/completed/cancelled/pending. |
| Passenger Manifest & Boarding | Journey Manager, HSE | Manifest, actual boarded, validation method, mismatch, no-shows, capacity exceptions. |
| Pickup/Drop Performance | Logistics Planner, GM/Ops | On-time pickup/drop, ETA variance, delays, route efficiency, feedback. |
| Inspection Campaign Report | HSE, Maintenance, GM/Ops | Campaign scope, completed/failed inspections, defects, corrective actions, closure. |
| Loading/Unloading Segment | Operations, Logistics Planner, HSE | Material/segment records, clerk actions, timestamps, photos, exceptions, approvals. |

---

## 20. Notifications & Escalations

| Trigger | Recipient | Required Action |
|---------|-----------|----------------|
| Unauthorized driver/NFC attempt | Journey Manager, HSE | Investigate and block vehicle if needed. |
| Vehicle selected but No-Go | Journey Manager | Cannot proceed; select approved vehicle or resolve defect. |
| Route deviation | Journey Manager, HSE if severe | Contact driver and record action. |
| Overspeed / harsh driving | Driver, HSE, Operations | Warn driver, record event, update driver score. |
| Panic button | Emergency contacts, HSE, Journey Manager | Emergency response workflow. |
| Missed checkpoint / delayed arrival | Journey Manager | Call driver; escalate if no response. |
| Headcount mismatch | Journey Manager, HSE | Stop journey approval or investigate during active trip. |
| Critical maintenance defect | Maintenance, HSE, GM/Ops | Place vehicle on No-Go or HSE Hold. |
| Document expiry approaching | Admin, Maintenance, GM/Ops | Renew before expiry; block if expired. |
| Device offline / tamper | Maintenance, HSE, Journey Manager | Check IVMS device and block vehicle if policy requires. |
| Passenger request pending beyond SLA | Logistics Planner | Approve, reject, pool, or escalate request. |
| Vehicle capacity/headcount mismatch | Driver, Journey Manager, HSE | Reconcile manifest before departure. |
| Passenger trip delay/ETA change | Passengers, Journey Manager | Notify affected passengers and update live trip status. |
| Passenger boarded without valid manifest | Driver, Journey Manager, HSE | Validate exception or remove passenger per site policy. |
| Inspection campaign overdue | Maintenance, HSE, GM/Ops | Complete inspection or block vehicle per campaign rules. |
| Loading/unloading segment not closed | Operations, Loading Clerk, Journey Manager | Complete segment closure with evidence and approval if required. |

---

## 21. Cybersecurity & Audit

- Role-based access control for all modules and APIs.
- MFA for admin, HSE, GM/Ops, and system configuration roles.
- Audit logs for: login, approval, rejection, override, vehicle release, journey closure, document upload, report export, data changes.
- Encryption in transit (TLS) and at rest for sensitive data.
- Secure device authentication: per-device credentials, API keys, tokens, or certificates.
- Data retention policies by event type, journey, maintenance report, image/video evidence, audit log.
- Backup and disaster recovery plan with documented RPO and RTO.
- Privacy controls for cabin camera, passenger records, and personal data access.
- No deletion of safety records without admin approval and audit trail. Prefer soft-delete with retention.

---

## 22. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99.5%+ for production; final SLA to be agreed. |
| Scalability | Phased growth from pilot fleet to hundreds/thousands of vehicles. |
| Performance | Live map events update within near-real-time limits (subject to device transmission and network). |
| Offline Support | Driver mobile app must capture checklist, photos, defect reports offline and sync when network returns. |
| Localization | English first, Arabic-ready (RTL) UI and report labels. |
| Hosting | Cloud, local Oman cloud, and on-premise deployment options. |
| Configurability | Admin can configure checklist templates, approval rules, notification rules, expiry reminders, vehicle status rules. |
| Maintainability | Modular codebase, documented, automated tests for critical workflows. |
| Design fidelity | Every screen must recreate the design handoff at visual parity. Not "reinterpreted." |

---

## 23. Assets & Fonts

- **Fonts:** IBM Plex Sans (300, 400, 500, 600, 700) and IBM Plex Mono (400, 500, 600). **Self-host in production** (don't depend on Google Fonts in oil & gas).
- **Icons:** 30+ hand-drawn SVG glyphs in `shared.jsx` (`IK` object). Lean geometric strokes, 1.6 stroke-weight, no fills unless specified. License: rolled for this design, free to use.
- **Logo:** Fleetops wordmark — steering-helm-derived 4-spoke rotor with central blue dot. SVG, themable.
- **Map tiles:** CartoDB Dark Matter & Voyager. Requires attribution. Swap to chosen provider for production.
- **Placeholders:** Striped neutral blocks. Replace with real photos.

---

## 24. Implementation Order

Build in this sequence (from design handoff recommendation):

1. **Design tokens & primitives** — `styles.css` -> your design-token format, then `shared.jsx` primitives -> your component library.
2. **Shared chrome** — `OpsShell`, CTSidebar/CTTopbar.
3. **Vehicle Master profile (Screen 15)** — most "read" patterns in one screen.
4. **Live fleet map (Screen 01)** — establishes real-time + map patterns.
5. **Journey composer (Screen 02)** — the central gating interaction.
6. **Active journey (Screen 03)** — telemetry/map composition.
7. **Driver app (Screens 04-07)** — mobile patterns (Today, Checklist, NFC, In-trip).
8. **Maintenance workshop + Work order (Screens 11, 12)** — write-heavy operational patterns.
9. **HSE console (Screen 13)** — emergency response.
10. **Planner Hub (Screen 10), Passenger app (Screens 08, 09).**
11. **GM dashboard (Screen 14).**
12. **Admin workflow config (Screen 16)** — most complex single screen; defer.

### Implementation Roadmap (Backend)

| Phase | Scope | Key Output |
|-------|-------|-----------|
| Phase 1: Discovery & Design | Confirm users, vehicle types, hardware, routes, documents, approval matrix, forms, reporting format. | Signed functional spec, data model, UI wireframes, integration plan. |
| Phase 2: MVP Platform | Vehicle master, driver master, NFC driver ID, basic journey management, live tracking, pre-trip checklist, basic reports. | Pilot-ready platform. |
| Phase 3: Maintenance & Go/No-Go | Service records, work orders, photos, parts, tires, license renewal, release workflow, vehicle blocking rules. | Maintenance-controlled journey readiness. |
| Phase 4: HSE & Passenger Controls | Passenger manifest/headcount, HSE hold, escalations, driver score, route deviation, compliance reports. | HSE control tower. |
| Phase 5: Integrations | ERP/HR/GIS/SMS/BI, device vendor adapters, API hardening, data exports. | Enterprise integration layer. |
| Phase 6: Advanced Enhancements | Dashcam/MDVR evidence, AI event detection, predictive maintenance, multilingual UI, contractor portals. | Advanced fleet intelligence platform. |

---

## 25. Acceptance Criteria

### Core System

- Vehicle cannot be assigned to journey when status is No-Go, Under Maintenance, Expired Documents, IVMS Fault, NFC Fault, or HSE Hold.
- Driver NFC/RFID identification captured and linked to journey, vehicle, timestamp, location.
- Journey plan can be created, approved, started, monitored, deviated, completed, closed.
- Route deviation, overspeed, panic, unauthorized movement, device offline, headcount mismatch alerts generated and visible to correct users.
- Maintenance report supports before/after photos, parts, tire record, odometer/engine hours, technician, supervisor decision, release status.
- Major service and renewal reminders generated per configurable rules.
- Tire history viewable by vehicle, axle position, serial number, replacement date.
- Passenger manifest and actual headcount stored per journey and included in reports.
- Audit log records all status changes, approvals, overrides, report exports.
- Reports exportable in PDF and Excel/CSV.
- Mobile app supports offline checklist/defect capture and later sync.
- Admin can configure roles, workflow rules, alert rules, checklist templates, document expiry reminders.
- APIs documented and tested for core modules.

### Passenger Logistics App

- Passenger users can submit pickup/drop requests and receive approval, vehicle/driver, ETA, delay, and closure notifications.
- Logistics planners can pool requests, group by route/shift/site, assign vehicle and driver, convert to approved journey plan.
- Driver app displays allocated passenger trips, route sequence, passenger manifest, boarding validation actions, trip closure.
- Passenger boarding validated by QR/NFC/employee ID/manual confirmation; actual headcount reconciled with manifest and capacity.
- System blocks/alerts when: passenger count exceeds capacity, manifest missing, vehicle No-Go, driver unauthorized, inspection campaign rules unsatisfied.
- Vehicle inspectors, workshop, and HSE users can schedule/complete inspection campaigns with findings, photos, corrective actions, closure status.
- Loading/unloading recorded per journey segment with clerk identity, timestamp, quantity/material reference, photos, closure status.
- Analytics dashboards show: passenger demand, fulfilment, route performance, delays, no-shows, trip score, driver score, inspection findings, service trends.

### Design Fidelity

- All 16 screens must recreate the design handoff at pixel-level visual parity.
- Design tokens (colors, typography, spacing, radii, shadows) implemented exactly.
- Three mood variants (industrial, editorial, warroom) all functional.
- Three palette variants (cool, desert, cyber) all functional.
- Three map styles (dark, light, schematic) all functional.
- Mood/palette/map preferences stored per user.
- All animations implemented at specified timings.
- RTL support baked in from day one.

---

## 26. Open Questions

From spec (S18) — must be answered by client before final-mile implementation:

1. Which IVMS device brands/protocols will be used in the pilot?
2. Will the vehicle immobilizer be physically implemented or initially limited to alerting/blocking journey approval?
3. Which vehicle categories are included first: light vehicles, buses, trucks, excavators, tankers, or all?
4. What is the required hosting model: SaaS, Oman local cloud, on-premise, or hybrid?
5. What are the exact approval levels for high-risk journeys and conditional vehicle release?
6. What passenger counting method will be used first: manual manifest, passenger NFC, door counter, seat sensors, or camera analytics?
7. Are cabin cameras allowed under the client privacy and HSE policy?
8. Which documents are mandatory and which should automatically block vehicle use upon expiry?
9. What KPIs must appear on the GM/Ops dashboard from day one?
10. What external systems must be integrated in the first release?
11. Should passenger trip visibility show driver name/mobile number, or only vehicle ID and ETA due to privacy policy?
12. Should employee transport eligibility be imported from HR, project access control, or manually managed by logistics admin?
13. What boarding validation method is preferred: NFC card, QR code, employee ID, camera/headcount sensor, or hybrid?
14. Should passenger requests support recurring schedules by shift, camp, office, project, and roster pattern?
15. Should material logistics and passenger logistics be combined in the same trip, or separated by policy?

---

## Appendix A: Pre-Trip Checklist Fields

| Category | Items |
|----------|-------|
| Vehicle Exterior | Tires & visible damage, lights & indicators, mirrors & windshield, fluid leaks, body damage, plate visibility. |
| Safety Equipment | Seatbelts (all seats), fire extinguisher, first aid kit, warning triangle, spare tire/tools. |
| IVMS & Devices | GPS/IVMS working, NFC reader working, camera/MDVR working, panic button test. |
| Documents | Mulkia, insurance, inspection/RAS, site permit, driver license, journey approval. |
| Passengers | Passenger names/IDs, headcount, capacity, seatbelt confirmation. |
| Journey Details | Destination, route, waypoints, planned time, emergency contact, rest stops. |

## Appendix B: Vehicle Status Rules

| Condition | Automatic Status / Action |
|-----------|--------------------------|
| Major service overdue | Set No-Go or Conditional Release based on policy. |
| Insurance / Mulkia expired | Set Expired Documents and block journey assignment. |
| Critical tire defect | Set No-Go and open maintenance work order. |
| IVMS device offline beyond threshold | Set IVMS Fault and alert maintenance/HSE. |
| NFC reader fault | Set NFC Fault and block driver-authenticated journeys unless approved override. |
| HSE incident investigation | Set HSE Hold and block assignment. |
| Maintenance work order closed and approved | Set Available or Conditional Release depending on approval result. |

## Appendix C: Design Handoff File Index

```
design_handoff_fleetops/
+-- README.md                        <- Design handoff documentation
+-- Fleetops.html                    <- Entry point (open in browser, no build needed)
+-- styles.css                       <- All design tokens, primitive classes, mood/palette variants
+-- shared.jsx                       <- Icons, Logo, Pill, Spark, Placeholder, LeafletMap, TweakCtx
+-- control-tower-map.jsx            <- Screen 01 (CTLiveMap) + CTSidebar + CTTopbar
+-- control-tower-journey.jsx        <- Screens 02 (CTJourneyComposer) + 03 (CTActiveJourney)
+-- driver-app.jsx                   <- Screens 04-07 (DrvToday, DrvChecklist, DrvNFC, DrvInTrip)
+-- passenger-app.jsx                <- Screens 08 (PaxRequest) + 09 (PaxLive)
+-- ops-consoles.jsx                 <- OpsShell + Screens 10-13 (PlannerHub, MaintWorkshop, MaintWorkOrder, HSEConsole)
+-- ops-consoles-2.jsx               <- Screens 14-16 (GMDashboard, VehicleProfile, AdminConfig)
+-- design-canvas.jsx                <- Presentation harness (don't ship)
+-- ios-frame.jsx                    <- iPhone device chrome (don't ship)
+-- tweaks-panel.jsx                 <- Mood/Palette/Map tweak UI (settings reference)
+-- source/
    +-- requirement.md               <- Original functional spec v1.0-1.1
    +-- AR_Technology_Journey_Fleet_Management.docx
```

## Appendix D: References

| Source | Notes |
|--------|-------|
| Fleetbase official platform | https://fleetbase.io/ -- modular logistics OS reference. |
| Fleetbase on-premise docs | https://docs.fleetbase.io/deploying/on-premise/ -- on-own-infrastructure reference. |
| Oil & Gas Road Safety / Journey Management | Client-specific and industry road safety standards. |
| OPAL Oman Energy Association | https://opaloman.om/ |
| OPAL Unified Services Platform | https://usp.opaloman.om/our-services/ -- RAS and road-safety services. |
| Fleetio preventive maintenance | https://www.fleetio.com/blog/5-components-of-fleet-preventive-maintenance |
| Tasnim Logistics Passenger app | https://play.google.com/store/apps/details?id=djm.cuetrans.passanger -- functional reference only. |
