# Fleetops Database Schema

PostgreSQL 16 + PostGIS. All tables have `id` (UUID), `created_at`, `updated_at`. Safety tables have `deleted_at` (soft-delete only).

---

## Core

### organizations
```sql
id              UUID PK
name            TEXT NOT NULL
type            TEXT NOT NULL  -- 'company' | 'contractor' | 'department' | 'project' | 'site' | 'camp' | 'workshop'
parent_id       UUID FK → organizations(id)
active          BOOLEAN DEFAULT true
config          JSONB  -- tenant-specific settings
```

### users
```sql
id              UUID PK
email           TEXT UNIQUE NOT NULL
phone           TEXT
name            TEXT NOT NULL
role_id         UUID FK → roles(id)
org_id          UUID FK → organizations(id)
status          TEXT DEFAULT 'active'  -- 'active' | 'locked' | 'inactive'
mfa_secret      TEXT  -- TOTP secret (encrypted)
mfa_enabled     BOOLEAN DEFAULT false
last_login      TIMESTAMPTZ
```

### roles
```sql
id              UUID PK
name            TEXT NOT NULL  -- 'driver' | 'journey_manager' | 'maintenance' | 'hse' | 'gm' | 'storekeeper' | 'admin' | 'planner' | 'passenger'
permissions     TEXT[]  -- ['journey:create', 'vehicle:release', 'incident:close', ...]
org_id          UUID FK → organizations(id)  -- tenant-scoped roles
```

### sessions
```sql
id              UUID PK
user_id         UUID FK → users(id)
refresh_token   TEXT NOT NULL
expires_at      TIMESTAMPTZ NOT NULL
ip              INET
user_agent      TEXT
revoked         BOOLEAN DEFAULT false
```

---

## Fleet

### vehicles
```sql
id              UUID PK
plate_no        TEXT NOT NULL  -- Oman format: 12-A-3471
fleet_no        TEXT
vin             TEXT  -- 17 char, no I/O/Q
engine_no       TEXT
make            TEXT NOT NULL
model           TEXT NOT NULL
year            INT NOT NULL
type            TEXT NOT NULL  -- 'light' | 'bus' | 'truck' | 'excavator' | 'tanker'
seat_count      INT NOT NULL
owner           TEXT
project_id      UUID FK → organizations(id)
base_location   TEXT
status          TEXT NOT NULL DEFAULT 'available'
  -- 'available' | 'conditional' | 'under_maintenance' | 'no_go' | 'expired_documents' | 'ivms_fault' | 'nfc_fault' | 'hse_hold' | 'decommissioned'
conditional_expiry TIMESTAMPTZ  -- null unless status = 'conditional'
odometer        INT  -- km
engine_hours    INT  -- hours
org_id          UUID FK → organizations(id)
deleted_at      TIMESTAMPTZ

CONSTRAINT chk_plate_format CHECK (plate_no ~ '^\d{1,2}-[A-Z]-\d{3,4}$')
CONSTRAINT chk_vin CHECK (vin ~ '^[A-HJ-NPR-Z0-9]{17}$' OR vin IS NULL)
```

### drivers
```sql
id              UUID PK
employee_id     TEXT
name            TEXT NOT NULL
license_no      TEXT NOT NULL
license_class   TEXT NOT NULL  -- 'A' | 'B' | 'C' | 'D' | 'E'
license_expiry  DATE NOT NULL
ddc_expiry      DATE  -- Defensive Driving Certificate
medical_expiry  DATE
authorized_types TEXT[]  -- vehicle types this driver can operate
nfc_card_uid    TEXT UNIQUE  -- '04:E2:1F:8B' format
nfc_issued_at   TIMESTAMPTZ
status          TEXT DEFAULT 'active'  -- 'active' | 'inactive' | 'suspended'
score           NUMERIC(5,2)  -- driver behavior score 0-100
org_id          UUID FK → organizations(id)
deleted_at      TIMESTAMPTZ
```

### devices
```sql
id              UUID PK
type            TEXT NOT NULL  -- 'ivms' | 'nfc_reader' | 'passenger_counter' | 'dashcam' | 'panic_button'
serial_no       TEXT NOT NULL
imei            TEXT
sim_no          TEXT
apn             TEXT
vehicle_id      UUID FK → vehicles(id)
firmware        TEXT
last_seen       TIMESTAMPTZ
health_status   TEXT DEFAULT 'unknown'  -- 'online' | 'offline' | 'fault'
gps_quality     INT  -- 0-100
battery_pct     INT
org_id          UUID FK → organizations(id)
```

