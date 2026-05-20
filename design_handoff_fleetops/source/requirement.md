# Journey Management & Fleet Monitoring System

## Developer Handover Scope / Functional Specification

For oil & gas-grade fleet, journey, IVMS, maintenance, HSE, NFC driver identification, and passenger/headcount control.

| Field | Value |
|-------|-------|
| Prepared for | AR Technology / Developer Handover |
| Version | 1.0–1.1 |
| Date | 09 May 2026 |
| Status | Draft scope for technical review |

---

## 1. Executive Summary

This document defines the required scope for an integrated Journey Management, Fleet Monitoring, IVMS, Maintenance Control, Driver Identification, Passenger Headcount, and HSE Compliance system.

The target platform provides **one digital control tower** where the vehicle, driver, journey plan, job plan, passengers, maintenance status, tires, documents, IVMS data, and HSE approvals are linked before and during vehicle movement.

### Core Rules

- A journey **cannot start** unless the driver is authorized, the vehicle is technically fit, documents are valid, headcount is confirmed, and the journey is approved.
- Maintenance and HSE users can release, block, or conditionally approve vehicles using a **Go / No-Go workflow**.
- The system must support oil & gas operational discipline, auditability, role-based approvals, and future extension to CCTV, dashcam, AI safety, and equipment monitoring.
- Includes a **Passenger Logistics App** extension for employee pickup/drop requests, planner request pooling, vehicle/driver assignment, live trip progress, driver trip visibility, passenger validation, inspection campaigns, loading/unloading records, and analytics.

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

## 3. System Overview

The system includes web dashboards, mobile applications, IoT/IVMS device ingestion, role-based workflows, and reporting. This is a **multi-module enterprise platform**, not a simple GPS tracking tool.

| Layer | Main Components |
|-------|----------------|
| Vehicle / Edge Layer | IVMS/GPS tracker, NFC/RFID driver reader, CAN/J1939/OBD integration, ignition input/relay, panic button, passenger counter, camera/MDVR optional, driver mobile app. |
| Connectivity Layer | 4G/5G SIM, private APN where required, MQTT/HTTPS/WebSocket, secure device authentication, offline buffering. |
| Platform Layer | Journey management, fleet tracking, maintenance control, HSE workflows, parts/tires, documents, reports, notifications, APIs. |
| User Layer | Driver, Journey Manager, Maintenance, HSE, General Manager, Storekeeper, Admin, Client/Contractor viewer. |

---

## 4. High-Level Architecture

*(Figure 1: Proposed high-level architecture for the integrated journey, fleet, maintenance, and HSE control tower.)*

---

## 5. User Roles and Access Control

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

---

## 6. Core Functional Modules

### 6.1 User, Role & Organization Module

- Multi-tenant structure for company, contractor, department, project, and site.
- Role-based permissions for driver, journey manager, maintenance, HSE, GM/Ops, storekeeper, admin, and read-only viewer.
- User status, account lock, MFA support for admin/manager roles, and user audit log.
- Organization hierarchy: business unit, project, base, camp, workshop, and site.

### 6.2 Vehicle Master File Module

- Create full vehicle profile by plate number, fleet number, VIN/chassis number, engine number, make, model, year, type, owner, project, and base location.
- Maintain current status: Available, Conditional Release, Under Maintenance, No-Go, Expired Documents, IVMS Fault, HSE Hold, Decommissioned.
- Attach documents: registration/Mulkia, insurance, RAS/inspection certificate, site permit, photos, and device installation records.
- Track odometer, engine hours, IVMS device ID, SIM number, APN, camera/MDVR ID, NFC reader ID, and passenger counter ID.

### 6.3 Driver Management & NFC Authentication Module

- Create driver profile with name, ID, license class, defensive driving certificate, medical/fitness status, authorized vehicle types, and active/inactive status.
- Assign NFC/RFID card or iButton to each driver and maintain card issue/revoke history.
- Vehicle must request driver identification by NFC before or immediately after ignition.
- Unauthorized driver attempts must trigger alerts and be recorded as events.
- Each trip must automatically attach the driver name, ID, card number, vehicle, timestamp, and location.

### 6.4 Journey Management Module

- Create, submit, approve, monitor, and close journey plans.
- Required fields: journey ID, vehicle, driver, passengers, start location, destination, route, waypoints, job purpose, planned departure/arrival, risk level, emergency contact, journey manager, and approval status.
- System must validate vehicle readiness, driver validity, documents, maintenance status, IVMS status, NFC status, headcount, and route risk before approval.
- Journey states: Draft, Pending Approval, Approved, Active, Delayed, Deviated, Completed, Closed, Rejected, Cancelled, Emergency.

