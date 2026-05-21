'use client';

import { useCallback, useRef, useState } from 'react';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox';
import type { FeatureCollection, Feature, Point, LineString, Polygon, MultiPolygon } from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export interface VehicleLive {
  vehicleId: string;
  plateNo?: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  status: string;
  online: boolean;
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

interface PopupInfo {
  vehicleId: string;
  plateNo?: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  status: string;
  online: boolean;
}

// Oman center — Marmul ops area
const OMAN_CENTER: [number, number] = [55.20, 18.13];

const STATUS_COLOR: Record<string, string> = {
  available: '#1ec991',
  conditional: '#f5a524',
  no_go: '#ef4747',
  under_maintenance: '#4a90ff',
};

function buildVehicleGeoJSON(vehicles: VehicleLive[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: vehicles
      .filter(v => v.lat && v.lon)
      .map(v => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [v.lon, v.lat] },
        properties: {
          vehicleId: v.vehicleId,
          plateNo: v.plateNo ?? v.vehicleId.slice(0, 8),
          speed: v.speed ?? 0,
          heading: v.heading ?? 0,
          ignition: v.ignition,
          status: v.status,
          online: v.online,
          color: v.online ? (STATUS_COLOR[v.status] ?? '#1ec991') : '#8a8270',
        },
      })),
  };
}

