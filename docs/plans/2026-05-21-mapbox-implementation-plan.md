# Mapbox Full Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Mapbox Directions, Geocoding, Map Matching, and Isochrone APIs across admin web, driver mobile, passenger mobile, and backend pooling.

**Architecture:** Hybrid — client calls Directions/Geocoding/Isochrone directly with public token; backend uses Map Matching for post-journey trail cleanup (BullMQ job) and Directions matrix for passenger pooling.

**Tech Stack:** Mapbox GL JS (web), @rnmapbox/maps (mobile), react-map-gl v8, expo-location, Fastify backend, Drizzle ORM, BullMQ

---

## Task 1: DB Migration — snapped_trail column + Directions route geometry

**Files:**
- Create: `src/infra/db/migrations/0010_mapbox_snapped_trail.sql`
- Modify: `src/infra/db/schema/journeys.ts`

**Step 1: Write migration SQL**

```sql
-- src/infra/db/migrations/0010_mapbox_snapped_trail.sql
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS snapped_trail jsonb,
  ADD COLUMN IF NOT EXISTS directions_route jsonb;

COMMENT ON COLUMN journeys.snapped_trail IS 'Map-matched GPS trail GeoJSON (post-journey cleanup)';
COMMENT ON COLUMN journeys.directions_route IS 'Mapbox Directions API route GeoJSON geometry';
```

**Step 2: Add columns to Drizzle schema**

In `src/infra/db/schema/journeys.ts`, add after existing columns:
```typescript
snappedTrail: jsonb('snapped_trail').$type<GeoJSON.LineString | null>(),
directionsRoute: jsonb('directions_route').$type<GeoJSON.LineString | null>(),
```
Add import at top: `import type { LineString } from 'geojson';`
Change `$type` to use `LineString` directly (not `GeoJSON.LineString`).

**Step 3: Apply migration**
```bash
# With docker compose running:
docker exec fleetops-postgres-1 psql -U fleetops -d fleetops -f /dev/stdin < src/infra/db/migrations/0010_mapbox_snapped_trail.sql
```
Expected: `ALTER TABLE`

**Step 4: Commit**
```bash
git add src/infra/db/migrations/0010_mapbox_snapped_trail.sql src/infra/db/schema/journeys.ts
git commit -m "feat: add snapped_trail + directions_route columns to journeys"
```

---

## Task 2: Backend — Mapbox HTTP client + Geocoding proxy endpoint

**Files:**
- Create: `src/shared/mapbox.ts`
- Create: `src/modules/mapbox/mapbox.routes.ts`
- Modify: `src/server.ts`

**Step 1: Create Mapbox HTTP client**

```typescript
// src/shared/mapbox.ts
import { env } from '../env.js';

const BASE = 'https://api.mapbox.com';
const TOKEN = env.MAPBOX_TOKEN;

// Oman bounding box: sw-lon,sw-lat,ne-lon,ne-lat
const OMAN_BBOX = '51.99,16.64,59.84,26.39';

export interface GeocodeResult {
  name: string;
  fullAddress: string;
  lat: number;
  lon: number;
}

export async function geocodeForward(query: string, proximityLon?: number, proximityLat?: number): Promise<GeocodeResult[]> {
  if (!TOKEN) return [];
  const params = new URLSearchParams({
    access_token: TOKEN,
    limit: '5',
    bbox: OMAN_BBOX,
    country: 'om',
  });
  if (proximityLon != null && proximityLat != null) {
    params.set('proximity', `${proximityLon},${proximityLat}`);
  }
  const url = `${BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json() as { features: Array<{ place_name: string; text: string; center: [number, number] }> };
  return data.features.map(f => ({
    name: f.text,
    fullAddress: f.place_name,
    lat: f.center[1],
    lon: f.center[0],
  }));
}

export interface DirectionsRoute {
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  distance: number; // metres
  duration: number; // seconds
  legs: Array<{
    steps: Array<{
      maneuver: { type: string; modifier?: string; instruction: string; location: [number, number] };
      name: string;
      distance: number;
      duration: number;
    }>;
  }>;
}

export async function getDirectionsRoute(
  waypoints: Array<{ lat: number; lon: number }>,
  profile: 'driving-traffic' | 'driving' = 'driving-traffic',
): Promise<DirectionsRoute | null> {
  if (!TOKEN || waypoints.length < 2) return null;
  const coords = waypoints.map(w => `${w.lon},${w.lat}`).join(';');
  const params = new URLSearchParams({
    access_token: TOKEN,
    geometries: 'geojson',
    overview: 'full',
    steps: 'true',
    banner_instructions: 'true',
  });
  const url = `${BASE}/directions/v5/mapbox/${profile}/${coords}?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { routes: DirectionsRoute[] };
  return data.routes?.[0] ?? null;
}

export async function getMapMatchedTrail(
  points: Array<{ lat: number; lon: number }>,
): Promise<[number, number][] | null> {
  if (!TOKEN || points.length < 2) return null;
  // API limit: 100 pts per request — take last 100
  const chunk = points.slice(-100);
  const coords = chunk.map(p => `${p.lon},${p.lat}`).join(';');
  const radiuses = chunk.map(() => '25').join(';'); // 25m snap radius
  const params = new URLSearchParams({
    access_token: TOKEN,
    geometries: 'geojson',
    overview: 'full',
    radiuses,
  });
  const url = `${BASE}/matching/v5/mapbox/driving/${coords}?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { matchings?: Array<{ geometry: { coordinates: [number, number][] } }> };
  return data.matchings?.[0]?.geometry?.coordinates ?? null;
}

