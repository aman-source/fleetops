# Handoff: Fleetops — Journey, Fleet & HSE Control Tower

**For:** AR Technology / oil & gas-grade fleet operations platform  
**Source spec:** `source/requirement.md` (v1.0–1.1, 09 May 2026) and `source/AR_Technology_Journey_Fleet_Management.docx`  
**Design fidelity:** High-fidelity (hifi) hand-coded React/HTML prototypes  
**Design date:** 13 May 2026

---

## 0. About this bundle — read first

The files in this bundle are **design references created in HTML** — visual prototypes showing the intended look, layout, and behavior of every major screen across the Fleetops platform. They are **not production code to copy directly**.

Your task is to **recreate these HTML designs in the target codebase's existing environment** (React/Next.js, Vue/Nuxt, SwiftUI, Flutter, native Android, etc.) using its established patterns, component library, state management, and routing. If no target environment exists yet, choose the most appropriate framework for the system requirements (see §1) and implement the designs there.

In particular:
- The prototypes use inline-Babel React with `<script type="text/babel">` so they run from a static file. Do not ship this pattern; use a real build pipeline.
- Styling is hand-rolled CSS variables with utility classes (`.row`, `.col`, `.grow`, `.gap-N`, `.panel`, `.pill`, etc.). Reimplement with whatever your codebase uses (Tailwind, CSS Modules, vanilla-extract, styled-components, etc.) but **keep the design tokens** (§5).
- All data shown in the screens (driver names, plate numbers, journey IDs, KPI values, events) is **placeholder Omani/PDO-style realistic data**. Replace with real data from the API.
- Maps use Leaflet + free CartoDB tiles. In production, choose a tile provider per your hosting/cost/licensing model (Mapbox, MapTiler, ESRI ArcGIS, Google Maps, or self-hosted) but **keep the visual hierarchy** (basemap tone, route colors, marker styles, geofence treatment).

---

## 1. Overview

Fleetops is a **multi-module enterprise platform** for oil & gas fleet operations — a "digital control tower" linking vehicle, driver, journey plan, job plan, passengers, maintenance, tires, documents, IVMS data, and HSE approvals.

**The non-negotiable core rule** is encoded everywhere in this design:

> A journey cannot start unless the driver is authorized, the vehicle is technically fit, documents are valid, headcount is confirmed, and the journey is approved. Maintenance and HSE users release, block, or conditionally approve vehicles using a **Go / No-Go workflow**.

That rule is the system's "physics." The whole UI is shaped to enforce it: every screen surfaces the current Go/No-Go state, gates are explicit and named, and overrides go through documented audit-logged workflows.

### Personas & surfaces

| Surface | Role(s) | Form factor | Reference file |
|---|---|---|---|
| **Control Tower** | Journey Manager / Dispatcher | Desktop web (1280×820+) | `control-tower-map.jsx`, `control-tower-journey.jsx` |
| **Driver app** | Driver | iOS/Android phone | `driver-app.jsx` |
| **Passenger app** | Employee / contractor passenger | iOS/Android phone | `passenger-app.jsx` |
| **Logistics Planner Hub** | Logistics Planner | Desktop web | `ops-consoles.jsx` (`PlannerHub`) |
| **Maintenance** | Maintenance team, Storekeeper | Desktop web | `ops-consoles.jsx` (`MaintWorkshop`, `MaintWorkOrder`) |
| **HSE Console** | HSE officer | Desktop web | `ops-consoles.jsx` (`HSEConsole`) |
| **GM/Ops dashboard** | GM / Operations Manager | Desktop web | `ops-consoles-2.jsx` (`GMDashboard`) |
| **Vehicle Master** | All ops roles (read-mostly) | Desktop web | `ops-consoles-2.jsx` (`VehicleProfile`) |
| **Admin** | System Administrator | Desktop web | `ops-consoles-2.jsx` (`AdminConfig`) |

### Backend expectations

The detailed functional spec lives in `source/requirement.md`. Key technical implications for the implementer:

- **Hardware-agnostic IVMS ingestion layer** (MQTT + HTTPS webhooks) with normalized event model and per-device adapters.
- **Role-based access control** at UI, API, and workflow-engine layers; admin/HSE/GM roles require MFA.
- **Strict audit log** for every status change, approval, override, export. Soft-delete with retention; no hard delete of safety records.
- **Multi-tenant** structure: company → contractor → project → site → camp.
- **REST API + webhooks**, versioned `/api/v1/`, OpenAPI documented.
- **Offline-first driver app** — pre-trip checklist, photos, defect reports must capture offline and sync on reconnect.
- **i18n** — English first, Arabic-ready (RTL) for UI and reports.
- **Hosting** — must support SaaS, Oman local cloud, and on-premise.

Read §11 of `source/requirement.md` for the full notification/escalation matrix, §13 for API surface, §14 for NFRs.

---

## 2. Fidelity

**High-fidelity.** Every screen is a pixel-considered final design — final type pairing, status palette, density, spacing, microcopy, and interaction affordances. Recreate visually at parity with the prototypes; do not "reinterpret" the layout.