function buildRoutesGeoJSON(routes: JourneyRoute[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: routes
      .filter(r => r.directionsRoute != null || r.waypoints.length >= 2)
      .map(r => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: r.directionsRoute
            ? r.directionsRoute.coordinates
            : r.waypoints
                .sort((a, b) => a.sequence - b.sequence)
                .map(wp => [wp.lon, wp.lat]),
        },
        properties: {
          journeyNo: r.journeyNo,
          status: r.status,
          color: r.status === 'deviated' ? '#ef4747' : r.status === 'delayed' ? '#f5a524' : '#4a90ff',
          hasDirect: r.directionsRoute ? 'true' : 'false',
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

function buildIsochroneGeoJSON(
  isochrones: IsochroneZone[],
): FeatureCollection<Polygon | MultiPolygon> {
  return {
    type: 'FeatureCollection',
    features: isochrones.map(i => ({
      type: 'Feature' as const,
      geometry: i.feature.geometry as Polygon | MultiPolygon,
      properties: { vehicleId: i.vehicleId },
    })),
  };
}

export default function FleetMap({
  vehicles,
  routes = [],
  trails = [],
  isochrones = [],
}: {
  vehicles: VehicleLive[];
  routes?: JourneyRoute[];
  trails?: VehicleTrail[];
  isochrones?: IsochroneZone[];
}) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [cursor, setCursor] = useState('grab');

  const vehicleGeoJSON = buildVehicleGeoJSON(vehicles);
  const routesGeoJSON = buildRoutesGeoJSON(routes);
  const trailsGeoJSON = buildTrailsGeoJSON(trails);
  const isochroneGeoJSON = buildIsochroneGeoJSON(isochrones);

  const onClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) { setPopup(null); return; }

    if (feature.layer?.id === 'clusters') {
      const clusterId = feature.properties?.cluster_id as number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const source = mapRef.current?.getSource('vehicles') as any;
      source?.getClusterExpansionZoom(clusterId, (err: Error | null, zoom: number) => {
        if (!err && zoom != null) {
          const coords = (feature.geometry as Point).coordinates as [number, number];
          mapRef.current?.flyTo({ center: coords, zoom, duration: 500 });
        }
      });
      return;
    }

    if (feature.layer?.id === 'unclustered') {
      const p = feature.properties!;
      const coords = (feature.geometry as Point).coordinates as [number, number];
      setPopup({
        vehicleId: p.vehicleId, plateNo: p.plateNo,
        lat: coords[1], lon: coords[0],
        speed: p.speed, heading: p.heading,
        ignition: p.ignition === true || p.ignition === 'true',
        status: p.status, online: p.online === true || p.online === 'true',
      });
    }
  }, []);

  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => setCursor('grab'), []);

  if (!TOKEN) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-bg-2 gap-3">
        <span className="font-mono text-[12px] text-ink-3">MAPBOX TOKEN MISSING</span>
        <span className="text-[11px] text-ink-3">Set NEXT_PUBLIC_MAPBOX_TOKEN in environment</span>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      initialViewState={{ longitude: OMAN_CENTER[0], latitude: OMAN_CENTER[1], zoom: 7 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      interactiveLayerIds={['clusters', 'unclustered']}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      cursor={cursor}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {/* Isochrone coverage zones — 30-min drive reach per online vehicle */}
      {isochrones.length > 0 && (
        <Source id="isochrones" type="geojson" data={isochroneGeoJSON}>
          <Layer
            id="isochrone-fill"
            type="fill"
            paint={{
              'fill-color': '#1ec991',
              'fill-opacity': 0.12,
            }}
          />
          <Layer
            id="isochrone-border"
            type="line"
            paint={{
              'line-color': '#1ec991',
              'line-width': 1.5,
              'line-opacity': 0.55,
              'line-dasharray': [3, 2],
            }}
          />
        </Source>
      )}

      {/* Route lines — planned journey paths */}
      <Source id="routes" type="geojson" data={routesGeoJSON}>
        <Layer
          id="route-line"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.75,
            'line-dasharray': ['case', ['==', ['get', 'hasDirect'], 'true'], ['literal', [1]], ['literal', [4, 2]]],
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>

      {/* GPS trails — last 30 min per vehicle */}
      <Source id="trails" type="geojson" data={trailsGeoJSON}>
        <Layer
          id="trail-line"
          type="line"
          paint={{
            'line-color': '#f5a524',
            'line-width': 1.5,
            'line-opacity': 0.5,
          }}
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        />
      </Source>

      {/* Vehicle dots — clustered */}
      <Source
        id="vehicles"
        type="geojson"
        data={vehicleGeoJSON}
        cluster
        clusterMaxZoom={11}
        clusterRadius={45}
      >
        {/* Cluster circle */}
        <Layer
          id="clusters"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': [
              'step', ['get', 'point_count'],
              '#4a90ff', 5, '#f5a524', 20, '#ef4747',
            ],
            'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 30],
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff40',
          }}
        />
        {/* Cluster count label */}
        <Layer
          id="cluster-count"
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          }}
          paint={{ 'text-color': '#ffffff' }}
        />
        {/* Individual vehicle dot */}
        <Layer
          id="unclustered"
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': ['get', 'color'],
            'circle-radius': 7,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
          }}
        />
        {/* Plate label at high zoom */}
        <Layer
          id="vehicle-label"
          type="symbol"
          filter={['!', ['has', 'point_count']]}
          minzoom={12}
          layout={{
            'text-field': ['get', 'plateNo'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': 10,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          }}
          paint={{ 'text-color': '#e8e4d8', 'text-halo-color': '#1a1e2580', 'text-halo-width': 1 }}
        />
      </Source>

      {/* Popup on vehicle click */}
      {popup && (
        <Popup
          longitude={popup.lon}
          latitude={popup.lat}
          anchor="bottom"
          offset={12}
          closeOnClick={false}
          onClose={() => setPopup(null)}
          style={{ fontFamily: 'var(--font-mono, monospace)' }}
        >
          <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 150, padding: '2px 0' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#1a1e25' }}>
              {popup.plateNo ?? popup.vehicleId.slice(0, 8)}
            </div>
            {[
              ['Speed', `${(popup.speed ?? 0).toFixed(0)} km/h`],
              ['Heading', `${popup.heading ?? 0}°`],
              ['Ignition', popup.ignition ? '🟢 ON' : '🔴 OFF'],
              ['Status', (popup.status ?? 'unknown').replace(/_/g, ' ')],
              ['Signal', popup.online ? 'Online' : 'Offline'],
            ].map(([label, value]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#5c5a4e' }}>{label}</span>
                <span style={{ textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>
        </Popup>
      )}
    </Map>
  );
}
