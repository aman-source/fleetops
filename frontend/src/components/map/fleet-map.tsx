'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLayout } from '@/stores/layout';

interface Vehicle {
  vehicleId: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  ignition: boolean;
  status: string;
  online: boolean;
}

// Desert palette marker — sage green for online, muted for offline
function vehicleIcon(online: boolean) {
  const color = online ? '#7aa05b' : '#8a8270';
  const stroke = online ? '#fff' : '#cdc4ad';
  const glow = online ? 'filter: drop-shadow(0 0 4px rgba(122,160,91,0.5));' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" style="${glow}"><circle cx="12" cy="12" r="5" fill="${color}" stroke="${stroke}" stroke-width="1.5"/></svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: '',
  });
}

// Oman center — Marmul area
const OMAN_CENTER: [number, number] = [18.13, 55.20];

// Invalidate map size when sidebar or right panel toggles
function MapResizer() {
  const map = useMap();
  const sidebarOpen = useLayout((s) => s.sidebarOpen);
  const rightPanelOpen = useLayout((s) => s.rightPanelOpen);

  useEffect(() => {
    // Fire multiple times to catch CSS transition
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map, sidebarOpen, rightPanelOpen]);

  return null;
}

export default function FleetMap({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <MapContainer
      center={OMAN_CENTER}
      zoom={8}
      className="h-full w-full"
      zoomControl={false}
    >
      <MapResizer />
      {/* CartoDB Voyager — light tiles matching editorial mood */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {vehicles.filter((v) => v.lat && v.lon).map((v) => (
        <Marker
          key={v.vehicleId}
          position={[v.lat, v.lon]}
          icon={vehicleIcon(v.online)}
        >
          <Popup>
            <div className="text-[12px]">
              <strong>{v.vehicleId?.slice(0, 8) ?? '—'}</strong>
              <br />
              Speed: {(v.speed ?? 0).toFixed(0)} km/h
              <br />
              Status: {v.status ?? 'unknown'}
              <br />
              Ignition: {v.ignition ? 'ON' : 'OFF'}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