The exceptions (where the prototype is intentionally schematic, not pixel-final):
- **Map terrain & exact vehicle positions.** The Leaflet maps render real Omani geography around Marmul/Nimr/Fahud/Saih Rawl/Bahja/Muscat, but vehicle positions and route waypoints are placeholder. Wire your live IVMS feed.
- **Photo evidence placeholders.** The before/after photo blocks in Maintenance Work Order are striped placeholders. Use real uploaded images.
- **Driver headshots.** Placeholder avatars; use real HR-system photos or initials.
- **Chart data on GM dashboard.** Plotted from hard-coded series in the prototype. Wire to your analytics pipeline.

---

## 3. Screens — exhaustive list

There are **16 hero screens** organized into 4 sections. Below: name, purpose, layout shape, primary components, and exact source location.

### 3.A. Control Tower (Journey Manager) — desktop

#### Screen 01 — Live fleet map (`CTLiveMap` in `control-tower-map.jsx`)
- **Purpose:** Operational nerve center. Dispatcher sees every vehicle's live position, status, and journey at a glance.
- **Layout:** 220px sidebar · main column (52px topbar · KPI strip · main grid). Main grid splits into a large left map panel + 340px right rail containing event stream and active journey list.
- **Map:** Leaflet, centered on `[20.0, 56.1]` zoom 7, dark CartoDB Dark Matter tiles by default. Real routes (multi-segment polylines), real geofences (`L.rectangle` and `L.circle`), real vehicle pins (`L.marker` with `L.divIcon`).
- **KPI strip:** 4 panels — `ACTIVE 47`, `GO 218`, `NO-GO 14`, `DEFECTS 8` — each with sparkline.
- **Filter tabs above map:** All fleet · Active journeys · No-Go · Geofences · Heat.
- **Event stream (right):** virtualized list of recent IVMS events with severity color rail (left edge bar): overspeed, idle, waypoint, deviation, harsh braking, journey closed.
- **Active journeys (right):** card list with progress bar tinted by status.

#### Screen 02 — Journey composer · Go/No-Go gates (`CTJourneyComposer` in `control-tower-journey.jsx`)
- **Purpose:** The flagship gating screen. The user cannot submit a journey for approval until all six gates pass. This is where the "physics" of the system is made tangible.
- **Layout:** Sidebar · topbar (with stepper) · body splits into a scrollable gate column + a 340px right summary rail.
- **The six gates** (each a collapsible panel with header and check rows):
  1. **Driver authorization** — license, DDC cert, medical, authorized vehicle types, NFC card
  2. **Vehicle readiness** — maintenance status, tires, IVMS device, NFC reader, panic button
  3. **Documents & permits** — Mulkia, insurance, RAS, site permit, fire extinguisher, first aid
  4. **Route & risk** — approved roads, daylight window, weather, refuel, comms coverage
  5. **Passengers & headcount** — manifest count, capacity, eligibility, boarding method
  6. **HSE approval** — risk level, last incident, fatigue, HSE officer assigned
- **Each gate header** shows GO / REVIEW / BLOCK pill and a count of failed checks.
- **Top banner** summarizes blocking items and surfaces "Cannot submit yet — 2 blocking items, 1 review item · 4 / 6 gates cleared."
- **Right rail:** journey summary (route, ETA, risk score), passenger manifest with per-passenger eligibility status, approver chain timeline.
- **Submit button** is disabled (opacity 0.55, `cursor: not-allowed`) until all blocking gates pass. **This is the central interaction rule for the whole system. Do not allow override without the audit-logged HSE workflow path.**

#### Screen 03 — Active journey · live track (`CTActiveJourney` in `control-tower-journey.jsx`)
- **Purpose:** Monitor an in-flight journey end-to-end.
- **Layout:** Sidebar · topbar (with Contact driver · Share trip · Flag event · Recall journey actions) · main split (left map + speed chart, right 360px rail).
- **Map:** Leaflet centered on the journey midpoint (Marmul→Nimr-2 corridor). Completed segment in green, remaining in dashed blue. Pulsing vehicle marker with popup showing plate + speed + coords.
- **HUD strip overlaid on map bottom:** SPEED · LIMIT · DISTANCE · REMAINING · FUEL · ENGINE · IGNITION · NFC · DEVICE — 9 telemetry tiles.
- **Speed & events strip:** SVG sparkline of speed over the last 90 min with overspeed limit line and event dots.
- **Right rail:** Driver card (NFC authenticated badge, score/trips/incidents), Route timeline (waypoint list with done/current/pending states), Passengers boarded (4/4 ✓ MATCH with NFC timestamps).

### 3.B. Driver Mobile App — iPhone-class phone

Uses light "warm cream" surfaces (`#f6f5f1`) with charcoal text — easier on eyes in vehicle cabin daylight. Status bar is dark by default. All four screens fit in an iPhone 14/15-class frame (~390×844 viewport).