---

## Documents

### documents
```sql
id              UUID PK
entity_type     TEXT NOT NULL  -- 'vehicle' | 'driver'
entity_id       UUID NOT NULL  -- FK to vehicles or drivers
document_type   TEXT NOT NULL  -- 'mulkia' | 'insurance' | 'ras' | 'site_permit' | 'fire_extinguisher' | 'first_aid' | 'license' | 'ddc' | 'medical'
reference_no    TEXT
issued_date     DATE
expiry_date     DATE NOT NULL
reminder_days   INT[] DEFAULT '{90,60,30,7}'
file_url        TEXT  -- MinIO path
status          TEXT DEFAULT 'valid'  -- 'valid' | 'expiring' | 'expired'
blocks_on_expiry BOOLEAN DEFAULT true  -- auto-block vehicle/driver?
org_id          UUID FK → organizations(id)
deleted_at      TIMESTAMPTZ
```

---

## Journeys

### journeys
```sql
id              UUID PK
journey_no      TEXT UNIQUE NOT NULL  -- 'JM-25-04018' auto-generated
vehicle_id      UUID FK → vehicles(id)
driver_id       UUID FK → drivers(id)
route_id        UUID FK → routes(id)
purpose         TEXT
job_plan_id     UUID FK → job_plans(id)
planned_departure TIMESTAMPTZ NOT NULL
planned_arrival   TIMESTAMPTZ NOT NULL
actual_departure  TIMESTAMPTZ
actual_arrival    TIMESTAMPTZ
risk_score      NUMERIC(4,2)  -- 0-10
risk_level      TEXT  -- 'L' | 'M' | 'H'
status          TEXT DEFAULT 'draft'
  -- 'draft' | 'pending_approval' | 'approved' | 'active' | 'delayed' | 'deviated' | 'completed' | 'closed' | 'rejected' | 'cancelled' | 'emergency'
emergency_contact TEXT
approved_by     UUID FK → users(id)
approved_at     TIMESTAMPTZ
closed_by       UUID FK → users(id)
closed_at       TIMESTAMPTZ
rejection_reason TEXT
vehicle_status_at_creation TEXT NOT NULL  -- snapshot: must be 'available' or 'conditional'
org_id          UUID FK → organizations(id)
created_by      UUID FK → users(id)
deleted_at      TIMESTAMPTZ

CONSTRAINT chk_vehicle_status CHECK (vehicle_status_at_creation IN ('available', 'conditional'))
```

### journey_passengers
```sql
id              UUID PK
journey_id      UUID FK → journeys(id)
passenger_id    UUID  -- FK to users or external ID
passenger_name  TEXT NOT NULL
employee_id     TEXT
department      TEXT
pickup_point    TEXT
boarding_status TEXT DEFAULT 'manifested'  -- 'manifested' | 'boarded' | 'alighted' | 'no_show'
boarding_method TEXT  -- 'nfc' | 'qr' | 'employee_id' | 'manual'
boarded_at      TIMESTAMPTZ
alighted_at     TIMESTAMPTZ
```

### journey_waypoints
```sql
id              UUID PK
journey_id      UUID FK → journeys(id)
sequence        INT NOT NULL
name            TEXT NOT NULL
location        GEOGRAPHY(Point, 4326) NOT NULL
planned_arrival TIMESTAMPTZ
actual_arrival  TIMESTAMPTZ
status          TEXT DEFAULT 'pending'  -- 'pending' | 'current' | 'done' | 'skipped'
notes           TEXT
```

### journey_approvals
```sql
id              UUID PK
journey_id      UUID FK → journeys(id)
step            TEXT NOT NULL  -- 'submitter' | 'journey_mgr' | 'hse' | 'final'
user_id         UUID FK → users(id)
decision        TEXT  -- 'approved' | 'rejected' | 'pending'
reason          TEXT
decided_at      TIMESTAMPTZ
```

---

## Routes & Geofences