export async function getIsochrone(
  lon: number,
  lat: number,
  minutes: number = 30,
): Promise<GeoJSON.Feature<GeoJSON.Polygon> | null> {
  if (!TOKEN) return null;
  const params = new URLSearchParams({
    access_token: TOKEN,
    contours_minutes: String(minutes),
    polygons: 'true',
  });
  const url = `${BASE}/isochrone/v1/mapbox/driving/${lon},${lat}?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { features: GeoJSON.Feature<GeoJSON.Polygon>[] };
  return data.features?.[0] ?? null;
}

// Directions matrix for N origins × M destinations (road travel times)
export async function getDirectionsMatrix(
  origins: Array<{ lat: number; lon: number }>,
  destinations: Array<{ lat: number; lon: number }>,
): Promise<number[][] | null> {
  if (!TOKEN) return null;
  // Matrix API: all coords together, annotate=duration
  const allCoords = [...origins, ...destinations];
  const coords = allCoords.map(c => `${c.lon},${c.lat}`).join(';');
  const srcIdx = origins.map((_, i) => i).join(';');
  const dstIdx = destinations.map((_, i) => origins.length + i).join(';');
  const params = new URLSearchParams({
    access_token: TOKEN,
    sources: srcIdx,
    destinations: dstIdx,
    annotations: 'duration',
  });
  const url = `${BASE}/directions-matrix/v1/mapbox/driving/${coords}?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { durations: number[][] };
  return data.durations ?? null;
}
```

**Step 2: Create geocoding proxy route**

```typescript
// src/modules/mapbox/mapbox.routes.ts
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { tenantScope } from '../../shared/middleware/tenant.js';
import { sendSuccess } from '../../shared/response.js';
import { geocodeForward } from '../../shared/mapbox.js';

export async function mapboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', tenantScope);

  // GET /mapbox/geocode?q=<query>&lon=<lon>&lat=<lat>
  app.get('/mapbox/geocode', async (request, reply) => {
    const { q, lon, lat } = request.query as { q?: string; lon?: string; lat?: string };
    if (!q || q.trim().length < 2) return sendSuccess(reply, []);
    const results = await geocodeForward(
      q.trim(),
      lon ? Number(lon) : undefined,
      lat ? Number(lat) : undefined,
    );
    return sendSuccess(reply, results);
  });
}
```

**Step 3: Register in server.ts**

In `src/server.ts`, add after other route imports:
```typescript
import { mapboxRoutes } from './modules/mapbox/mapbox.routes.js';
```
And register:
```typescript
await app.register(mapboxRoutes, { prefix: '/api/v1' });
```

**Step 4: TypeScript check**
```bash
cd "d:/onedrive/OneDrive - WebSynergies(S) Pte Ltd/Desktop/fleetops"
npx tsc --noEmit 2>&1
```
Expected: 0 errors

**Step 5: Commit**
```bash
git add src/shared/mapbox.ts src/modules/mapbox/mapbox.routes.ts src/server.ts
git commit -m "feat: add Mapbox client + geocoding proxy endpoint"
```

---

## Task 3: Backend — Directions route on journey approval

**Files:**
- Modify: `src/modules/journey/journey.service.ts`

**Step 1: Update `approveJourney` to call Directions API**

In `src/modules/journey/journey.service.ts`, add import:
```typescript
import { getDirectionsRoute } from '../../shared/mapbox.js';
```

Find `generateRouteCorridor` call (line ~269) and add below it:
```typescript
// Generate Directions API road-snapped route (async — errors never thrown)
generateDirectionsRoute(journeyId).catch((err) => {
  app?.log?.warn?.({ err, journeyId }, 'Directions route generation failed');
});
```

Add new function at bottom of file:
```typescript
async function generateDirectionsRoute(journeyId: string): Promise<void> {
  const waypoints = await db
    .select({ lat: journeyWaypoints.lat, lon: journeyWaypoints.lon })
    .from(journeyWaypoints)
    .where(eq(journeyWaypoints.journeyId, journeyId))
    .orderBy(journeyWaypoints.sequence);

  if (waypoints.length < 2) return;

  const route = await getDirectionsRoute(
    waypoints.map(w => ({ lat: Number(w.lat), lon: Number(w.lon) })),
    'driving-traffic',
  );

  if (!route) return;

  await db
    .update(journeys)
    .set({ directionsRoute: route.geometry as unknown as null })
    .where(eq(journeys.id, journeyId));
}
```

Note: `directionsRoute` is typed as `LineString | null` in schema — cast via `as unknown as null` to satisfy Drizzle's jsonb type. The actual value is a LineString.

**Step 2: TypeScript check**
```bash
npx tsc --noEmit 2>&1
```
Expected: 0 errors

**Step 3: Commit**
```bash
git add src/modules/journey/journey.service.ts
git commit -m "feat: generate Directions API road-snapped route on journey approval"
```

---

## Task 4: Backend — Map Matching BullMQ job (post-journey)

**Files:**
- Modify: `src/modules/journey/journey.service.ts`
- Modify: `src/infra/db/schema/telemetry.ts` (check lat/lon field names)

**Step 1: Check telemetry schema**
```bash
grep -n "lat\|lon\|recordedAt" src/infra/db/schema/telemetry.ts | head -10
```

**Step 2: Add map-matching job trigger in `closeJourney`**

In `src/modules/journey/journey.service.ts`, find `closeJourney`. After the journey status update add:
```typescript
// Queue map matching cleanup (async fire-and-forget)
queueMapMatchingJob(journeyId, journey.vehicleId, journey.actualDeparture, new Date()).catch(() => {});
```

Add the function and import at bottom:
```typescript
import { getMapMatchedTrail } from '../../shared/mapbox.js';
import { telemetryLogs } from '../../infra/db/schema/telemetry.js';