#### Screen 04 — Today (`DrvToday` in `driver-app.jsx`)
- Salutation header (Salaam, Daoud) with date and avatar
- "Next trip — approved" dark callout card with origin→destination, journey ID, depart/ETA/risk
- Vehicle card: plate, model, status pills (MAINT GO, DOCS, IVMS, RAS expires in 18d)
- "Before you depart" checklist: pre-trip checklist · NFC tap · passenger boarding · journey acknowledgment
- Sticky primary CTA: "Start pre-trip"
- Bottom tab bar: Today · Trips · Checks · Defects · Me

#### Screen 05 — Pre-trip checklist (`DrvChecklist`)
- Progress strip ("8 / 18 complete · 1 DEFECT")
- 4-up photo capture grid (Front · L side · R side · Rear) with filled/unfilled affordance
- Checklist items with green check / red X / pending states — first 8 visible
- **Defect detail card** auto-renders when an item fails: pressure-gauge example with two photo thumbnails and a note that this auto-triggers a **Conditional Release** and notifies Maintenance
- Footer CTAs: Back · Continue to Safety equipment

#### Screen 06 — NFC authentication (`DrvNFC`)
- Full-bleed dark immersive screen
- Title: "Tap your NFC card"
- Centered animated pulse ring with NFC card visualization (driver name + UID `04:E2:1F:8B`)
- "Listening · 12 sec" pill below
- Reader identifier ("VEH 12-A-3471 · DASH-RDR-04")
- Footer: "Card unreadable? Request manual override" — links to audit-logged override workflow

#### Screen 07 — In-trip live (`DrvInTrip`)
- Full-bleed map (real Leaflet, light tiles by default)
- Top floating glass card: "NEXT WAYPOINT · Nimr-2 main camp · 40 km · ETA 16:50"
- Bottom-left circular speed badge (87 km/h)
- Bottom-right status stack (NFC OK · signal OK · shield OK)
- **Bottom sheet** (peekable): journey ID, route, ON ROUTE pill, 3-up stats (Passengers · Fuel · Time left)
- Sticky CTAs: Report defect · **SOS** (red, hold-to-activate in production)

### 3.C. Passenger Logistics App — iPhone-class phone

#### Screen 08 — Request pickup (`PaxRequest` in `passenger-app.jsx`)
- Trip type segmented control: One-way / Round trip / Recurring
- From → To card with dot + line connector pattern
- "When" card with date/time and segmented time-window picker
- Eligibility check banner (green): "You're eligible for this route · PDO clearance valid · roster active · day-shift OK"
- **Poolable with** card: lists 3 nearby employee requests on the same shift, "Save 18 min" pill — this is the pooling intelligence the planner consumes
- Notes textarea
- Sticky submit footer: "Submit request → · GOES TO MUSCAT LOGISTICS PLANNER · SLA 30 min"

#### Screen 09 — My trip · live (`PaxLive`)
- Full-bleed real map (Muscat region by default)
- Top pill ("My trip") and "Share ETA" button
- Bottom sheet with handle:
  - "Shuttle is on the way · ON TIME · **4 min away**"
  - Driver card: avatar, rating, vehicle (Toyota Coaster · 14 seats), plate, call button
  - "Stops on your route" timeline: 4 stops with times and "you + 1 board" details

### 3.D. Specialist Consoles — desktop web

Each console uses `OpsShell` (from `ops-consoles.jsx`) — a shared chrome that takes a `role` prop. The role determines the sidebar nav and the colored role badge under the logo.

#### Screen 10 — Logistics planner hub (`PlannerHub`)
- **Purpose:** Pool individual passenger requests by route/shift/time/capacity, then assign vehicle + driver.
- Filter pills above the table (Pending 24 · Pooled 6 · Assigned 11 · Closed today 47)
- Main table: checkbox + request ID + passenger (avatar + dept) + From→To + Window + SLA + Priority
- Right composer panel (380px): "Building pool — 4 / 14 seats filled · Coaster" with progress bar, mini route preview, suggested vehicle card (with capacity/fuel/score), driver card, "Convert to journey plan" primary CTA

#### Screen 11 — Maintenance workshop (`MaintWorkshop`)
- **Purpose:** Workshop bay kanban — see the queue, what's in bay, what's blocked.
- KPI strip: NO-GO 14 · IN BAY 2 · MTTR 3.4h · PARTS DUE 5 · PM COMPLIANCE 94%
- **5-column kanban:** Inbound queue · In bay · Awaiting parts · HSE review · Ready for release
- Each work-order card: WO number, priority pill, plate, age, fault description, optional photos, optional parts ETA, optional technician + bay, optional GO/CONDITIONAL release decision

#### Screen 12 — Work order · Go/No-Go release (`MaintWorkOrder`)
- **Purpose:** The maintenance-side Go/No-Go decision — the other half of the journey gate physics.
- **Hero summary** with status pill, opener, title, body, and timer (00:45 elapsed · target 1H)
- **Photo evidence** strip — 4 thumbnails labeled BEFORE · gauge / BEFORE · seal / AFTER · gauge / AFTER · installed
- **Parts replaced** table with part no., qty, supplier, warranty, old-part disposal flag
- **Activity timeline** — every action attributed to a user with timestamp
- **Right rail: Release decision** — three explicit options:
  - GO · full release (selected by default in this design)
  - CONDITIONAL release (requires expiry)
  - NO-GO · keep blocked (requires reason)
  - Reason / note text area
  - HSE co-sign required? (Auto / Required / Skipped)
  - Primary CTA: "Apply GO · request HSE co-sign" with audit notice

