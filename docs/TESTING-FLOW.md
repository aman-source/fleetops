# Fleetops — End-to-End Functional Testing Flow

**App URL:** http://localhost:3001
**API URL:** http://localhost:3000
**All passwords:** `Fleetops@2026`

---

## Users (all pre-seeded)

| Email | Role | Org |
|-------|------|-----|
| admin@artech.om | Admin | AR Technology |
| gm@artech.om | General Manager | AR Technology |
| jm@artech.om | Journey Manager | Marmul Operations |
| hse@artech.om | HSE Officer | Marmul Operations |
| maint@artech.om | Maintenance | Marmul Workshop |
| driver1@artech.om | Driver | Marmul Operations |
| driver2@artech.om | Driver | Nimr-2 Operations |
| planner@artech.om | Planner | Marmul Operations |
| store@artech.om | Storekeeper | Marmul Workshop |
| pax@artech.om | Passenger | Marmul Operations |

---

## Flow 1 — Core Journey (Happy Path)

This is the main safety-critical flow. Every step must complete in order.

### Step 1: Admin — Add a Vehicle

Login as `admin@artech.om`

1. Go to **Fleet** page
2. Click **Add Vehicle**
3. Fill in:
   - Plate: `12-A-3471`
   - Make/Model: e.g. Toyota Land Cruiser
   - Year: 2022
   - Seats: 7
   - Status: **Available**
4. Save → note the vehicle ID

### Step 2: Admin — Attach IVMS Device to Vehicle

1. Still as admin, go to **Admin > Devices** (or via API)
2. Add device:
   - Serial No: `IVMS-0001`
   - Linked to vehicle: `12-A-3471`
3. This is required for Gate 2 (vehicle readiness)

### Step 3: Admin — Upload Vehicle Documents

1. Go to **Documents**
2. Upload 3 documents for this vehicle:
   - **Mulkia** (registration) — set expiry 1 year from today
   - **Insurance** — set expiry 1 year from today
   - **RAS** (roadworthiness inspection) — set expiry 1 year from today
3. All 3 must be valid (non-expired) for Gate 3 to PASS

### Step 4: Admin — Verify Driver Record Exists

1. Go to **Fleet > Drivers** tab
2. Confirm `Salim Al-Harthi` (driver1) exists with:
   - Valid license
   - License not expired
   - No active incidents blocking him

> If driver record missing, create one linked to the `driver1` user account.

### Step 5: Journey Manager — Create Journey Draft

Logout. Login as `jm@artech.om`

1. Go to **Journeys** page
2. Click **New Journey**
3. Fill in:
   - Vehicle: `12-A-3471`
   - Driver: `Salim Al-Harthi`
   - Origin: `Marmul Base Camp`
   - Destination: `Nimr-2 Field Site`
   - Planned Departure: tomorrow at 07:00
   - Planned Arrival: tomorrow at 09:00
   - Passengers: add 2–3 passengers (below seat capacity of 7)
4. Save draft → you get a Journey ID (e.g. `J-0001`)

### Step 6: Journey Manager — Check Gates

1. Open the journey
2. Click **Check Gates** or navigate to gates view
3. You should see 6 gates evaluated:

| Gate | Checks |
|------|--------|
| Gate 1: Driver Auth | License valid, no fatigue (< 10h driven in last 24h), no open incidents |
| Gate 2: Vehicle Readiness | Status = available, IVMS device attached, no fault, no blocking inspection |
| Gate 3: Documents | Mulkia + Insurance + RAS all present and non-expired |
| Gate 4: Route & Risk | Risk score calculated (based on route, driver history) |
| Gate 5: Passengers | Headcount ≤ seat capacity, no unconfirmed passengers |
| Gate 6: HSE Approval | HSE has not blocked this vehicle/driver |

4. All 6 must show **PASS** (or REVIEW — not BLOCK) before submit

> If any gate shows BLOCK: fix the underlying issue (e.g. upload missing doc, change vehicle, etc.)

### Step 7: Journey Manager — Submit Journey

1. All gates green → click **Submit for Approval**
2. Server RE-VALIDATES all 6 gates server-side (ignores UI state)
3. Journey status changes: `draft` → `pending_approval`

### Step 8: Journey Manager — Approve (Level 1)

1. Still as JM, go to the journey
2. Click **Approve**
3. Journey may require HSE co-sign (Level 2) depending on risk score

### Step 9: HSE Officer — Co-Sign (Level 2)

Logout. Login as `hse@artech.om`

1. Go to **Journeys** (or HSE console)
2. Find the pending journey `J-0001`
3. Review the risk details
4. Click **HSE Approve**
5. Journey status: `pending_approval` → `approved`

> If risk score is HIGH, HSE co-sign is mandatory. If LOW, journey may auto-approve after JM.

### Step 10: Driver — Activate Journey

Logout. Login as `driver1@artech.om`

