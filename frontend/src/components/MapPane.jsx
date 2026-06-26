import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

// Build a soft green "hotspot" marker: a radial glow with a center dot.
function hotspotIcon({ size, dot, pulse }) {
  return L.divIcon({
    className: 'ts-hotspot-icon',
    html:
      `<div class="ts-hotspot" style="width:${size}px;height:${size}px;">` +
      `<span class="ts-hotspot-dot${pulse ? ' ts-pulse' : ''}" ` +
      `style="width:${dot}px;height:${dot}px;"></span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -dot],
  });
}

const EMS_ICON = hotspotIcon({ size: 90, dot: 12, pulse: false });
const CALLER_ICON = hotspotIcon({ size: 140, dot: 18, pulse: true });

// Imperatively flies the map to a target whenever it changes.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom || 16, { duration: 1.6 });
    }
  }, [target, map]);
  return null;
}

// Map showing EMS units and the caller as hotspots; flies to a location when
// one is extracted.
export default function MapPane({ center, emsUnits, callerLocation, flyTarget }) {
  return (
    <div className="relative h-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <FlyTo target={flyTarget} />

        {emsUnits.map((unit) => (
          <Marker key={unit.id} position={[unit.lat, unit.lng]} icon={EMS_ICON}>
            <Popup>
              <strong>{unit.id}</strong>
              <br />
              {unit.status}
            </Popup>
          </Marker>
        ))}

        {callerLocation && (
          <Marker position={[callerLocation.lat, callerLocation.lng]} icon={CALLER_ICON}>
            <Popup>
              <strong>Caller location</strong>
              <br />
              {callerLocation.label}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-lg border border-zinc-200/80 bg-white/85 px-3 py-2 shadow-lg backdrop-blur">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Command Map
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-700">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> EMS unit
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Caller
          </span>
        </div>
      </div>
    </div>
  );
}