#### Screen 13 — HSE console · panic event (`HSEConsole`)
- **Purpose:** Tier-1 emergency response surface. Activated when a driver presses panic.
- **Critical banner** (top): pulsing red panic icon + "ACTIVE EMERGENCY · TIER 1 · 4 MIN 18 SEC ELAPSED" + driver/vehicle/situation summary + "Next action: Verify driver safety call"
- **Map** zoomed to incident (`[22.68, 56.82]` zoom 12): approved corridor as dashed blue, actual deviation in solid red, geofence circle, pulsing red marker with detailed popup, nearby resources labeled (HSE veh · Camp 12 · Ambulance)
- **HUD strip** at map bottom: SPEED · ENGINE · DOOR · FUEL · SIGNAL
- **Right rail:** Driver & journey card with Call button, **Response playbook · Tier 1** (6 ordered steps with done/active/pending states), Last 5 IVMS events

#### Screen 14 — GM/Ops KPI dashboard (`GMDashboard` in `ops-consoles-2.jsx`)
- **Purpose:** Monthly board view for GM / Operations Manager.
- **6-up KPI grid:** Fleet utilization · Journey on-time · No-Go rate · Incidents 30d · Driver score avg · Cost/km — each with delta, sparkline
- **Mid row:**
  - Fleet readiness — 264 vehicles broken down by status with horizontal bar percentages
  - Journeys · last 30 days — stacked bar chart (approved/delayed/deviated)
  - Top operational risks — list of 6 risks with severity rail and counts
- **Bottom:** By project/site table — Marmul base / Nimr-2 / Fahud / Bahja / Saih Rawl / Workshop pool with vehicles, journeys, on-time %, driver score, incidents, no-go rate, cost/km

#### Screen 15 — Vehicle Master profile (`VehicleProfile`)
- **Purpose:** The full record for a single vehicle. The "source of truth" page.
- **Left rail (280px):**
  - Photo + 4-up thumbnails
  - Current status with "Change" button
  - Identity card (Plate, VIN, Engine no., Make, Model, Year, Type, Owner, Project, Base)
  - Telemetry · live card (Odometer, Engine hrs, Last seen, Position, IVMS device, SIM, NFC reader)
- **Right area:**
  - Tab bar: Overview · Documents · Maintenance · Tires · Parts · Journeys · Events · Devices · Audit (with badge counts)
  - **4-up health summary cards** (MAINTENANCE GO · DOCUMENTS 6/6 · TIRES GO · IVMS/NFC ONLINE)
  - **Documents & permits** table — Mulkia, Insurance, RAS, Site permit, Fire extinguisher, First aid — with status pills (VALID / EXPIRES 18D)
  - **Recent maintenance** table — last 5 WOs with result pills
  - **Tires** card with axle-position diagram (P1/P2/P3/P4 with tread depth), averages, next rotation suggestion

#### Screen 16 — Admin · workflow config (`AdminConfig`)
- **Purpose:** The admin builds the rules of the system here.
- **Left rail:** workflow list — Journey approval / Vehicle release / Document renewal / Driver onboarding / HSE incident / Passenger request / Inspection campaign / Tire replacement — with version stamps
- **Flow canvas:** node-graph editor with toolbar (Trigger · Gate · Approval · Notification · Action · Branch · Wait). Nodes connected by arrows with PASS/FAIL/branch-condition labels. Minimap in bottom-right.
- **Right inspector:** properties for the selected node (HSE approve in this design) — Approver group, Trigger condition, SLA, On timeout, Notification channels (chips), Required attachments, On approve actions

---

## 4. Tweaks panel — the interactive design system showcase

The HTML prototype has a floating **Tweaks** panel (bottom right). It exposes three high-level controls that re-shape the entire feel. **The implementation should support all three states in production** because they map to real user preferences and operational contexts.

| Tweak | Values | Meaning | Implementation |
|---|---|---|---|
| **Mood** | `industrial` (default), `editorial`, `warroom` | Aesthetic / surface palette. Industrial = charcoal control-room; Editorial = warm cream surfaces for execs/clients; War room = pure black with amber accents and pulsing No-Go pills. | CSS attribute selectors on `<html>`: `[data-mood="..."]` overrides CSS variables. See `styles.css` §"Tweak: MOOD variants". |
| **Palette** | `cool` (default), `desert`, `cyber` | Status color identity. Cool = canonical blue/green/amber/red; Desert = terracotta/sage/sand/clay for Omani field ops; Cyber = cyan/mint/amber/hot-pink. | CSS attribute selectors on `<html>`: `[data-palette="..."]` overrides `--primary`, `--go`, `--cond`, `--nogo`. |
| **Map style** | `dark` (default), `light`, `schematic` | Map tile theme. Dark = CartoDB Dark Matter; Light = CartoDB Voyager; Schematic = stylized vector grid (no tiles, presentation mode). | React Context (`FleetopsTweakCtx` in `shared.jsx`) → prop `theme` on `<LeafletMap>`. |