async function queueMapMatchingJob(
  journeyId: string,
  vehicleId: string,
  from: Date | null,
  to: Date,
): Promise<void> {
  if (!from) return;

  const rows = await db
    .select({ lat: telemetryLogs.lat, lon: telemetryLogs.lon })
    .from(telemetryLogs)
    .where(and(
      eq(telemetryLogs.vehicleId, vehicleId),
      gte(telemetryLogs.recordedAt, from),
      lte(telemetryLogs.recordedAt, to),
    ))
    .orderBy(telemetryLogs.recordedAt)
    .limit(100);

  if (rows.length < 2) return;

  const pts = rows
    .filter(r => r.lat && r.lon)
    .map(r => ({ lat: Number(r.lat), lon: Number(r.lon) }));

  const snapped = await getMapMatchedTrail(pts);
  if (!snapped) return;

  const lineString = { type: 'LineString' as const, coordinates: snapped };
  await db
    .update(journeys)
    .set({ snappedTrail: lineString as unknown as null })
    .where(eq(journeys.id, journeyId));
}
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit 2>&1
```

**Step 4: Commit**
```bash
git add src/modules/journey/journey.service.ts
git commit -m "feat: map-match GPS trail on journey close"
```

---

## Task 5: Backend — Passenger pooling with road distance matrix

**Files:**
- Modify: `src/modules/passenger/passenger.service.ts`

**Step 1: Add road-distance bucketing**

In `src/modules/passenger/passenger.service.ts`, add import:
```typescript
import { getDirectionsMatrix } from '../../shared/mapbox.js';
```

Replace the `shiftBucket` key logic in `autoPool` — before the grouping loop, compute road travel times between requests. If two requests have pickup locations and road distance ≤ 15 min, treat them as same bucket:

Find the section where `shiftBucket` is called:
```typescript
const bucket = shiftBucket(req.requestedTime);
const key = `${req.pickupName ?? ''}|${req.dropName ?? ''}|${bucket}`;
```

Replace with:
```typescript
const bucket = shiftBucket(req.requestedTime);
// Use road-distance key if coordinates available, else fall back to name-based
const pickupKey = (req.pickupLat && req.pickupLon)
  ? `${Math.round(Number(req.pickupLat) * 100) / 100},${Math.round(Number(req.pickupLon) * 100) / 100}`
  : (req.pickupName ?? '');
const dropKey = (req.dropLat && req.dropLon)
  ? `${Math.round(Number(req.dropLat) * 100) / 100},${Math.round(Number(req.dropLon) * 100) / 100}`
  : (req.dropName ?? '');