### 6.5 Job Plan Execution Module

- Attach each journey to a work order or job plan where required.
- Job status: Assigned, En Route, Arrived, In Progress, Completed, Delayed, Failed, Cancelled.
- GPS-based check-in/out at waypoints and destination.
- Proof of arrival/completion: photos, QR, NFC, digital signature, supervisor approval, or geofence confirmation.
- Digital forms and checklists by job type.

### 6.6 IVMS / Fleet Tracking Module

- Live GPS location, speed, ignition, route, geofence, trip distance, idle time, engine hours, harsh braking, harsh acceleration, and movement history.
- Link IVMS trip data to driver, vehicle, journey plan, and job plan.
- Event-based alerts: overspeed, harsh driving, panic, tamper, device offline, GPS loss, route deviation, delayed arrival, unauthorized movement, and night driving violation.
- History replay and export by vehicle, driver, journey, date range, and project.

### 6.7 Passenger / Headcount Module

- Maintain passenger manifest for each journey.
- Support passenger NFC/RFID check-in where required.
- Support automatic passenger count for buses/vans using door counter, cabin camera, or seat occupancy sensors.
- Alert if actual headcount does not match approved passenger list or maximum capacity.
- Log passenger count at start, waypoints, destination, and journey closure.

### 6.7A Passenger Logistics Mobile App Module

This module adds passenger-facing and planner-facing functionality. Must be implemented as an original AR Technology oil & gas-grade module.

**Functional Requirements:**

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

**Sub-Modules:**

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

### 6.9 Spare Parts & Replacement History Module

- Track: part number, part name, OEM/aftermarket, supplier, warranty period, quantity, replacement date, linked vehicle, linked work order, technician, old/new photos, cost field (optional/configurable).
- Stock issue against work order and return/disposal record for old parts.
- Replacement history by vehicle VIN, plate number, and fleet number.

### 6.10 Tire Management Module

- Track: tire serial number, brand, model, size, installation date, axle position, odometer at installation, tread depth, pressure, damage photos, rotation history, repair, replacement, disposal reason.
- Reports: tire condition, tire age, tire mileage, replacement frequency, unsafe tire, tire cost-per-km (where cost data enabled).
- Critical tire defect triggers No-Go or Conditional Release status based on policy.

### 6.11 Licensing, Renewal & Document Control Module

- Track: Mulkia/registration, insurance, inspection/RAS, site permits, IVMS calibration, fire extinguisher expiry, first aid kit expiry, driver license, defensive driving certificate.
- Reminders at configurable periods: 90/60/30/7 days before expiry.
- Expired critical documents automatically place vehicle or driver in blocked status until renewed.

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
3. If validation passes → submit for approval. If fails → display blocking reasons.
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

---

## 8. Data Model and Master Records

### 8.1 Main Entities

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

### 8.2 Passenger Logistics App Data Entities

| Entity | Key Fields |
|--------|-----------|
| PassengerRequest | request_id, passenger_user_id, pickup_location_id, drop_location_id, requested_time, priority, status, reason, created_by, approved_by. |
| TransportEntitlement | user_id, company/project, eligible_routes, allowed_days/times, approver_id, validity_start, validity_end, entitlement_status. |
| RequestPool | pool_id, route_id, shift_time, pickup_window, planner_id, request_count, capacity_required, pool_status. |
| PassengerManifest | manifest_id, journey_id, passenger_id, boarding_status, validation_method, boarded_time, dropped_time, no_show_reason. |
| BoardingValidationEvent | event_id, journey_id, passenger_id, method, timestamp, location, validation_result, exception_flag. |
| TripScore | trip_id, driver_score, punctuality_score, passenger_service_score, safety_score, closure_score, comments. |
| LoadingActivitySegment | segment_id, journey_id, item/material_ref, quantity, loading_clerk_id, load_time, unload_time, photos, signature. |
| InspectionCampaign | campaign_id, campaign_type, vehicles_scope, start_date, end_date, created_by_workshop_or_hse, status, findings_summary. |

---

## 9. Hardware and IoT Integration Scope

Software must be **hardware-agnostic**. Developer should design a device ingestion layer supporting multiple vendors.

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

### 9.1 Device Integration Requirements