1. Go to **My Journeys** or **Today** screen
2. Find `J-0001` — status: `approved`
3. Click **Start Journey** / **Activate**
4. Journey status: `approved` → `active`
5. Vehicle status auto-changes: `available` → `in_use`

### Step 11: Live Tracking (MQTT Telemetry)

While journey is active, simulate GPS telemetry via MQTT:

```bash
# From terminal (requires mosquitto_pub or use API)
curl -X POST http://localhost:3000/api/v1/ivms/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "serialNo": "IVMS-0001",
    "lat": 18.13,
    "lng": 55.20,
    "speed": 80,
    "heading": 45
  }'
```

Or open the **Live Map** page as JM/Admin — you should see the vehicle moving in real-time via WebSocket.

### Step 12: Driver — Close Journey

1. Still as driver1
2. Journey is active → click **End Journey**
3. Journey status: `active` → `closed`
4. Vehicle status: `in_use` → `available`

---

## Flow 2 — Vehicle Maintenance

Test the maintenance Go/No-Go workflow.

### Step 1: Maintenance — Create Work Order

Login as `maint@artech.om`

1. Go to **Maintenance**
2. Click **New Work Order**
3. Select vehicle `12-A-3471`
4. Type: Scheduled service
5. Save → WO created, vehicle status may change to `maintenance`

### Step 2: Maintenance — Release Vehicle

1. Open work order
2. Mark tasks complete
3. Click **Release Vehicle**
4. Choose: **GO** / **CONDITIONAL** / **NO-GO**
   - **GO** = fully released, vehicle → `available`
   - **CONDITIONAL** = released with restrictions + expiry date → `conditional`
   - **NO-GO** = blocked → `no_go`

### Step 3: HSE Co-Sign (if required)

If HSE co-sign is configured for this workflow:

1. Login as `hse@artech.om`
2. Go to **HSE Console**
3. Find the pending vehicle release
4. Click **Approve Release**

---

## Flow 3 — HSE Incident

Test the safety incident flow.

### Step 1: Report Incident

Login as `hse@artech.om`

1. Go to **HSE**
2. Click **New Incident**
3. Fill in:
   - Type: Near Miss / Injury / Vehicle Damage
   - Severity: Low / Medium / High / Critical
   - Vehicle + Driver involved
   - Description
4. Save

### Step 2: Investigate

1. Add investigation notes
2. Upload evidence photo
3. Set status: `investigating` → `resolved`

### Step 3: Panic Event (Critical Path)

To test panic:

```bash
curl -X POST http://localhost:3000/api/v1/ivms/panic \
  -H "Content-Type: application/json" \
  -d '{"serialNo": "IVMS-0001"}'
```

Expected: immediate push notification, HSE console auto-opens, event logged as `critical`.

---

## Flow 4 — RBAC (Access Control Test)

Verify each role can only do what it should:

| Action | admin | gm | jm | hse | maint | driver |
|--------|-------|----|----|-----|-------|--------|
| Create journey | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Approve journey | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Activate journey | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Release vehicle | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| HSE approve | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| View analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Admin panel | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

Test: login as each role, try a forbidden action → expect 403 response.

---

## Flow 5 — Analytics & Reports

Login as `admin@artech.om` or `gm@artech.om`

1. Go to **Analytics** page
2. Check KPI cards load (fleet utilization, journey count, incident rate)
3. Go to **Reports**
4. Generate a **Journey Summary Report** for last 7 days
5. Download as PDF or CSV
6. Verify file downloads correctly

---

## Common Blockers & Fixes

| Symptom | Fix |
|---------|-----|
| Gate 2 BLOCK: no IVMS device | Add device in Admin > Devices, link to vehicle |
| Gate 3 BLOCK: missing docs | Upload Mulkia + Insurance + RAS in Documents |
| Gate 3 BLOCK: expired docs | Re-upload with future expiry date |
| Gate 1 BLOCK: driver fatigue | Wait (or use a different driver) — fatigue = 10h+ in last 24h |
| Submit fails with 422 | Gates not all PASS — check gates endpoint for which one is blocking |
| Can't activate: still `approved` | Login as the assigned driver, not JM |
| Vehicle stuck in `maintenance` | Maintenance must release it first |

---

## Quick API Test (no UI)

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@artech.om","password":"Fleetops@2026"}' \
  | jq -r '.data.token')

# 2. List vehicles
curl -s http://localhost:3000/api/v1/fleet/vehicles \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].plate_no'

# 3. List journeys
curl -s http://localhost:3000/api/v1/journeys \
  -H "Authorization: Bearer $TOKEN" | jq '.data[].journeyNo'

# 4. Check health
curl http://localhost:3000/health
```

---

## What's NOT Tested Yet (fixme tests)

These features exist in the codebase but E2E tests are marked skip:
- Checklist templates (HSE pre-trip checklists)
- NFC card reader integration
- Cross-org work orders
- Geofence alerts
- Job plans
- Loading/cargo segments