const key = `${pickupKey}|${dropKey}|${bucket}`;
```

Note: truncating to 2 decimal places (~1km grid) groups nearby pickups. Road matrix used only when >5 requests exist to avoid API calls per request.

Add after the groups Map is populated — road-time merge step:
```typescript
// Merge groups within 15-min road travel if coords available and group count > 5
if (groups.size > 1) {
  const groupKeys = [...groups.keys()];
  const groupReps = groupKeys.map(k => {
    const first = groups.get(k)![0];
    return { lat: Number(first.pickupLat) || 0, lon: Number(first.pickupLon) || 0 };
  });
  // Only call matrix if we have valid coords for all
  const hasCoords = groupReps.every(r => r.lat !== 0 && r.lon !== 0);
  if (hasCoords && groupKeys.length <= 25) {
    const matrix = await getDirectionsMatrix(groupReps, groupReps).catch(() => null);
    if (matrix) {
      // Merge groups where road time < 15 min (900s)
      for (let i = 0; i < groupKeys.length; i++) {
        for (let j = i + 1; j < groupKeys.length; j++) {
          const travelTime = matrix[i]?.[j] ?? Infinity;
          if (travelTime < 900) {
            const targetKey = groupKeys[i];
            const srcKey = groupKeys[j];
            if (groups.has(srcKey) && groups.has(targetKey)) {
              groups.get(targetKey)!.push(...groups.get(srcKey)!);
              groups.delete(srcKey);
            }
          }
        }
      }
    }
  }
}
```

**Step 2: TypeScript check**
```bash
npx tsc --noEmit 2>&1
```

**Step 3: Commit**
```bash
git add src/modules/passenger/passenger.service.ts
git commit -m "feat: use Mapbox directions matrix for passenger pool grouping"
```

---

## Task 6: Admin Web — GeocoderInput component

**Files:**
- Create: `frontend/src/components/ui/geocoder-input.tsx`

**Step 1: Create component**

```tsx
// frontend/src/components/ui/geocoder-input.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { api, unwrap } from '@/lib/api';

interface GeoResult {
  name: string;
  fullAddress: string;
  lat: number;
  lon: number;
}

interface Props {
  placeholder?: string;
  proximityLon?: number;
  proximityLat?: number;
  onSelect: (result: GeoResult) => void;
  className?: string;
  defaultValue?: string;
}

