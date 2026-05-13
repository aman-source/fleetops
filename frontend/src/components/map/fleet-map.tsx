'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Custom marker icon — green for online, gray for offline
function vehicleIcon(online: boolean) {
  const color = online ? '#1ec991' : '#5e6776';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="6" stroke="#0a0d12" stroke-width="2"/></svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: '',
  });
}

// Oman center — Marmul area
const OMAN_CENTER: [number, number] = [18.13, 55.20];

export default function FleetMap({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <MapContainer
      center={OMAN_CENTER}
      zoom={8}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {vehicles.map((v) => (
        <Marker
          key={v.vehicleId}
          position={[v.lat, v.lon]}
          icon={vehicleIcon(v.online)}
        >
          <Popup>
            <div className="text-[12px]">
              <strong>{v.vehicleId.slice(0, 8)}</strong>
              <br />
              Speed: {v.speed.toFixed(0)} km/h
              <br />
              Status: {v.status}
              <br />
              Ignition: {v.ignition ? 'ON' : 'OFF'}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
