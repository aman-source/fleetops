# Mapbox Full Integration Design

**Date:** 2026-05-21
**Status:** Approved
**Approach:** Hybrid — client-side for real-time APIs, backend for batch processing

## Token
- Frontend: `NEXT_PUBLIC_MAPBOX_TOKEN` in `frontend/.env.local`
- Backend: `MAPBOX_TOKEN` in `docker-compose.yml` + `src/env.ts`

## Architecture

### Client-Side (direct Mapbox API calls)
- Directions API — driver nav, road-snapped route display
- Geocoding API — address search (journey creation, passenger pickup)
- Isochrone API — coverage zone polygons on admin map

### Backend (batch/server)
- Map Matching API — post-journey GPS trail cleanup (BullMQ job)
- Directions matrix — road-distance inputs for passenger pooling

---

## Feature 1: Admin Web — Road-Snapped Routes + Geocoding

### Route Display
- On journey approval: backend calls Directions API (`driving-traffic`, ≤25 waypoints)
- Stores GeoJSON route geometry in existing `journey_route_corridors` table
- Admin map reads corridor → renders solid colored line (replaces dashed straight-line)
- Color: active=blue, deviated=red, delayed=amber

### Geocoding Search (Journey Creation)
- New `GeocoderInput` component in frontend
- Debounced (300ms) calls to `GET /api/v1/mapbox/geocode?q=...` (backend proxy)
- Returns top 5 results: name + coordinates
- Searchable combobox — user picks → lat/lon auto-fill on waypoint form
- Used on: journey creation waypoints, admin map "go to location"

---

## Feature 2: Admin Map — Map-Matched GPS Trails

- BullMQ job triggered on `journey.closed` event
- Fetches telemetry points for journey duration from `telemetry_logs`
- Batches into chunks of 100 points (API limit), calls Map Matching API
- Stores snapped coordinates as `snapped_trail` JSONB on journeys table (new migration)
- Map page: if `snapped_trail` exists → use it; else fallback to raw telemetry

---

## Feature 3: Driver Mobile — In-App Navigation

### NavigationScreen
- Triggered on journey activation (`POST /journeys/:id/activate`)
- Full-screen `@rnmapbox/maps` MapView
- On mount: calls Directions API with journey waypoints → stores route + steps in state
- Renders: route LineLayer, vehicle position Marker (from device GPS)
- Top banner: maneuver icon + street name + distance to next turn
- Bottom bar: total distance remaining + ETA
- "Arrive" button → calls close journey, exits nav
- GPS: `expo-location` watchPositionAsync (5s interval, 10m accuracy)
- Rerouting: if device position >200m from route → re-call Directions API

### Maneuver Icons
- Map from Directions API `type` + `modifier` → existing custom SVG glyphs where possible
- Fallback: text label (LEFT, RIGHT, STRAIGHT, ROUNDABOUT)

---

## Feature 4: Passenger Mobile — Address Search for Pickup

- Replace coordinate fields on `RequestPickupScreen` with geocoder search
- Same debounced pattern as admin web
- Calls `GET /api/v1/mapbox/geocode?q=...`
- On selection: reverse geocode to confirm human address
- Confirmed address + coordinates submitted with pickup request

---

## Feature 5: Passenger Pooling — Road Distance Matrix

- In `autoPool()` backend function (passenger.service.ts)
- Before bucketing: call Directions API matrix for all pending requests vs available vehicles
- Matrix: up to 25 origins × 25 destinations per call (batch if >25)
- Replace Euclidean bucket threshold with real road travel time (minutes)
- Pool requests within same vehicle's 15-min road-time window

---

## Feature 6: Isochrone Coverage Zones (Admin Map)

- New "Coverage" tab on admin map page (alongside All fleet / Active journeys / No-Go)
- On tab activate: fetch online vehicles → call Isochrone API per vehicle (30min driving)
- Render as translucent fill polygons (color by vehicle status)
- Used for: dispatch decisions ("which vehicle can reach this location in 30min?")
- Cache isochrone results in Redis for 5min (avoid re-calling for same position)

---

## Backend Endpoint

`GET /api/v1/mapbox/geocode?q=<query>&proximity=<lon,lat>`
- Proxies to Mapbox Geocoding API
- Filters to Oman bounding box (`bbox=51.99,16.64,59.84,26.39`)
- Returns top 5: `{name, fullAddress, lat, lon}`
- Used by both web + mobile

---

## Database Changes
- `journeys.snapped_trail` — JSONB, nullable (new migration `0009_...` already exists for plate constraint fix, add to next migration)

## No New Tables
All other data uses existing schema.