export function GeocoderInput({ placeholder = 'Search location…', proximityLon, proximityLat, onSelect, className = '', defaultValue = '' }: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: val });
        if (proximityLon != null) params.set('lon', String(proximityLon));
        if (proximityLat != null) params.set('lat', String(proximityLat));
        const data = await unwrap<GeoResult[]>(await api.get(`/mapbox/geocode?${params}`));
        setResults(data ?? []);
        setOpen(true);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }

  function handleSelect(r: GeoResult) {
    setQuery(r.fullAddress);
    setResults([]);
    setOpen(false);
    onSelect(r);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full h-9 px-3 bg-bg-2 border border-line rounded-[6px] text-[13px] text-ink-0 placeholder:text-ink-3 focus:outline-none focus:border-[var(--primary)] transition-colors pr-8"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-ink-3 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-line rounded-[8px] shadow-lg z-50 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-raised transition-colors border-b border-line-soft last:border-0"
            >
              <div className="text-[13px] text-ink-0 font-medium">{r.name}</div>
              <div className="text-[11px] text-ink-3 mt-0.5 truncate">{r.fullAddress}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1
```

**Step 3: Commit**
```bash
git add frontend/src/components/ui/geocoder-input.tsx
git commit -m "feat: GeocoderInput component with Mapbox geocoding autocomplete"
```

---

## Task 7: Admin Web — Road-snapped route on map + journey detail

**Files:**
- Modify: `frontend/src/components/map/fleet-map.tsx`
- Modify: `frontend/src/app/(dashboard)/map/page.tsx`
- Modify: `frontend/src/app/(dashboard)/journeys/[id]/page.tsx`

**Step 1: Update FleetMap to use directionsRoute if available**

In `fleet-map.tsx`, update `buildRoutesGeoJSON` — routes can now have a `directionsRoute` geometry. Change the interface and builder:

In `JourneyRoute` interface add:
```typescript
directionsRoute?: { type: 'LineString'; coordinates: [number, number][] } | null;
```

In `buildRoutesGeoJSON`, change coordinates logic:
```typescript
coordinates: r.directionsRoute
  ? r.directionsRoute.coordinates
  : r.waypoints.sort((a, b) => a.sequence - b.sequence).map(wp => [wp.lon, wp.lat]),
```

Change route line style — solid instead of dashed when directionsRoute exists:
```typescript
// In route-line layer paint:
'line-dasharray': ['case', ['==', ['get', 'hasDirect'], 'true'], ['literal', [1]], ['literal', [4, 2]]],
```

Add `hasDirect` to feature properties in builder:
```typescript
properties: {
  ...,
  hasDirect: r.directionsRoute ? 'true' : 'false',
}
```

**Step 2: Update map/page.tsx journeys-map-data query**

Change the fetch to request `directionsRoute` — the backend already returns it from the journeys table.

In `JourneyRoute` type in page.tsx (or just use imported type from fleet-map.tsx):
```typescript
// Already imported from fleet-map.tsx — just verify JourneyRoute includes directionsRoute
```

In the map-data API endpoint (journey.routes.ts), add `directionsRoute` to the select:
```typescript
.select({
  id: journeys.id,
  journeyNo: journeys.journeyNo,
  status: journeys.status,
  vehicleId: journeys.vehicleId,
  directionsRoute: journeys.directionsRoute,  // ADD THIS
})
```

**Step 3: Add GeocoderInput to journey creation form**

In `frontend/src/app/(dashboard)/journeys/page.tsx`, find the new journey modal / waypoint input. Import and use GeocoderInput:
```tsx
import { GeocoderInput } from '@/components/ui/geocoder-input';

// In waypoint form, replace lat/lon text inputs with:
<GeocoderInput
  placeholder="Search waypoint location…"
  proximityLon={55.20}  // Oman center
  proximityLat={18.13}
  onSelect={(r) => {
    setWaypointLat(r.lat);
    setWaypointLon(r.lon);
    setWaypointName(r.name);
  }}
/>
```

**Step 4: TypeScript check**
```bash
cd frontend && npx tsc --noEmit 2>&1
```

**Step 5: Commit**
```bash
git add frontend/src/components/map/fleet-map.tsx frontend/src/app/(dashboard)/map/page.tsx frontend/src/app/(dashboard)/journeys/page.tsx src/modules/journey/journey.routes.ts
git commit -m "feat: road-snapped routes on map + geocoder search in journey creation"
```

---

## Task 8: Admin Map — Isochrone coverage tab

**Files:**
- Modify: `frontend/src/app/(dashboard)/map/page.tsx`
- Modify: `frontend/src/components/map/fleet-map.tsx`

**Step 1: Add isochrone data fetching**

In `map/page.tsx`, add state + query:
```typescript
const [showIsochrones, setShowIsochrones] = useState(false);

const { data: isochroneData } = useQuery({
  queryKey: ['isochrones', liveVehicles.map(v => v.vehicleId).join(',')],
  queryFn: async () => {
    if (!liveVehicles.length) return [];
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return [];
    const online = liveVehicles.filter(v => v.online && v.lat && v.lon).slice(0, 10);
    const results = await Promise.all(
      online.map(async v => {
        const res = await fetch(
          `https://api.mapbox.com/isochrone/v1/mapbox/driving/${v.lon},${v.lat}?contours_minutes=30&polygons=true&access_token=${token}`
        );
        if (!res.ok) return null;
        const data = await res.json() as { features: GeoJSON.Feature<GeoJSON.Polygon>[] };
        return { vehicleId: v.vehicleId, feature: data.features?.[0] ?? null };
      })
    );
    return results.filter(Boolean);
  },
  enabled: showIsochrones && liveVehicles.some(v => v.online),
  refetchInterval: 5 * 60 * 1000, // 5 min cache
});
```

**Step 2: Wire Coverage tab**

Change map tab click handler:
```typescript
onClick={() => {
  setMapTab(t);
  if (t === 'Coverage') setShowIsochrones(true);
  else setShowIsochrones(false);
}}
```

**Step 3: Add isochrones prop to FleetMap**

In `FleetMap` props interface add:
```typescript
isochrones?: Array<{ vehicleId: string; feature: GeoJSON.Feature<GeoJSON.Polygon> | null }>;
```

Build GeoJSON in fleet-map.tsx:
```typescript
function buildIsochroneGeoJSON(
  isochrones: Array<{ vehicleId: string; feature: GeoJSON.Feature<GeoJSON.Polygon> | null }>
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: 'FeatureCollection',
    features: isochrones
      .filter(i => i.feature != null)
      .map(i => ({ ...i.feature!, properties: { ...i.feature!.properties, vehicleId: i.vehicleId } })) as GeoJSON.Feature<GeoJSON.Polygon>[],
  };
}
```

Add Source + Layer in Map JSX:
```tsx
{isochrones && isochrones.length > 0 && (
  <Source id="isochrones" type="geojson" data={buildIsochroneGeoJSON(isochrones)}>
    <Layer
      id="isochrone-fill"
      type="fill"
      paint={{ 'fill-color': '#4a90ff', 'fill-opacity': 0.12 }}
    />
    <Layer
      id="isochrone-outline"
      type="line"
      paint={{ 'line-color': '#4a90ff', 'line-width': 1.5, 'line-opacity': 0.4 }}
    />
  </Source>
)}
```

**Step 4: Pass isochrones from page**
```tsx
<FleetMap
  vehicles={liveVehicles}
  routes={routesData ?? []}
  trails={trailsData ?? []}
  isochrones={showIsochrones ? (isochroneData as any ?? []) : []}
/>
```

**Step 5: TypeScript check + commit**
```bash
cd frontend && npx tsc --noEmit 2>&1
git add frontend/src/app/(dashboard)/map/page.tsx frontend/src/components/map/fleet-map.tsx
git commit -m "feat: isochrone coverage zones on admin map (30-min reachability)"
```

---

## Task 9: Mobile — Install expo-location

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/app.json` (permissions)

**Step 1: Install**
```bash
cd mobile && npx expo install expo-location
```

