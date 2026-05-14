'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLayout } from '@/stores/layout';

interface Vehicle {
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

/**
 * Vehicle pin matching design handoff — vehiclePinHTML
 * Colored circle (12px) with plate label on hover via CSS.
 * Colors: go=green, nogo=red, conditional=amber, offline=grey
 */
function vehicleIcon(v: Vehicle) {
  const statusColors: Record<string, string> = {
    available: '#1ec991',
    go: '#1ec991',
    conditional: '#f5a524',
    no_go: '#ef4747',
    under_maintenance: '#4a90ff',
  };
  const color = v.online ? (statusColors[v.status] ?? '#1ec991') : '#8a8270';
  const plate = v.plateNo ?? v.vehicleId?.slice(0, 8) ?? '';
  const glow = v.online ? `filter: drop-shadow(0 0 3px ${color}80);` : '';

  const html = `
    <div style="position:relative;${glow}" class="vehicle-pin">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6" fill="${color}" stroke="#fff" stroke-width="1.5"/>
        ${v.ignition ? '<circle cx="8" cy="8" r="2.5" fill="#fff" fill-opacity="0.6"/>' : ''}
      </svg>
      <div style="position:absolute;left:50%;top:18px;transform:translateX(-50%);white-space:nowrap;font-family:var(--font-mono),monospace;font-size:9px;color:#1a1e25;background:rgba(255,255,255,0.92);padding:1px 4px;border-radius:3px;pointer-events:none;opacity:0;transition:opacity .15s;text-shadow:0 0 2px rgba(255,255,255,0.8);box-shadow:0 1px 3px rgba(0,0,0,0.1);" class="pin-label">${plate}</div>
    </div>`;

  return L.divIcon({
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map, sidebarOpen, rightPanelOpen]);

  return null;
}

export default function FleetMap({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <>
      {/* Pin hover CSS — show label on hover */}
      <style>{`.vehicle-pin:hover .pin-label { opacity: 1 !important; }`}</style>
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
            icon={vehicleIcon(v)}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, lineHeight: 1.6, minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{v.plateNo ?? v.vehicleId?.slice(0, 8)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5c5a4e' }}>Speed</span>
                  <span>{(v.speed ?? 0).toFixed(0)} km/h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5c5a4e' }}>Heading</span>
                  <span>{v.heading ?? 0}&deg;</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5c5a4e' }}>Ignition</span>
                  <span style={{ color: v.ignition ? '#1ec991' : '#ef4747' }}>{v.ignition ? 'ON' : 'OFF'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#5c5a4e' }}>Status</span>
                  <span style={{ textTransform: 'capitalize' }}>{(v.status ?? 'unknown').replace(/_/g, ' ')}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
