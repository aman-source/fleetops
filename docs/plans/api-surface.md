# Fleetops API Surface

Version: `/api/v1/`
Auth: Bearer JWT on all endpoints except `/auth/login`
Format: JSON
Envelope: `{ data, meta?, error? }`

---

## Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /auth/login | Login → access + refresh tokens | Public |
| POST | /auth/refresh | Refresh access token | Refresh token |
| POST | /auth/logout | Revoke tokens | Bearer |
| POST | /auth/mfa/setup | Generate TOTP secret | Bearer |
| POST | /auth/mfa/verify | Verify TOTP code | Bearer |
| GET | /auth/me | Current user profile + permissions | Bearer |

---

## Fleet — Vehicles

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /vehicles | List vehicles (paginated, filterable) | All ops |
| POST | /vehicles | Create vehicle | Admin, Maintenance |
| GET | /vehicles/:id | Full vehicle profile (nested resources) | All ops |
| PATCH | /vehicles/:id | Update vehicle fields | Admin, Maintenance |
| PATCH | /vehicles/:id/status | Change vehicle status (with audit) | Maintenance, HSE |
| GET | /vehicles/:id/documents | Vehicle documents | All ops |
| GET | /vehicles/:id/maintenance | Maintenance history | Maintenance, HSE |
| GET | /vehicles/:id/tires | Tire records | Maintenance |
| GET | /vehicles/:id/journeys | Journey history | Journey Mgr |
| GET | /vehicles/:id/events | IVMS events | HSE, Journey Mgr |
| GET | /vehicles/:id/audit | Audit trail | Admin, HSE |

---

## Fleet — Drivers

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /drivers | List drivers | All ops |
| POST | /drivers | Create driver profile | Admin |
| GET | /drivers/:id | Driver detail | All ops |
| PATCH | /drivers/:id | Update driver | Admin |
| POST | /drivers/:id/nfc | Assign NFC card | Admin |
| DELETE | /drivers/:id/nfc | Revoke NFC card | Admin |
| GET | /drivers/:id/score | Driver behavior score | HSE, GM |

---

## Fleet — Devices

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /devices | List devices + health | Maintenance, Admin |
| POST | /devices | Register device | Admin |
| PATCH | /devices/:id | Update device (link to vehicle) | Admin |
| GET | /devices/:id/health | Device health detail | Maintenance |

---

## Journeys

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /journeys | List journeys (filterable by status, date, project) | Journey Mgr, HSE |
| POST | /journeys | Create journey draft | Journey Mgr |
| GET | /journeys/:id | Journey detail | Journey Mgr, HSE |
| PATCH | /journeys/:id | Update draft | Journey Mgr |
| GET | /journeys/:id/gates | Evaluate all 6 Go/No-Go gates | Journey Mgr |
| POST | /journeys/:id/submit | Submit for approval (re-validates gates) | Journey Mgr |
| POST | /journeys/:id/approve | Approve journey | Approver (JM/HSE) |
| POST | /journeys/:id/reject | Reject journey (with reason) | Approver |
| POST | /journeys/:id/activate | Start journey (driver pre-trip complete) | System/Driver |
| POST | /journeys/:id/close | Close journey | Journey Mgr, System |
| POST | /journeys/:id/recall | Emergency recall | Journey Mgr, HSE |
| GET | /journeys/:id/passengers | Passenger manifest | Journey Mgr |
| POST | /journeys/:id/passengers | Add passenger to manifest | Journey Mgr |
| DELETE | /journeys/:id/passengers/:paxId | Remove passenger | Journey Mgr |

---

## IVMS / Live Tracking

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /fleet/live | Current position + status of all vehicles | Journey Mgr |
| GET | /fleet/live/:vehicleId | Single vehicle live state | All ops |
| GET | /events | Event stream (paginated, filterable) | HSE, Journey Mgr |
| GET | /events/live | SSE or WebSocket upgrade for real-time events | All ops |
| GET | /telemetry/:vehicleId | Historical telemetry (date range) | HSE, Journey Mgr |
| POST | /webhooks/ivms | HTTP webhook for IVMS devices (alternative to MQTT) | Device auth |

---

## Maintenance

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /work-orders | List work orders (filterable by status/vehicle/priority) | Maintenance |
| POST | /work-orders | Create work order | Maintenance, Driver, System |
| GET | /work-orders/:id | Work order detail | Maintenance, HSE |
| PATCH | /work-orders/:id | Update work order | Maintenance |
| POST | /work-orders/:id/release | Release decision (GO/CONDITIONAL/NO-GO) | Maintenance |
| POST | /work-orders/:id/hse-approve | HSE co-sign | HSE |
| POST | /work-orders/:id/photos | Upload before/after photos | Maintenance |
| GET | /work-orders/:id/activity | Activity timeline | Maintenance, HSE |
| POST | /work-orders/:id/parts | Add replaced part | Maintenance |
| GET | /tires | Tire inventory | Maintenance |
| POST | /tires | Register tire | Maintenance |
| PATCH | /tires/:id | Update tire (tread depth, position, rotation) | Maintenance |