### routes
```sql
id              UUID PK
name            TEXT NOT NULL  -- 'Marmul → Nimr-2'
origin          TEXT NOT NULL
destination     TEXT NOT NULL
path            GEOGRAPHY(LineString, 4326) NOT NULL
distance_km     NUMERIC(8,2)
estimated_minutes INT
approved        BOOLEAN DEFAULT false
risk_zones      JSONB  -- segments with elevated risk
org_id          UUID FK → organizations(id)

INDEX idx_routes_path USING GIST (path)
```

### geofences
```sql
id              UUID PK
name            TEXT NOT NULL
type            TEXT NOT NULL  -- 'site' | 'camp' | 'restricted' | 'red_zone' | 'refuel' | 'checkpoint'
boundary        GEOGRAPHY(Polygon, 4326) NOT NULL
radius_m        INT  -- for circular fences
alert_on_entry  BOOLEAN DEFAULT false
alert_on_exit   BOOLEAN DEFAULT false
active          BOOLEAN DEFAULT true
org_id          UUID FK → organizations(id)

INDEX idx_geofences_boundary USING GIST (boundary)
```

---

## IVMS / Telemetry

### telemetry_logs
```sql
-- Partitioned by month for query performance
id              UUID PK
vehicle_id      UUID NOT NULL  -- no FK for write performance
device_id       UUID NOT NULL
driver_id       UUID
journey_id      UUID
position        GEOGRAPHY(Point, 4326) NOT NULL
speed           NUMERIC(6,2)  -- km/h
heading         NUMERIC(5,2)  -- degrees
ignition        BOOLEAN
fuel_pct        INT
engine_rpm      INT
odometer        INT
engine_hours    INT
raw_payload     JSONB  -- original device message
recorded_at     TIMESTAMPTZ NOT NULL  -- device timestamp
received_at     TIMESTAMPTZ DEFAULT now()  -- server timestamp

INDEX idx_telemetry_vehicle_time ON telemetry_logs (vehicle_id, recorded_at DESC)
INDEX idx_telemetry_journey ON telemetry_logs (journey_id, recorded_at) WHERE journey_id IS NOT NULL
INDEX idx_telemetry_position USING GIST (position)
) PARTITION BY RANGE (recorded_at);
```

### events
```sql
id              UUID PK
vehicle_id      UUID FK → vehicles(id)
driver_id       UUID FK → drivers(id)
journey_id      UUID FK → journeys(id)
device_id       UUID FK → devices(id)
event_type      TEXT NOT NULL  -- 'overspeed' | 'harsh_braking' | 'harsh_accel' | 'idle' | 'deviation' | 'panic' | 'tamper' | 'offline' | 'geofence_entry' | 'geofence_exit' | 'unauthorized_driver' | 'night_driving'
severity        TEXT NOT NULL  -- 'critical' | 'warning' | 'info'
position        GEOGRAPHY(Point, 4326)
speed           NUMERIC(6,2)
details         JSONB  -- event-specific data
action_status   TEXT DEFAULT 'open'  -- 'open' | 'acknowledged' | 'resolved' | 'escalated'
recorded_at     TIMESTAMPTZ NOT NULL
org_id          UUID FK → organizations(id)
deleted_at      TIMESTAMPTZ  -- soft delete only

INDEX idx_events_vehicle_time ON events (vehicle_id, recorded_at DESC)
INDEX idx_events_severity ON events (severity, recorded_at DESC) WHERE severity = 'critical'
INDEX idx_events_journey ON events (journey_id) WHERE journey_id IS NOT NULL
```

---

## Maintenance

### work_orders
```sql
id              UUID PK
wo_number       TEXT UNIQUE NOT NULL  -- 'WO-12035' auto-generated
vehicle_id      UUID FK → vehicles(id)
issue_type      TEXT NOT NULL  -- 'preventive' | 'corrective' | 'breakdown' | 'accident' | 'tire' | 'battery' | 'ivms' | 'nfc' | 'license_renewal'
priority        TEXT DEFAULT 'medium'  -- 'critical' | 'high' | 'medium' | 'low'
title           TEXT NOT NULL
description     TEXT
status          TEXT DEFAULT 'inbound'
  -- 'inbound' | 'in_bay' | 'awaiting_parts' | 'hse_review' | 'ready' | 'closed'
bay             TEXT  -- workshop bay number
technician_id   UUID FK → users(id)
release_decision TEXT  -- 'go' | 'conditional' | 'no_go'
release_reason  TEXT
release_expiry  TIMESTAMPTZ  -- for conditional release
hse_cosign      TEXT DEFAULT 'auto'  -- 'auto' | 'required' | 'skipped'
hse_approved_by UUID FK → users(id)
hse_approved_at TIMESTAMPTZ
odometer_at     INT
engine_hours_at INT
opened_by       UUID FK → users(id)
opened_at       TIMESTAMPTZ DEFAULT now()
closed_at       TIMESTAMPTZ
target_hours    NUMERIC(4,1)  -- SLA target
org_id          UUID FK → organizations(id)
deleted_at      TIMESTAMPTZ
```

