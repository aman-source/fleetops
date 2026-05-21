import { env } from '../env.js';

const BASE = 'https://api.mapbox.com';
const TOKEN = env.MAPBOX_TOKEN;

// Oman bounding box
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
  distance: number;
  duration: number;
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
  const chunk = points.slice(-100);
  const coords = chunk.map(p => `${p.lon},${p.lat}`).join(';');
  const radiuses = chunk.map(() => '25').join(';');
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
  minutes = 30,
): Promise<{ type: string; geometry: { type: string; coordinates: unknown } } | null> {
  if (!TOKEN) return null;
  const params = new URLSearchParams({
    access_token: TOKEN,
    contours_minutes: String(minutes),
    polygons: 'true',
  });
  const url = `${BASE}/isochrone/v1/mapbox/driving/${lon},${lat}?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { features: Array<{ type: string; geometry: { type: string; coordinates: unknown } }> };
  return data.features?.[0] ?? null;
}

export async function getDirectionsMatrix(
  origins: Array<{ lat: number; lon: number }>,
  destinations: Array<{ lat: number; lon: number }>,
): Promise<number[][] | null> {
  if (!TOKEN) return null;
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
