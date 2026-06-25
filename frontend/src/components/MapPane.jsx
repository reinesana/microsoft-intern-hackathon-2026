import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';

// Imperatively flies the map to a target whenever it changes.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 16, { duration: 1.6 });
    }
  }, [target, map]);
  return null;
}

/**
 * Left pane: dark interactive map showing EMS units and the caller location.
 * Pans/zooms automatically as locations are extracted from the transcript.
 */
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
          <CircleMarker
            key={unit.id}
            center={[unit.lat, unit.lng]}
            radius={8}
            pathOptions={{ color: '#818cf8', fillColor: '#6366f1', fillOpacity: 0.9 }}
          >
            <Popup>
              <strong>{unit.id}</strong>
              <br />
              {unit.status}
            </Popup>
          </CircleMarker>
        ))}

        {callerLocation && (
          <CircleMarker
            center={[callerLocation.lat, callerLocation.lng]}
            radius={11}
            pathOptions={{ color: '#f43f5e', fillColor: '#fb7185', fillOpacity: 0.9 }}
          >
            <Popup>
              <strong>Caller location</strong>
              <br />
              {callerLocation.label}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Command Map
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> EMS unit
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Caller
          </span>
        </div>
      </div>
    </div>
  );
}