### work_order_parts
```sql
id              UUID PK
wo_id           UUID FK → work_orders(id)
part_number     TEXT NOT NULL
part_name       TEXT NOT NULL
oem_aftermarket TEXT  -- 'oem' | 'aftermarket'
supplier        TEXT
quantity        INT DEFAULT 1
warranty_months INT
old_part_disposed BOOLEAN DEFAULT false
cost_baisa      INT  -- optional, stored in baisa (1 OMR = 1000 baisa)
```

### work_order_photos
```sql
id              UUID PK
wo_id           UUID FK → work_orders(id)
label           TEXT  -- 'before_gauge' | 'after_installed' | etc.
file_url        TEXT NOT NULL  -- MinIO path
uploaded_at     TIMESTAMPTZ DEFAULT now()
uploaded_by     UUID FK → users(id)
```

### work_order_activity
```sql
id              UUID PK
wo_id           UUID FK → work_orders(id)
user_id         UUID FK → users(id)
action          TEXT NOT NULL  -- 'opened' | 'assigned' | 'photo_added' | 'part_added' | 'status_changed' | 'released' | 'hse_approved'
details         JSONB
timestamp       TIMESTAMPTZ DEFAULT now()
```

### tires
```sql
id              UUID PK
serial_no       TEXT UNIQUE NOT NULL
brand           TEXT
model           TEXT
size            TEXT  -- '265/65R17'
vehicle_id      UUID FK → vehicles(id)
axle_position   TEXT  -- 'P1' | 'P2' | 'P3' | 'P4' | 'spare'
install_date    DATE
install_odometer INT
tread_depth_mm  NUMERIC(4,1)
pressure_psi    NUMERIC(5,1)
status          TEXT DEFAULT 'active'  -- 'active' | 'worn' | 'damaged' | 'replaced' | 'disposed'
disposal_reason TEXT
org_id          UUID FK → organizations(id)
```

---

## HSE

### incidents
```sql
id              UUID PK
event_id        UUID FK → events(id)
vehicle_id      UUID FK → vehicles(id)
driver_id       UUID FK → drivers(id)
journey_id      UUID FK → journeys(id)
tier            INT DEFAULT 1  -- 1 | 2 | 3
status          TEXT DEFAULT 'active'  -- 'active' | 'responding' | 'escalated' | 'closed'
situation       TEXT
position        GEOGRAPHY(Point, 4326)
started_at      TIMESTAMPTZ DEFAULT now()
closed_at       TIMESTAMPTZ
closed_by       UUID FK → users(id)
closure_report  TEXT
org_id          UUID FK → organizations(id)
deleted_at      TIMESTAMPTZ  -- soft delete
```

### incident_steps
```sql
id              UUID PK
incident_id     UUID FK → incidents(id)
step_number     INT NOT NULL
description     TEXT NOT NULL
status          TEXT DEFAULT 'pending'  -- 'pending' | 'active' | 'done' | 'skipped'
completed_by    UUID FK → users(id)
completed_at    TIMESTAMPTZ
skip_reason     TEXT
```

---

## Passenger

### passenger_requests
```sql
id              UUID PK
request_no      TEXT UNIQUE NOT NULL
user_id         UUID FK → users(id)
pickup_location_id UUID FK → geofences(id)
drop_location_id   UUID FK → geofences(id)
requested_time  TIMESTAMPTZ NOT NULL
priority        TEXT DEFAULT 'normal'  -- 'normal' | 'high' | 'urgent'
trip_type       TEXT DEFAULT 'one_way'  -- 'one_way' | 'round_trip' | 'recurring'
status          TEXT DEFAULT 'pending'  -- 'pending' | 'pooled' | 'assigned' | 'approved' | 'rejected' | 'cancelled'
pool_id         UUID FK → request_pools(id)
journey_id      UUID FK → journeys(id)
rejection_reason TEXT
notes           TEXT
org_id          UUID FK → organizations(id)
```