In production, store these in user preferences (per user, per role default). Mood/palette likely live as a global app setting; map style is a per-map preference (some users want satellite when planning, schematic when presenting).

---

## 5. Design tokens

All tokens are CSS custom properties declared in `styles.css` on `:root`. Reimplement these in your design-token system (Style Dictionary, Theo, Tailwind config, whatever).

### Type

| Token | Value |
|---|---|
| `--font-sans` | `'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` |
| `--font-mono` | `'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace` |

**Type scale (per `.fo` rules):**

| Class | Size / weight / color |
|---|---|
| Body default | 13px / 400 / `--ink-1` / line-height 1.45 |
| `.label` | 10px / 500 / `--ink-3` / uppercase / letter-spacing 0.08em |
| `.meta` | 11px mono / `--ink-2` / letter-spacing 0.02em |
| `.h3` | 13px / 600 / `--ink-0` |
| `.h2` | 16px / 600 / `--ink-0` / letter-spacing -0.005em |
| `.h1` | 20px / 600 / `--ink-0` / letter-spacing -0.01em |
| `.display` | 28px mono / 500 / `--ink-0` / letter-spacing -0.02em |
| `.display-lg` | 40px mono / 500 / `--ink-0` |
| Mono inline | `--font-mono`, tabular-nums, `font-feature-settings: 'zero'` |

### Color — Industrial mood (default), Cool palette (default)

**Surfaces (cool charcoal stack):**

| Token | Hex |
|---|---|
| `--bg-0` (root background) | `#0a0d12` |
| `--bg-1` (sidebar / topbar) | `#0f141b` |
| `--bg-2` (sub-panel) | `#151b24` |
| `--bg-3` (raised) | `#1c2430` |
| `--bg-4` (hover) | `#242d3a` |
| `--panel` | `#11161e` |
| `--surface` | `#151b24` |
| `--raised` | `#1c2430` |

**Lines:**

| Token | Hex |
|---|---|
| `--line` | `#232c39` |
| `--line-soft` | `#1b232e` |
| `--line-strong` | `#2e3a4a` |

**Ink:**

| Token | Hex |
|---|---|
| `--ink-0` (high emphasis) | `#f1f4f8` |
| `--ink-1` (default body) | `#d6dce5` |
| `--ink-2` (secondary) | `#95a0b0` |
| `--ink-3` (tertiary) | `#5e6776` |
| `--ink-4` (disabled) | `#3e4654` |

**Safety status (cool palette — the canonical):**

| Token | Hex | Meaning |
|---|---|---|
| `--go` | `#1ec991` | GO · approved · safe |
| `--go-soft` | `rgba(30,201,145,0.14)` | GO background |
| `--cond` | `#f5a524` | CONDITIONAL · review · soft-warn |
| `--cond-soft` | `rgba(245,165,36,0.14)` | CONDITIONAL background |
| `--nogo` | `#ef4747` | NO-GO · blocked · critical |
| `--nogo-soft` | `rgba(239,71,71,0.14)` | NO-GO background |
| `--info` / `--primary` | `#4a90ff` | Active / informational |
| `--info-soft` / `--primary-soft` | `rgba(74,144,255,0.14)` | |
| `--primary-2` | `#2f6fe0` | Primary hover |
| `--neutral` | `#6b7689` | Inert / closed |
| `--neutral-soft` | `rgba(107,118,137,0.14)` | |
| `--cyan` (chart) | `#38d4d4` | |
| `--violet` (chart) | `#a78bfa` | |
| `--pink` (chart) | `#f472b6` | |

**Editorial mood** — light theme. See `[data-mood="editorial"]` in `styles.css` for full overrides: `#f6f4ee` warm cream surfaces, `#15181d` ink, ink-blue `#2a4a8f` primary, earthy safety colors (`#1a7a52` / `#9a5a00` / `#b81717`).

**War-room mood** — pure black `#050608` with amber `#ffb020` primary, pulsing No-Go animation (1.4s ease-in-out). See `[data-mood="warroom"]`.

**Desert palette** — terracotta `#d97757` / sage `#7aa05b` / sand-amber `#e0a738` / clay-red `#c0392b`. See `[data-palette="desert"]`.

**Cyber palette** — cyan `#22d3ee` / mint `#14eba0` / amber `#fbbf24` / hot-pink `#ff3d8a`. See `[data-palette="cyber"]`.

### Radii

| Token | Value | Use |
|---|---|---|
| `--r-1` | `4px` | Tiny chips, sublabel |
| `--r-2` | `6px` | Buttons, inputs, cards |
| `--r-3` | `10px` | Panels |
| `--r-4` | `14px` | Modals, large cards |

### Spacing — derived from utility classes