**Step 2: Add permissions to app.json**

In `mobile/app.json`, find `"expo"` → `"ios"` section, add:
```json
"infoPlist": {
  "NSLocationWhenInUseUsageDescription": "FleetOps needs your location for navigation.",
  "NSLocationAlwaysUsageDescription": "FleetOps needs your location during active journeys."
}
```
In `"android"` section add:
```json
"permissions": ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION"]
```

**Step 3: Commit**
```bash
git add mobile/package.json mobile/app.json
git commit -m "feat(mobile): install expo-location for driver navigation"
```

---

## Task 10: Mobile Driver — NavigationScreen

**Files:**
- Create: `mobile/app/(driver)/navigation.tsx`
- Modify: `mobile/app/(driver)/today.tsx`
- Create: `mobile/src/hooks/useNavigation.ts`

**Step 1: Create navigation hook**

```typescript
// mobile/src/hooks/useDirectionsNav.ts
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const REROUTE_THRESHOLD_M = 200;

export interface NavStep {
  instruction: string;
  maneuverType: string;
  modifier?: string;
  distanceM: number;
  durationS: number;
}

export interface NavState {
  routeCoords: [number, number][];
  steps: NavStep[];
  currentStepIdx: number;
  distanceToNext: number;
  totalDistanceM: number;
  totalDurationS: number;
  userLat: number | null;
  userLon: number | null;
  isRerouting: boolean;
}

export function useDirectionsNav(waypoints: Array<{ lat: number; lon: number }>) {
  const [state, setState] = useState<NavState>({
    routeCoords: [], steps: [], currentStepIdx: 0,
    distanceToNext: 0, totalDistanceM: 0, totalDurationS: 0,
    userLat: null, userLon: null, isRerouting: false,
  });
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  async function fetchRoute(from: { lat: number; lon: number }, wps: Array<{ lat: number; lon: number }>) {
    const coords = [from, ...wps].map(w => `${w.lon},${w.lat}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json() as {
      routes: Array<{
        geometry: { coordinates: [number, number][] };
        distance: number; duration: number;
        legs: Array<{ steps: Array<{ maneuver: { type: string; modifier?: string; instruction: string }; distance: number; duration: number }> }>;
      }>;
    };
    const route = data.routes?.[0];
    if (!route) return;
    const steps: NavStep[] = route.legs.flatMap(l => l.steps.map(s => ({
      instruction: s.maneuver.instruction,
      maneuverType: s.maneuver.type,
      modifier: s.maneuver.modifier,
      distanceM: s.distance,
      durationS: s.duration,
    })));
    setState(prev => ({
      ...prev,
      routeCoords: route.geometry.coordinates,
      steps,
      totalDistanceM: route.distance,
      totalDurationS: route.duration,
      currentStepIdx: 0,
      isRerouting: false,
    }));
  }

  function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  useEffect(() => {
    if (waypoints.length < 1) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const from = { lat: initial.coords.latitude, lon: initial.coords.longitude };
      setState(prev => ({ ...prev, userLat: from.lat, userLon: from.lon }));
      await fetchRoute(from, waypoints);

      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
        (loc) => {
          const { latitude: lat, longitude: lon } = loc.coords;
          setState(prev => {
            // Check if off route
            const onRoute = prev.routeCoords.some(([rLon, rLat]) =>
              distanceBetween(lat, lon, rLat, rLon) < REROUTE_THRESHOLD_M
            );
            if (!onRoute && !prev.isRerouting && prev.routeCoords.length > 0) {
              // Reroute
              fetchRoute({ lat, lon }, waypoints);
              return { ...prev, userLat: lat, userLon: lon, isRerouting: true };
            }
            // Advance step if close to next maneuver
            const nextStep = prev.steps[prev.currentStepIdx];
            const stepCoord = prev.routeCoords[prev.currentStepIdx] ?? prev.routeCoords[0];
            const distToStep = stepCoord ? distanceBetween(lat, lon, stepCoord[1], stepCoord[0]) : 999;
            const advanceStep = nextStep && distToStep < 30 && prev.currentStepIdx < prev.steps.length - 1;
            return {
              ...prev,
              userLat: lat, userLon: lon,
              distanceToNext: distToStep,
              currentStepIdx: advanceStep ? prev.currentStepIdx + 1 : prev.currentStepIdx,
            };
          });
        }
      );
    })();

    return () => { locationSub.current?.remove(); };
  }, []);

  return state;
}
```

**Step 2: Create NavigationScreen**

```tsx
// mobile/app/(driver)/navigation.tsx
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapboxGL from '@rnmapbox/maps';
import { useDirectionsNav } from '../../src/hooks/useDirectionsNav';
import { useApi } from '../../src/hooks/useApi';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

