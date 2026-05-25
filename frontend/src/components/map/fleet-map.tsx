'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import MapGL, { Source, Layer, NavigationControl, FullscreenControl, useMap } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import type { FeatureCollection, Feature, LineString, Polygon, MultiPolygon } from 'geojson';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getVehicleMarkerHTML, injectMarkerStyles } from './vehicle-icons';
import { VehicleDetailPanel } from './vehicle-detail-panel';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export interface VehicleLive {
  vehicleId: string;
  plateNo?: string;
  vehicleType?: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  status: string;
  online: boolean;
  fuelPct?: number;
  engineRpm?: number;
  odometer?: number;
}

export interface JourneyRoute {
  id: string;
  journeyNo: string;
  status: string;
  vehicleId: string;
  waypoints: { sequence: number; name: string | null; lat: number; lon: number }[];
  directionsRoute?: { type: 'LineString'; coordinates: [number, number][] } | null;
}

export interface VehicleTrail {
  vehicleId: string;
  points: { lat: string | null; lon: string | null; recordedAt: string }[];
}

export interface IsochroneZone {
  vehicleId: string;
  feature: {
    type: string;
    geometry: { type: string; coordinates: unknown };
    properties: unknown;
  };
}

// Center of Oman ops area
const OMAN_CENTER: [number, number] = [56.0, 20.0];

export const STATUS_COLOR: Record<string, string> = {
  available: '#22c55e',
  conditional: '#f59e0b',
  no_go: '#ef4444',
  under_maintenance: '#3b82f6',
  hse_hold: '#ef4444',
  expired_documents: '#f59e0b',
  ivms_fault: '#8b5cf6',
  decommissioned: '#94a3b8',
};

// ─── Geo helpers ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/** Angle lerp — handles wrap-around (e.g. 350° → 10°) */
function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