Use a 4px baseline. The utility classes correspond to: `gap-4` (4px), `gap-6` (6px), `gap-8` (8px), `gap-10` (10px), `gap-12` (12px), `gap-16` (16px), `gap-20` (20px), `gap-24` (24px). Inline `padding` values commonly land at 8/10/12/14/16/20 px.

### Shadows

| Token | Value |
|---|---|
| `--shadow-1` | `0 1px 0 rgba(255,255,255,0.02) inset, 0 0 0 1px var(--line)` |
| `--shadow-2` | `0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px var(--line)` |

### Component primitives

These are the named building blocks used across every screen — reimplement as components in your design system:

- **`Pill`** (`pill.go / pill.cond / pill.nogo / pill.info / pill.neutral`) — status badge with a leading dot. Mono font. See `shared.jsx` `Pill` and `styles.css` `.pill`.
- **`Glyph`** — the 30+ named icons in `IK` object in `shared.jsx`. Lean geometric strokes, 1.6 default stroke-weight, no fills unless specified. **Do not** swap for an icon library (Heroicons, Lucide) without re-checking the visual rhythm — the icon weights match the type pairing.
- **`Logo`** — Fleetops wordmark: steering-helm-derived 4-spoke rotor with central dot. SVG, themable via `light` prop.
- **`Placeholder`** — striped neutral block for missing imagery, with mono caption.
- **`Spark`** — inline SVG sparkline for KPI cards.
- **`LeafletMap`** — the map component (see §6).
- **`Pill / Btn / Input / Tbl / NavItem / CheckBox / Avatar / Bar / Card / Panel / Raised`** — primitive classes.
- **`OpsShell`** (in `ops-consoles.jsx`) — the shared "sidebar + topbar + body" chrome that all specialist consoles use. Takes `role`, `active`, `title`, `sub`, `headerRight`, `children`.
- **`CTSidebar`, `CTTopbar`** (in `control-tower-map.jsx`) — the Journey Manager-specific chrome.

---

## 6. Maps & geo

- **Prototype uses:** Leaflet 1.9.4 + CartoDB raster tiles (Dark Matter for `theme=dark`, Voyager for `theme=light`). No API key, no cost, but **CartoDB requires attribution** — add a small attribution line if you ship with these tiles.
- **In production, evaluate:**
  - **Mapbox** — vector tiles, sharper at zoom, paid by MAU. Best polish.
  - **MapTiler** — vector + raster, EU-hosted option (Omani data residency may matter).
  - **ESRI ArcGIS** — enterprise oil-&-gas standard, may already be in your client's stack.
  - **Self-hosted OSM via Tegola/Tileserver-GL** — if on-prem deployment is mandatory.
- **Real coordinates used** (placeholder data, replace with live feed):
  - Marmul base: `18.13°N, 55.20°E`
  - Nimr-2 main camp: `19.13°N, 55.93°E`
  - Fahud: `22.34°N, 56.50°E`
  - Saih Rawl: `20.94°N, 56.65°E`
  - Bahja: `19.65°N, 56.05°E`
  - Muscat: `23.59°N, 58.42°E`