// Parse waypoints from query param: "lat1,lon1;lat2,lon2"
function parseWaypoints(str: string): Array<{ lat: number; lon: number }> {
  return str.split(';').map(p => {
    const [lat, lon] = p.split(',').map(Number);
    return { lat, lon };
  }).filter(w => w.lat && w.lon);
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatEta(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function NavigationScreen() {
  const { journeyId, waypoints: waypointsParam } = useLocalSearchParams<{ journeyId: string; waypoints: string }>();
  const router = useRouter();
  const api = useApi();
  const waypoints = parseWaypoints(waypointsParam ?? '');

  const nav = useDirectionsNav(waypoints);

  const currentStep = nav.steps[nav.currentStepIdx];
  const isLastStep = nav.currentStepIdx >= nav.steps.length - 1;

  async function handleArrive() {
    if (journeyId) {
      await api.post(`/journeys/${journeyId}/close`).catch(() => {});
    }
    router.back();
  }

  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: nav.routeCoords },
    properties: {},
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Maneuver banner */}
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          {nav.isRerouting ? (
            <Text style={styles.rerouteText}>Rerouting…</Text>
          ) : currentStep ? (
            <>
              <Text style={styles.maneuverDist}>{formatDistance(nav.distanceToNext || currentStep.distanceM)}</Text>
              <Text style={styles.maneuverText} numberOfLines={2}>{currentStep.instruction}</Text>
            </>
          ) : (
            <Text style={styles.maneuverText}>Starting navigation…</Text>
          )}
        </View>
        <View style={styles.etaBadge}>
          <Text style={styles.etaText}>{formatEta(nav.totalDurationS)}</Text>
          <Text style={styles.etaSub}>{formatDistance(nav.totalDistanceM)}</Text>
        </View>
      </View>

      {/* Map */}
      <MapboxGL.MapView style={styles.map} styleURL="mapbox://styles/mapbox/dark-v11">
        <MapboxGL.Camera
          followUserLocation
          followZoomLevel={15}
          followUserMode={MapboxGL.UserTrackingMode.FollowWithHeading}
        />
        <MapboxGL.UserLocation visible animated />

        {nav.routeCoords.length > 1 && (
          <MapboxGL.ShapeSource id="route" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="route-line"
              style={{ lineColor: '#4a90ff', lineWidth: 5, lineOpacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
            />
          </MapboxGL.ShapeSource>
        )}

        {waypoints.map((wp, i) => (
          <MapboxGL.MarkerView key={i} coordinate={[wp.lon, wp.lat]}>
            <View style={[styles.waypointPin, i === waypoints.length - 1 && styles.destinationPin]}>
              <Text style={styles.waypointText}>{i === waypoints.length - 1 ? '🏁' : String(i + 1)}</Text>
            </View>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Arrive button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.arriveBtn, !isLastStep && styles.arriveBtnDisabled]}
          onPress={handleArrive}
        >
          <Text style={styles.arriveBtnText}>{isLastStep ? 'Mark Arrived' : `${nav.steps.length - nav.currentStepIdx} steps remaining`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1e25' },
  banner: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: '#1a1e25', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2a2e35' },
  bannerContent: { flex: 1 },
  maneuverDist: { fontSize: 28, fontWeight: '600', color: '#4a90ff', fontFamily: 'IBMPlexMono' },
  maneuverText: { fontSize: 14, color: '#e8e4d8', marginTop: 2, fontFamily: 'IBMPlexSans' },
  rerouteText: { fontSize: 16, color: '#f5a524', fontFamily: 'IBMPlexSans' },
  etaBadge: { backgroundColor: '#2a2e35', borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 70 },
  etaText: { fontSize: 16, fontWeight: '600', color: '#e8e4d8', fontFamily: 'IBMPlexMono' },
  etaSub: { fontSize: 10, color: '#8a8270', marginTop: 2, fontFamily: 'IBMPlexMono' },
  map: { flex: 1, marginTop: 120 },
  waypointPin: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4a90ff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  destinationPin: { backgroundColor: '#1ec991' },
  waypointText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 34, backgroundColor: '#1a1e25', borderTopWidth: 1, borderTopColor: '#2a2e35' },
  arriveBtn: { backgroundColor: '#1ec991', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  arriveBtnDisabled: { backgroundColor: '#2a2e35' },
  arriveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'IBMPlexSans' },
});
```

**Step 3: Wire from today.tsx**

In `mobile/app/(driver)/today.tsx`, find the "Start Journey" / activate button. After calling activate API:
```typescript
import { router } from 'expo-router';

// After successful activate:
const waypointsParam = journey.waypoints
  .map((w: { lat: number; lon: number }) => `${w.lat},${w.lon}`)
  .join(';');
router.push(`/navigation?journeyId=${journey.id}&waypoints=${waypointsParam}`);
```

**Step 4: Check TypeScript**
```bash
cd mobile && npx tsc --noEmit 2>&1
```

**Step 5: Commit**
```bash
git add mobile/app/(driver)/navigation.tsx mobile/src/hooks/useDirectionsNav.ts mobile/app/(driver)/today.tsx
git commit -m "feat(mobile): driver in-app turn-by-turn navigation with Mapbox Directions"
```

---

## Task 11: Mobile Passenger — Address search for pickup

**Files:**
- Create: `mobile/src/components/GeocoderInput.tsx`
- Modify: `mobile/app/(passenger)/request-pickup.tsx` (or equivalent screen)

**Step 1: Create mobile geocoder component**

```tsx
// mobile/src/components/GeocoderInput.tsx
import { useState, useRef } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useApi } from '../hooks/useApi';

interface GeoResult { name: string; fullAddress: string; lat: number; lon: number; }

interface Props {
  placeholder?: string;
  onSelect: (r: GeoResult) => void;
  proximityLon?: number;
  proximityLat?: number;
}

export function GeocoderInput({ placeholder = 'Search location…', onSelect, proximityLon, proximityLat }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const api = useApi();

  function handleChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: val });
        if (proximityLon) params.set('lon', String(proximityLon));
        if (proximityLat) params.set('lat', String(proximityLat));
        const data = await api.get<GeoResult[]>(`/mapbox/geocode?${params}`);
        setResults(data ?? []);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }

  function handleSelect(r: GeoResult) {
    setQuery(r.fullAddress);
    setResults([]);
    onSelect(r);
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#8a8270"
          style={styles.input}
        />
        {loading && <ActivityIndicator size="small" color="#4a90ff" style={styles.spinner} />}
      </View>
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(_, i) => String(i)}
          style={styles.dropdown}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelect(item)} style={styles.resultItem}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultAddress} numberOfLines={1}>{item.fullAddress}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#242830', borderRadius: 8, borderWidth: 1, borderColor: '#2a2e35', paddingHorizontal: 12 },
  input: { flex: 1, height: 44, color: '#e8e4d8', fontSize: 14, fontFamily: 'IBMPlexSans' },
  spinner: { marginLeft: 8 },
  dropdown: { backgroundColor: '#1e2228', borderRadius: 8, borderWidth: 1, borderColor: '#2a2e35', marginTop: 4, maxHeight: 200 },
  resultItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2e35' },
  resultName: { fontSize: 13, fontWeight: '600', color: '#e8e4d8', fontFamily: 'IBMPlexSans' },
  resultAddress: { fontSize: 11, color: '#8a8270', marginTop: 2, fontFamily: 'IBMPlexSans' },
});
```

**Step 2: Use in passenger pickup screen**

Find passenger pickup request screen. Replace coordinate/name inputs for pickup and drop with:
```tsx
import { GeocoderInput } from '../../src/components/GeocoderInput';