---

## HSE

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /incidents | List incidents | HSE |
| GET | /incidents/:id | Incident detail | HSE |
| POST | /incidents/:id/steps/:n/complete | Complete playbook step | HSE |
| POST | /incidents/:id/escalate | Escalate to next tier | HSE |
| POST | /incidents/:id/close | Close incident (with report) | HSE |
| GET | /driver-scores | Driver behavior scoreboard | HSE, GM |

---

## Documents

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /documents | List documents (filterable by type, status, entity) | Admin, Maintenance |
| POST | /documents | Upload document + set expiry | Admin, Maintenance |
| PATCH | /documents/:id | Update document (renew) | Admin, Maintenance |
| GET | /documents/expiring | Documents expiring within N days | Admin, Maintenance, GM |

---

## Passenger

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /passenger/requests | List requests | Planner, Passenger (own) |
| POST | /passenger/requests | Submit pickup/drop request | Passenger |
| GET | /passenger/requests/:id | Request detail + status | Planner, Passenger |
| PATCH | /passenger/requests/:id | Update request | Passenger (if pending) |
| DELETE | /passenger/requests/:id | Cancel request | Passenger (if pending) |
| GET | /passenger/pools | Active request pools | Planner |
| POST | /passenger/pools | Create pool from requests | Planner |
| POST | /passenger/pools/:id/assign | Assign vehicle + driver to pool | Planner |
| POST | /passenger/pools/:id/convert | Convert pool → journey plan | Planner |
| POST | /passenger/boarding/:journeyId | Validate boarding (NFC/QR/ID) | Driver |
| GET | /passenger/trips/:id/live | Live trip progress | Passenger |
| GET | /passenger/entitlements | Check user eligibility | System |

---

## Notifications

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /notifications | User's notifications (paginated) | All |
| PATCH | /notifications/:id/read | Mark as read | All |
| GET | /notifications/preferences | User notification preferences | All |
| PUT | /notifications/preferences | Update preferences | All |

---

## Analytics

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /analytics/kpis | Fleet KPIs (filterable by date range, site) | GM, HSE |
| GET | /analytics/fleet-readiness | Vehicle status breakdown | GM |
| GET | /analytics/journeys | Journey stats (approved/delayed/deviated) | GM |
| GET | /analytics/risks | Top operational risks | GM, HSE |
| GET | /analytics/by-site | Per-site breakdown table | GM |
| POST | /reports/generate | Generate PDF/CSV report (async, returns job ID) | GM, HSE, Admin |
| GET | /reports/:jobId | Download generated report | GM, HSE, Admin |

---

## Admin

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /admin/workflows | List workflows | Admin |
| POST | /admin/workflows | Create workflow | Admin |
| GET | /admin/workflows/:id | Workflow detail (nodes, edges) | Admin |
| PUT | /admin/workflows/:id/draft | Save draft version | Admin |
| POST | /admin/workflows/:id/publish | Publish new version | Admin |
| GET | /admin/workflows/:id/test | Test workflow against draft journey | Admin |
| GET | /admin/users | User management | Admin |
| POST | /admin/users | Create user | Admin |
| PATCH | /admin/users/:id | Update user (role, status, org) | Admin |
| GET | /admin/orgs | Organization hierarchy | Admin |
| GET | /admin/config | System configuration | Admin |
| PUT | /admin/config | Update configuration | Admin |

---

## Audit

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | /audit | Audit log (paginated, filterable) | Admin, HSE |
| GET | /audit/:entityType/:entityId | Audit trail for specific entity | Admin, HSE |

---

## WebSocket Rooms

| Room | Payload | Subscribers |
|------|---------|------------|
| `fleet:live` | All vehicle positions + status | Control Tower map |
| `vehicle:{id}` | Single vehicle telemetry | Vehicle detail page |
| `journey:{id}:live` | Journey telemetry + waypoint progress | Active journey screen |
| `events:project:{id}` | IVMS events for project | Journey Manager |
| `events:severity:critical` | Panic, collision, rollover | HSE Console |
| `workorders:status` | Work order status changes | Maintenance kanban |
| `notifications:{userId}` | In-app notifications | All users |

---

## MQTT Topics

| Topic | Direction | Payload |
|-------|-----------|---------|
| `fleet/{deviceId}/telemetry` | Device → Server | lat, lon, speed, heading, ignition, fuel, engine_hours, odometer |
| `fleet/{deviceId}/event` | Device → Server | event_type, severity, timestamp, details |
| `fleet/{deviceId}/panic` | Device → Server | lat, lon, timestamp, driver_id |
| `fleet/{deviceId}/nfc` | Device → Server | card_uid, authorized, driver_id, timestamp |
| `fleet/{deviceId}/health` | Device → Server | battery, signal, gps_quality, firmware |
| `server/{deviceId}/command` | Server → Device | command_type (immobilize, locate, config_update) |