- **Map features used:**
  - `L.polyline` for routes (with `dashArray` for dashed). Colors keyed to journey status.
  - `L.rectangle` / `L.circle` for geofences (1.2px stroke, 4 4 dashArray, 5–7% fill opacity).
  - `L.marker` with `L.divIcon` for **all** vehicle pins and site labels. The `divIcon` HTML is generated by helper functions `vehiclePinHTML({ status, label, sub, popupSide, popupBorder })` and `siteLabelHTML(name)` in `shared.jsx`.
  - Map is **non-interactive by default** (`dragging:false, scrollWheelZoom:false`, etc.). In production, allow interaction on the main fleet map and active-journey map; keep mini-maps (composer's route preview) non-interactive.
  - `ResizeObserver` + polled `invalidateSize()` recovery for late-laid-out containers — see `LeafletMap` in `shared.jsx`. **Keep this pattern** when integrating with any reactive layout — Leaflet does not recover from 0×0 init on its own.

---

## 7. Interactions & behavior

### Global

- **Live updates** — IVMS-sourced state (vehicle position, speed, events) flows via WebSocket. Stale-while-revalidate; show "device offline" pill if last-seen >60s. The "LIVE · 248 devices online" pill in the topbar reflects this in aggregate.
- **Audit log** — every status change (Go ↔ No-Go, journey approval, override, document renewal) creates an audit entry: user / timestamp / IP / device / before-value / after-value.
- **Soft delete** — safety records (events, panic logs, work orders) are never hard-deleted. UI never offers a "Delete" button for these; only "Archive."

### Journey composer (Screen 02) — the critical interaction

- **Validation runs on every field change.** Gates re-evaluate live as the user edits resources upstream.
- **Submit disabled** while any blocking gate fails. Disabled state: `opacity: 0.55, cursor: not-allowed`. Show the blocking summary banner at top with a clickable list.
- **Gate cards expand/collapse** on header click. Expanded state shows all checks; collapsed shows just the summary.
- **Approver chain** updates in real time as approvals come in (timeline pattern with active/done/pending dots).

### Driver app NFC tap (Screen 06)

- **Animated pulse rings** — 3 concentric rings expanding outward (2.4s ease-out infinite, staggered by 0.6s each)
- **Blinking listening dot** — 1.2s infinite
- **State transitions:** Listening → Detected → Authenticated (green check + "Welcome, Daoud" or similar). Failed read → "Try again · 2 of 3 attempts" → after 3 fails, surface the manual override request flow.
- **Manual override** must always be available, must log an event, must notify HSE.

### HSE panic incident (Screen 13)

- **Auto-opens** on panic event ingestion (drops in front of any other screen with a toast + acoustic cue if HSE officer is in front of console).
- **Pulsing red CSS animation** on the icon and incident marker (1.4s ease-in-out).
- **Response playbook** is a state machine. Each step has a click-to-complete affordance; the next step auto-becomes active. Steps can be skipped with a documented reason (audit).
- **"Escalate to Tier 2"** triggers a separate notification fan-out (Ops desk, GM, emergency services per policy).

### Maintenance Go/No-Go (Screen 12)

- **Three explicit options** — radio cards, no default. The user must consciously pick.
- **Conditional release** asks for an expiry (date/time picker). Until expiry, the vehicle is auto-restricted to certain journey types (config'd in Admin).
- **HSE co-sign** — when "Required" is picked, submitting moves the WO to "HSE review" lane in the kanban; the WO doesn't release until HSE approves.

### Passenger app boarding validation (referenced, not pictured)

- 4 methods supported: NFC card, QR code, employee ID entry, manual supervisor confirmation. Configurable per route. The system must reconcile manifest vs actual boarded headcount before journey start; mismatch → alert.

### Animations

- Pulse rings on NFC: 2.4s ease-out infinite, staggered
- Pulse on panic icon / red No-Go pills (war-room mood only): 1.4s ease-in-out infinite
- Blinking dot on NFC listening: 1.2s infinite
- All transitions on hover/focus: 0.12–0.18s ease

### Form validation rules (selected)

- Plate number: Oman format `\d{1,2}-[A-Z]-\d{3,4}` (validation message: "Plate must be like 12-A-3471")
- VIN: 17 chars alphanumeric, no I/O/Q
- License expiry: must be >7 days in future to allow journey assignment (configurable)
- Manifest size: must be ≤ vehicle seatbelt count
- All file uploads: max 10MB photos, JPEG/PNG/HEIC, EXIF stripped server-side

---

## 8. State management

Per screen / area:

| Surface | State |
|---|---|
| **Live fleet map** | WebSocket subscription to `/v1/fleet/live`. Each vehicle: `{id, plate, position, speed, heading, status, journey_id, driver_id, last_seen}`. Event stream: subscription to `/v1/events/live` filtered by role + project. |
| **Journey composer** | Form state for journey draft. On any field change, re-run validation engine (client-side hint, server-authoritative). `GET /v1/journeys/:id/gates` returns the gate state — render that. |
| **Active journey** | WebSocket to `/v1/journeys/:id/live`. Includes telemetry, waypoint progress, event stream. |
| **Driver app** | Offline-first (use a sync engine — Replicache, ElectricSQL, or hand-rolled queue with optimistic UI). Pre-trip checklist, photos, defect reports queue when offline. |
| **Passenger app** | Request state + trip subscription. `/v1/passenger/requests/:id` + `/v1/passenger/trips/:id/live`. |
| **Planner Hub** | Polling or websocket on the request pool. Selected requests form a "pool" client-state. "Convert to journey plan" POSTs to `/v1/journeys` with the pool payload. |
| **Maintenance kanban** | Subscription on work-order status changes. Drag-and-drop column moves emit `PATCH /v1/work-orders/:id` (move to `awaiting_parts`, etc.). |
| **Work order** | The release-decision form state. Submit calls `POST /v1/work-orders/:id/release` with `{decision, reason, expiry?, hse_cosign_required}`. |
| **HSE console** | Subscription to incidents. Playbook step completions are `POST /v1/incidents/:id/steps/:n/complete`. |
| **GM dashboard** | Cached aggregate queries — 60s cache acceptable. `/v1/analytics/kpis?range=mtd&site=...`. |
| **Vehicle Master** | Detail view: `/v1/vehicles/:id` plus nested resources (`/documents`, `/maintenance`, `/tires`, `/journeys`, `/events`, `/devices`, `/audit`). Tabbed lazy-loading. |
| **Admin workflows** | The flow graph is editable; saves emit a `PUT /v1/workflows/:id` with `{nodes, edges}` JSON. Versioning is mandatory — never edit a published workflow in place; create a draft, publish on review. |

---

## 9. Responsive behavior

- **Control Tower & specialist consoles** are designed for desktop ≥ 1280×800. Below 1280, sidebar collapses to a 56px icon rail. Below 1024, map and right rail stack (rail becomes a top drawer). Below 768, the desktop consoles fall back to a "read-only summary" mode — full editing on phone is not a supported use case for these roles.
- **Driver & passenger apps** are mobile-first. Designed at 390×844 (iPhone 14/15). Use safe-area insets (`env(safe-area-inset-bottom)`) on bottom CTAs.
- **Tablet (iPad / Android tablet)** — Driver app stretches gracefully; Control Tower scales down by hiding the right rail (becomes a popover trigger).
- **RTL (Arabic)** — Bake in `dir="rtl"` support from day one. Icons that have directional meaning (arrow, chevron, route, etc.) must mirror. Numbers stay LTR. Status pills do not change layout direction.

---

## 10. Assets

- **Fonts:** IBM Plex Sans (300, 400, 500, 600, 700) and IBM Plex Mono (400, 500, 600). Self-host in production (don't depend on Google Fonts in oil & gas).
- **Icons:** Hand-drawn SVG glyphs in `shared.jsx` (`IK` object). 30+ glyphs. License: rolled by hand for this design, free to use.
- **Logo:** Fleetops wordmark — SVG in `shared.jsx` (`Logo` component). The 4-spoke rotor is intentional (steering / wheel / compass).
- **Map tiles:** CartoDB Dark Matter & Voyager via `unpkg.com/leaflet@1.9.4`. **License: requires attribution** ("© OpenStreetMap contributors © CARTO"). In production, swap to your chosen provider.
- **Placeholders:** Striped neutral blocks (`Placeholder` component in `shared.jsx`). Replace with real photos before launch.

---

## 11. Files in this bundle

```
design_handoff_fleetops/
├── README.md                       ← this file
├── Fleetops.html                   ← entry point; orchestrates all 16 screens in a DesignCanvas
├── styles.css                      ← all design tokens, primitive classes, mood/palette variants
├── shared.jsx                      ← icons, Logo, Pill, Spark, Placeholder, LeafletMap, TweakCtx
├── control-tower-map.jsx           ← Screen 01 (CTLiveMap) + CTSidebar + CTTopbar
├── control-tower-journey.jsx       ← Screens 02 (CTJourneyComposer) + 03 (CTActiveJourney)
├── driver-app.jsx                  ← Screens 04 (DrvToday), 05 (DrvChecklist), 06 (DrvNFC), 07 (DrvInTrip)
├── passenger-app.jsx               ← Screens 08 (PaxRequest) + 09 (PaxLive)
├── ops-consoles.jsx                ← OpsShell + Screens 10 (PlannerHub), 11 (MaintWorkshop), 12 (MaintWorkOrder), 13 (HSEConsole)
├── ops-consoles-2.jsx              ← Screens 14 (GMDashboard), 15 (VehicleProfile), 16 (AdminConfig)
├── design-canvas.jsx               ← presentation harness (Figma-like pan/zoom canvas). Don't ship.
├── ios-frame.jsx                   ← iPhone device chrome for mobile screens. Don't ship.
├── tweaks-panel.jsx                ← the Mood/Palette/Map tweak UI. Useful as a settings reference.
└── source/
    ├── requirement.md              ← original functional spec (v1.0–1.1) — read this in full
    └── AR_Technology_Journey_Fleet_Management.docx
```

**Running locally:** open `Fleetops.html` in a browser. No build step needed.

**Where to start your reimplementation:** Tokens & primitives first (`styles.css` → your design-token format, then `shared.jsx` primitives → your component library). Then build out the shared chrome (`OpsShell`, the sidebar/topbar). Then build the screens in this order:
1. **Vehicle Master profile** (15) — most "read" patterns in one screen
2. **Live fleet map** (01) — establishes real-time + map patterns
3. **Journey composer** (02) — the central gating interaction
4. **Active journey** (03) — telemetry/map composition
5. **Driver app — Today + Checklist + NFC + In-trip** (04–07) — mobile patterns
6. **Maintenance workshop + Work order** (11, 12) — write-heavy operational patterns
7. **HSE console** (13) — emergency response
8. **Planner Hub** (10), **Passenger app** (08, 09)
9. **GM dashboard** (14)
10. **Admin workflow config** (16) — the most complex single screen; defer

Read `source/requirement.md` start-to-finish before opening a PR.

---

## 12. Open questions (from spec, still unresolved)

The spec (§18 of `requirement.md`) lists 15 discovery questions that should be answered before final-mile implementation. The most impactful for UI:

1. Which IVMS device brands/protocols? — drives the event normalization layer
2. Vehicle immobilizer: physical or alert-only? — affects driver app NFC flow design
3. Passenger counting method: manual / NFC / door counter / sensors / cameras? — affects boarding validation screens
4. Cabin cameras allowed under client policy? — affects incident-evidence module
5. Which documents block vehicle use on expiry? — drives the Go/No-Go gate definitions
6. Trip visibility — show driver name/phone to passengers, or only vehicle ID?
7. Boarding validation method preference: NFC / QR / employee ID / sensor / hybrid?
8. Recurring schedule support? — affects passenger request composer
9. Material + passenger logistics combined per trip, or separated?

Get these answered by the client before finalizing screen flows.

---

**Author of this design:** Claude · 13 May 2026  
**For questions about design intent:** the original conversation transcript is the authoritative reference. When in doubt, prefer the safer interpretation (more gates, more audit, more conservative defaults).