// Replace pickup location input:
<GeocoderInput
  placeholder="Pickup location…"
  proximityLon={55.20}
  proximityLat={18.13}
  onSelect={r => {
    setPickupName(r.name);
    setPickupLat(r.lat);
    setPickupLon(r.lon);
  }}
/>

// Replace drop location input:
<GeocoderInput
  placeholder="Drop location…"
  proximityLon={55.20}
  proximityLat={18.13}
  onSelect={r => {
    setDropName(r.name);
    setDropLat(r.lat);
    setDropLon(r.lon);
  }}
/>
```

**Step 3: TypeScript check + commit**
```bash
cd mobile && npx tsc --noEmit 2>&1
git add mobile/src/components/GeocoderInput.tsx mobile/app/(passenger)/
git commit -m "feat(mobile): geocoding address search for passenger pickup/drop"
```

---

## Task 12: Final TS + test run

**Step 1: Backend TS check**
```bash
cd "d:/onedrive/OneDrive - WebSynergies(S) Pte Ltd/Desktop/fleetops"
npx tsc --noEmit 2>&1
```
Expected: 0 errors

**Step 2: Frontend TS check**
```bash
cd frontend && npx tsc --noEmit 2>&1
```
Expected: 0 errors

**Step 3: Run all tests**
```bash
cd "d:/onedrive/OneDrive - WebSynergies(S) Pte Ltd/Desktop/fleetops"
DATABASE_URL="postgresql://fleetops:fleetops_secret@localhost:5432/fleetops" REDIS_URL="redis://localhost:6379" MINIO_ACCESS_KEY=fleetops_minio MINIO_SECRET_KEY=fleetops_minio_secret MFA_ISSUER=FleetOps METRICS_USER=metrics METRICS_PASS=test SMS_PROVIDER=none WHATSAPP_PROVIDER=none JWT_SECRET=test-jwt-secret-min-16-chars JWT_REFRESH_SECRET=test-refresh-secret-min-16 MAPBOX_TOKEN="" npx vitest run 2>&1
```
Expected: 15/15 pass

**Step 4: Final commit**
```bash
git add -A
git commit -m "feat: Mapbox full integration — directions, geocoding, map matching, isochrones"
```