### transport_entitlements
```sql
id              UUID PK
user_id         UUID FK → users(id)
eligible_routes UUID[]  -- route IDs
allowed_days    TEXT[]  -- 'MON','TUE',...
allowed_times   TSTZRANGE  -- time window
approver_id     UUID FK → users(id)
validity_start  DATE NOT NULL
validity_end    DATE NOT NULL
status          TEXT DEFAULT 'active'
org_id          UUID FK → organizations(id)
```

### request_pools
```sql
id              UUID PK
route_id        UUID FK → routes(id)
shift_time      TIMESTAMPTZ
pickup_window   TSTZRANGE
planner_id      UUID FK → users(id)
vehicle_id      UUID FK → vehicles(id)
driver_id       UUID FK → drivers(id)
request_count   INT DEFAULT 0
capacity_needed INT DEFAULT 0
status          TEXT DEFAULT 'building'  -- 'building' | 'assigned' | 'converted' | 'cancelled'
org_id          UUID FK → organizations(id)
```

### boarding_events
```sql
id              UUID PK
journey_id      UUID FK → journeys(id)
passenger_id    UUID
method          TEXT NOT NULL  -- 'nfc' | 'qr' | 'employee_id' | 'manual'
validation_result TEXT NOT NULL  -- 'valid' | 'invalid' | 'not_on_manifest' | 'exception'
position        GEOGRAPHY(Point, 4326)
timestamp       TIMESTAMPTZ DEFAULT now()
exception_flag  BOOLEAN DEFAULT false
exception_note  TEXT
```

---

## Notifications

### notifications
```sql
id              UUID PK
user_id         UUID FK → users(id)
type            TEXT NOT NULL  -- event type that triggered it
title           TEXT NOT NULL
body            TEXT
channel         TEXT NOT NULL  -- 'email' | 'sms' | 'whatsapp' | 'push' | 'inapp'
status          TEXT DEFAULT 'pending'  -- 'pending' | 'sent' | 'delivered' | 'failed'
read            BOOLEAN DEFAULT false
data            JSONB  -- click-through context
sent_at         TIMESTAMPTZ
```

---

## Admin

### workflows
```sql
id              UUID PK
name            TEXT NOT NULL
key             TEXT UNIQUE NOT NULL  -- 'JM-APPROVAL' | 'VEH-RELEASE' | etc.
current_version INT DEFAULT 1
org_id          UUID FK → organizations(id)
```

### workflow_versions
```sql
id              UUID PK
workflow_id     UUID FK → workflows(id)
version         INT NOT NULL
status          TEXT DEFAULT 'draft'  -- 'draft' | 'published' | 'archived'
nodes           JSONB NOT NULL  -- [{id, type, config, position}]
edges           JSONB NOT NULL  -- [{from, to, condition}]
published_at    TIMESTAMPTZ
published_by    UUID FK → users(id)
```

### workflow_executions
```sql
id              UUID PK
workflow_id     UUID FK → workflows(id)
version_id      UUID FK → workflow_versions(id)
entity_type     TEXT NOT NULL  -- 'journey' | 'work_order' | etc.
entity_id       UUID NOT NULL
current_node    TEXT  -- node ID within the graph
status          TEXT DEFAULT 'running'  -- 'running' | 'waiting_approval' | 'waiting_timer' | 'completed' | 'failed'
context         JSONB  -- runtime variables
started_at      TIMESTAMPTZ DEFAULT now()
completed_at    TIMESTAMPTZ
```

---

## Audit

### audit_logs
```sql
id              UUID PK
user_id         UUID  -- null for system actions
action          TEXT NOT NULL  -- 'POST /api/v1/journeys' | 'journey.status.changed' | etc.
entity_type     TEXT NOT NULL
entity_id       UUID
before_value    JSONB
after_value     JSONB
status_code     INT
ip              INET
user_agent      TEXT
timestamp       TIMESTAMPTZ DEFAULT now()
org_id          UUID FK → organizations(id)

-- APPEND ONLY — no UPDATE, no DELETE granted to app role
INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, timestamp DESC)
INDEX idx_audit_user ON audit_logs (user_id, timestamp DESC)
```