/** Bearing from [lon,lat] A → B in degrees (0 = north) */
function calcBearing(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLon = toRad(to[0] - from[0]);
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function posChanged(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 0.00001;
}

// ─── Animated vehicle layer ───────────────────────────────────────────────────

type MarkerState = {
  marker: mapboxgl.Marker;
  el: HTMLElement;
  from: [number, number];
  to: [number, number];
  startTime: number;
  duration: number; // ms to lerp over (matches GPS update interval)
  heading: number;
  targetHeading: number;
  vehicleData: VehicleLive;
};

const LERP_DURATION = 15_000; // 15s — matches simulator tick
const HEADING_SPEED = 0.035;  // fraction per frame (~2s to full turn at 60fps)

function AnimatedVehicleLayer({
  vehicles,
  onVehicleClick,
}: {
  vehicles: VehicleLive[];
  onVehicleClick: (v: VehicleLive) => void;
}) {
  const { current: mapInstance } = useMap();
  const markersRef = useRef<Map<string, MarkerState>>(new Map());
  const rafRef = useRef<number>(0);
  const onClickRef = useRef(onVehicleClick);
  onClickRef.current = onVehicleClick;

  // Inject CSS once
  useEffect(() => { injectMarkerStyles(); }, []);

  // Sync markers when vehicles array changes
  useEffect(() => {
    const map = mapInstance?.getMap() as mapboxgl.Map | undefined;
    if (!map) return;

    const currentIds = new Set(
      vehicles
        .filter(v => v.lat && v.lon && !isNaN(v.lat) && !isNaN(v.lon))
        .map(v => v.vehicleId),
    );

    // Remove stale markers
    for (const [id, state] of markersRef.current) {
      if (!currentIds.has(id)) {
        state.marker.remove();
        markersRef.current.delete(id);
      }
    }

    for (const v of vehicles) {
      if (!v.lat || !v.lon || isNaN(v.lat) || isNaN(v.lon)) continue;

      const color = v.online ? (STATUS_COLOR[v.status] ?? '#22c55e') : '#94a3b8';
      const isMoving = v.online && (v.speed ?? 0) > 2;

      const existing = markersRef.current.get(v.vehicleId);

      if (existing) {
        // Update lerp target from current rendered position
        const lngLat = existing.marker.getLngLat();
        const from: [number, number] = [lngLat.lng, lngLat.lat];
        const to: [number, number] = [v.lon, v.lat];

        existing.from = from;
        existing.to = to;
        existing.startTime = performance.now();
        existing.vehicleData = v;

        if (posChanged(from, to)) {
          existing.targetHeading = calcBearing(from, to);
        }

        // Rebuild marker HTML (status/online may have changed)
        const newHTML = getVehicleMarkerHTML(v.vehicleType, color, isMoving, v.online);
        existing.el.innerHTML = newHTML;
        attachMarkerEvents(existing.el, v, onClickRef);
      } else {
        // Create new marker element
        const el = document.createElement('div');
        el.innerHTML = getVehicleMarkerHTML(v.vehicleType, color, isMoving, v.online);
        attachMarkerEvents(el, v, onClickRef);

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([v.lon, v.lat])
          .addTo(map);

        markersRef.current.set(v.vehicleId, {
          marker,
          el,
          from: [v.lon, v.lat],
          to: [v.lon, v.lat],
          startTime: performance.now() - LERP_DURATION, // already at position
          duration: LERP_DURATION,
          heading: v.heading ?? 0,
          targetHeading: v.heading ?? 0,
          vehicleData: v,
        });
      }
    }
  }, [vehicles, mapInstance]);

  // Cleanup all markers on unmount
  useEffect(() => {
    return () => {
      for (const [, state] of markersRef.current) state.marker.remove();
      markersRef.current.clear();
    };
  }, []);

  // requestAnimationFrame loop — runs at 60fps, updates position + heading
  useEffect(() => {
    function animate() {
      const now = performance.now();

      for (const [, s] of markersRef.current) {
        // Position LERP
        const t = Math.min(1, (now - s.startTime) / s.duration);
        const lng = lerp(s.from[0], s.to[0], t);
        const lat = lerp(s.from[1], s.to[1], t);
        s.marker.setLngLat([lng, lat]);

        // Heading LERP (smooth rotation)
        s.heading = lerpAngle(s.heading, s.targetHeading, HEADING_SPEED);
        const iconEl = s.el.querySelector('.vm-icon') as HTMLElement | null;
        if (iconEl) iconEl.style.transform = `rotate(${s.heading}deg)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return null;
}

/** Attach click + plate tooltip to marker element */
function attachMarkerEvents(
  el: HTMLElement,
  v: VehicleLive,
  onClickRef: React.MutableRefObject<(v: VehicleLive) => void>,
) {
  const wrap = el.querySelector('.vm-wrap') as HTMLElement | null;
  if (!wrap) return;

  wrap.addEventListener('click', (e) => {
    e.stopPropagation();
    onClickRef.current(v);
  });

  // Plate tooltip
  const tip = document.createElement('div');
  tip.className = 'vm-tip';
  tip.textContent = v.plateNo ?? v.vehicleId.slice(0, 8);
  wrap.appendChild(tip);
  wrap.addEventListener('mouseenter', () => { tip.style.opacity = '1'; });
  wrap.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
}

// ─── GeoJSON builders ─────────────────────────────────────────────────────────

function buildRoutesGeoJSON(routes: JourneyRoute[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: routes
      .filter(r => r.directionsRoute != null)
      .map(r => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: r.directionsRoute!.coordinates },
        properties: {
          journeyNo: r.journeyNo,
          status: r.status,
          color: r.status === 'deviated' ? '#ef4444' : r.status === 'delayed' ? '#f59e0b' : '#3b82f6',
        },
      })),
  };
}

function buildTrailsGeoJSON(trails: VehicleTrail[]): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = [];
  for (const t of trails) {
    const coords = t.points
      .filter(p => p.lat && p.lon)
      .map(p => [Number(p.lon), Number(p.lat)] as [number, number]);
    if (coords.length >= 2) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { vehicleId: t.vehicleId },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

function buildIsochroneGeoJSON(isochrones: IsochroneZone[]): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: 'FeatureCollection',
    features: isochrones.map(i => ({
      type: 'Feature' as const,
      geometry: i.feature.geometry as Polygon | MultiPolygon,
      properties: { vehicleId: i.vehicleId },
    })),
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FleetMap({
  vehicles,
  routes = [],
  trails = [],
  isochrones = [],
  showRoutes = false,
}: {
  vehicles: VehicleLive[];
  routes?: JourneyRoute[];
  trails?: VehicleTrail[];
  isochrones?: IsochroneZone[];
  showRoutes?: boolean;
}) {
  const mapRef = useRef<MapRef>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLive | null>(null);

  const routesGeoJSON = buildRoutesGeoJSON(routes);
  const trailsGeoJSON = buildTrailsGeoJSON(trails);
  const isochroneGeoJSON = buildIsochroneGeoJSON(isochrones);

  const onMapClick = useCallback((e: MapMouseEvent) => {
    if (!e.features?.length) setSelectedVehicle(null);
  }, []);

  const visibleVehicles = vehicles.filter(v => v.lat && v.lon && !isNaN(v.lat) && !isNaN(v.lon));

  if (!TOKEN) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 gap-3">
        <span className="font-mono text-[12px] text-slate-500">MAPBOX TOKEN MISSING</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <MapGL
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={{ longitude: OMAN_CENTER[0], latitude: OMAN_CENTER[1], zoom: 6.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onClick={onMapClick}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <FullscreenControl position="top-right" />

        {/* Isochrone coverage zones */}
        {isochrones.length > 0 && (
          <Source id="isochrones" type="geojson" data={isochroneGeoJSON}>
            <Layer id="isochrone-fill"   type="fill" paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.08 }} />
            <Layer id="isochrone-border" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.4, 'line-dasharray': [3, 2] }} />
          </Source>
        )}

        {/* GPS trails */}
        {showRoutes && (
          <Source id="trails" type="geojson" data={trailsGeoJSON}>
            <Layer
              id="trail-line"
              type="line"
              paint={{ 'line-color': '#94a3b8', 'line-width': 2, 'line-opacity': 0.4 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        {/* Route lines — Active Journeys tab only */}
        {showRoutes && (
          <Source id="routes" type="geojson" data={routesGeoJSON}>
            <Layer
              id="route-shadow"
              type="line"
              paint={{ 'line-color': '#000', 'line-width': 5, 'line-opacity': 0.06 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id="route-line"
              type="line"
              paint={{ 'line-color': ['get', 'color'], 'line-width': 3.5, 'line-opacity': 0.9 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        {/* Animated vehicle markers — direct mapboxgl, 60fps LERP */}
        <AnimatedVehicleLayer
          vehicles={visibleVehicles}
          onVehicleClick={setSelectedVehicle}
        />
      </MapGL>

      {/* Vehicle detail slide panel */}
      {selectedVehicle && (
        <VehicleDetailPanel
          vehicleId={selectedVehicle.vehicleId}
          liveState={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