- Support inbound MQTT and HTTPS webhooks for device events.
- Store raw payloads for troubleshooting and normalized events for application use.
- Device mapping table: link device serial/IMEI to vehicle and project.
- Device health dashboard: online/offline, last seen, GPS quality, battery/power, SIM status, firmware version.
- Allow new device adapters without rewriting business logic.

---

## 10. Reporting Requirements

| Report | Primary Users | Minimum Content |
|--------|--------------|----------------|
| Active Journey Report | Journey Manager, HSE | Active vehicles, route, driver, passengers, status, ETA, alerts, last location. |
| Journey Compliance Report | HSE, GM/Ops | Approved vs actual route, delays, deviations, closure status, checkpoint compliance. |
| Driver Behavior Report | HSE, Operations | Overspeed, harsh braking, harsh acceleration, fatigue/driving hours, driver score. |
| Vehicle Readiness Report | GM/Ops, Maintenance, HSE | Available, Conditional, No-Go, under maintenance, expired documents, IVMS/NFC faults. |
| Go / No-Go Report | Maintenance, HSE, Journey Manager | Release decision, reason, approver, expiry, linked work order, photos. |
| Maintenance Report | Maintenance, GM/Ops | Service history, major/minor service, defects, before/after photos, parts, technician, next due. |
| Parts Replacement Report | Maintenance, Procurement | Part number, name, quantity, supplier, vehicle, work order, warranty. |
| Tire Report | Maintenance, HSE | Tire serial, axle position, tread depth, pressure, replacement date, photos, unsafe findings. |
| Licensing & Renewal Report | Admin, GM/Ops, HSE | Mulkia, insurance, inspection, permits, IVMS calibration, fire extinguisher, first aid, expiry reminders. |
| Passenger / Headcount Report | Journey Manager, HSE | Planned passengers, actual count, mismatch events, check-in/out, capacity compliance. |
| Incident / Panic Report | HSE, Emergency, GM/Ops | SOS event, location, driver, vehicle, journey, event timeline, action closure. |
| Audit Log Report | Admin, HSE, Compliance | Approvals, overrides, edits, deletions, status changes, exports, user actions. |
| Passenger Request Fulfilment Report | Logistics Planner, GM/Ops | Requests submitted, approved, rejected, pooled, assigned, completed, cancelled, pending by route/site/department. |
| Passenger Manifest & Boarding Report | Journey Manager, HSE | Approved manifest, actual boarded, validation method, headcount mismatch, no-shows, capacity exceptions. |
| Pickup/Drop Performance Report | Logistics Planner, GM/Ops | On-time pickup, on-time drop, ETA variance, delayed trips, route efficiency, passenger feedback. |
| Inspection Campaign Report | HSE, Maintenance, GM/Ops | Campaign scope, completed/failed inspections, critical defects, corrective actions, closure status. |
| Loading/Unloading Segment Report | Operations, Logistics Planner, HSE | Material/segment records, loading clerk actions, timestamps, photos, exceptions, supervisor approvals. |

---

## 11. Notifications and Escalations

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
| Vehicle capacity/headcount mismatch | Driver, Journey Manager, HSE | Reconcile manifest and actual boarded passengers before departure. |
| Passenger trip delay/ETA change | Passengers, Journey Manager | Notify affected passengers and update live trip status. |
| Passenger boarded without valid manifest | Driver, Journey Manager, HSE | Validate exception or remove passenger per site policy. |
| Inspection campaign overdue | Maintenance, HSE, GM/Ops | Complete inspection or block vehicle per campaign rules. |
| Loading/unloading segment not closed | Operations, Loading Clerk, Journey Manager | Complete segment closure with evidence and approval if required. |

---

## 12. Cybersecurity and Audit Requirements

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

## 13. API and Integration Requirements

| Integration Area | Expected Capability |
|-----------------|-------------------|
| ERP / Finance | Vehicle master, cost centers, work orders, supplier invoices, purchase orders, optional cost fields. |
| HR System | Driver/user profile sync, employment status, department, training/certification records. |
| GIS System | Routes, sites, geofences, road hazards, approved roads, red zones, camps, project boundaries. |
| IVMS / GPS Vendors | Device telemetry ingestion, driver ID events, trip events, alerts, device health. |
| SMS / Email / WhatsApp Gateway | Notifications and escalation messages. |
| BI / Power BI | Scheduled export or API for dashboards and management reports. |
| Document Storage | Secure file storage for photos, PDF certificates, insurance, inspection, service records, videos. |
| Passenger Logistics App / Transport Portal | Create/update passenger requests, pool requests, assign trips, sync status, validate boarding, update ETA/progress, close trips, export analytics via API/webhooks. |

### 13.1 API Design Expectations

- REST API for core CRUD operations and reporting exports.
- Webhook support for journey status, device alerts, maintenance status, and approval events.
- Webhook retry and failure log.
- Pagination, filtering, sorting, and date-range queries for all list endpoints.
- Strict API permission checks matching user roles.
- API versioning from first release: `/api/v1/`.
- Swagger/OpenAPI documentation required.

---

## 14. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99.5%+ for production; final SLA to be agreed. |
| Scalability | Phased growth from pilot fleet to hundreds/thousands of vehicles. |
| Performance | Live map events update within near-real-time limits (subject to device transmission interval and network). |
| Offline Support | Driver mobile app must capture checklist, photos, defect reports offline and sync when network returns. |
| Localization | English first, Arabic-ready UI and report labels recommended. |
| Hosting | Cloud, local Oman cloud, and on-premise deployment options. |
| Configurability | Admin can configure checklist templates, approval rules, notification rules, expiry reminders, vehicle status rules. |
| Maintainability | Modular codebase, documented, automated tests for critical workflows. |

---

## 15. Developer Backlog / Epics

| Epic | Key User Stories |
|------|-----------------|
| User & Access | As admin, I can create roles and assign permissions so users only access approved functions. |
| Vehicle Master | As maintenance, I can create a vehicle profile with VIN, plate, documents, devices, and current status. |
| Driver NFC | As a driver, I can tap my NFC card so the system identifies me and links me to the journey. |
| Journey Planning | As a journey manager, I can create, approve, monitor, and close journeys. |
| Job Execution | As operations, I can assign job plans and verify waypoint completion. |
| IVMS Tracking | As HSE, I can see live vehicle movement and driver behavior alerts. |
| Passenger Headcount | As journey manager, I can verify planned and actual passengers before departure. |
| Maintenance Work Orders | As maintenance, I can open, update, and close work orders with photos and parts. |
| Go / No-Go Control | As HSE/maintenance, I can block or release a vehicle and prevent unsafe journey assignment. |
| Tires & Parts | As storekeeper/maintenance, I can track tire and spare-part replacement history by VIN. |
| Documents & Renewal | As admin, I can receive expiry reminders and block expired vehicles/drivers. |
| Reports & Dashboards | As GM/Ops, I can view KPIs and export monthly compliance reports. |
| Notifications | As a user, I receive alerts based on my role and escalation rules. |
| APIs & Integrations | As a developer, I can integrate devices, ERP, HR, GIS, SMS, and BI tools through documented APIs. |
| Passenger Logistics App | As employee, request pickup/drop. As planner, pool requests and assign vehicle/driver. As passenger, track trip. As driver, validate passengers and close trip. As HSE/workshop, schedule inspection campaigns and review analytics. |

---

## 16. Acceptance Criteria

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

### 16.1 Additional Acceptance Criteria for Passenger Logistics App

- Passenger users can submit pickup/drop requests and receive approval, vehicle/driver, ETA, delay, and closure notifications.
- Logistics planners can pool requests, group by route/shift/site, assign vehicle and driver, convert to approved journey plan.
- Driver app displays allocated passenger trips, route sequence, passenger manifest, boarding validation actions, trip closure.
- Passenger boarding validated by QR/NFC/employee ID/manual confirmation; actual headcount reconciled with manifest and capacity.
- System blocks/alerts when: passenger count exceeds capacity, manifest missing, vehicle No-Go, driver unauthorized, inspection campaign rules unsatisfied.
- Vehicle inspectors, workshop, and HSE users can schedule/complete inspection campaigns with findings, photos, corrective actions, closure status.
- Loading/unloading recorded per journey segment with clerk identity, timestamp, quantity/material reference, photos, closure status.
- Analytics dashboards show: passenger demand, fulfilment, route performance, delays, no-shows, trip score, driver score, inspection findings, service trends.

---

## 17. Implementation Roadmap

| Phase | Scope | Key Output |
|-------|-------|-----------|
| **Phase 1: Discovery & Design** | Confirm users, vehicle types, hardware, routes, documents, approval matrix, forms, reporting format. | Signed functional spec, data model, UI wireframes, integration plan. |
| **Phase 2: MVP Platform** | Vehicle master, driver master, NFC driver ID, basic journey management, live tracking, pre-trip checklist, basic reports. | Pilot-ready platform. |
| **Phase 3: Maintenance & Go/No-Go** | Service records, work orders, photos, parts, tires, license renewal, release workflow, vehicle blocking rules. | Maintenance-controlled journey readiness. |
| **Phase 4: HSE & Passenger Controls** | Passenger manifest/headcount, HSE hold, escalations, driver score, route deviation, compliance reports. | HSE control tower. |
| **Phase 5: Integrations** | ERP/HR/GIS/SMS/BI, device vendor adapters, API hardening, data exports. | Enterprise integration layer. |
| **Phase 6: Advanced Enhancements** | Dashcam/MDVR evidence, AI event detection, predictive maintenance, multilingual UI, contractor portals. | Advanced fleet intelligence platform. |

---

## 18. Open Questions for Developer Discovery

1. Which IVMS/GPS device brands and protocols will be used in the pilot?
2. Will the vehicle immobilizer be physically implemented or initially limited to alerting/blocking journey approval?
3. Which vehicle categories are included first: light vehicles, buses, trucks, excavators, tankers, or all?
4. What is the required hosting model: SaaS, Oman local cloud, on-premise, or hybrid?
5. What are the exact approval levels for high-risk journeys and conditional vehicle release?
6. What passenger counting method will be used first: manual manifest, passenger NFC, door counter, seat sensors, or camera analytics?
7. Are cabin cameras allowed under the client privacy and HSE policy?
8. Which documents are mandatory for the client and which should automatically block vehicle use upon expiry?
9. What KPIs must appear on the GM/Ops dashboard from day one?
10. What external systems must be integrated in the first release?
11. Should passenger trip visibility show driver name/mobile number, or only vehicle ID and ETA due to privacy policy?
12. Should employee transport eligibility be imported from HR, project access control, or manually managed by logistics admin?
13. What boarding validation method is preferred for oil & gas use: NFC card, QR code, employee ID, camera/headcount sensor, or hybrid?
14. Should passenger requests support recurring schedules by shift, camp, office, project, and roster pattern?
15. Should material logistics and passenger logistics be combined in the same trip, or separated by policy?

---

## 19. References

| Source | Link / Notes |
|--------|-------------|
| Fleetbase official platform | https://fleetbase.io/ — modular logistics OS reference. |
| Fleetbase on-premise docs | https://docs.fleetbase.io/deploying/on-premise/ — deploy-on-own-infrastructure reference. |
| Oil & Gas Road Safety / Journey Management | Client-specific and industry road safety standards. |
| OPAL Oman Energy Association | https://opaloman.om/ |
| OPAL Unified Services Platform | https://usp.opaloman.om/our-services/ — RAS and road-safety services. |
| Fleetio preventive maintenance | https://www.fleetio.com/blog/5-components-of-fleet-preventive-maintenance |
| Tasnim Logistics Passenger app | https://play.google.com/store/apps/details?id=djm.cuetrans.passanger — functional reference only. |

---

## Appendix A: Suggested Pre-Trip Checklist Fields

| Category | Checklist Items |
|----------|----------------|
| Vehicle Exterior | Tires, lights, mirrors, windshield, body damage, leaks, plate visibility. |
| Safety Equipment | Seatbelts, fire extinguisher, first aid kit, warning triangle, spare tire/tools. |
| IVMS & Devices | GPS/IVMS working, NFC reader working, camera/MDVR working, panic button test. |
| Documents | Mulkia, insurance, inspection/RAS, site permit, driver license, journey approval. |
| Passengers | Passenger names/IDs, headcount, capacity, seatbelt confirmation. |
| Journey Details | Destination, route, waypoints, planned time, emergency contact, rest stops. |

---

## Appendix B: Suggested Vehicle Status Rules

| Condition | Automatic Status / Action |
|-----------|--------------------------|
| Major service overdue | Set vehicle to No-Go or Conditional Release based on policy. |
| Insurance / Mulkia expired | Set vehicle to Expired Documents and block journey assignment. |
| Critical tire defect | Set vehicle to No-Go and open maintenance work order. |
| IVMS device offline beyond threshold | Set IVMS Fault and alert maintenance/HSE. |
| NFC reader fault | Set NFC Fault and block driver-authenticated journeys unless approved override. |
| HSE incident investigation | Set HSE Hold and block assignment. |
| Maintenance work order closed and approved | Set Available or Conditional Release depending on approval result. |
