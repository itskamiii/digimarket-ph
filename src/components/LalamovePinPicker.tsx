import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

// Bundlers can't resolve Leaflet's default marker image paths, so point them at the
// same CDN version as the installed package instead of shipping/inlining the assets.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Metro Manila center — a reasonable default view since Lalamove is NCR-only.
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

type LatLng = { lat: number; lng: number };

function ClickToPlacePin({ onChange }: { onChange: (pin: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LalamovePinPicker({ value, onChange }: { value: LatLng | null; onChange: (pin: LatLng) => void }) {
  // Fixes a common Leaflet/bundler issue where the map renders at the wrong size if its
  // container wasn't visible on first mount (e.g. inside a just-opened modal).
  useEffect(() => {
    const id = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-900/10">
      <MapContainer
        center={value ?? DEFAULT_CENTER}
        zoom={value ? 15 : 11}
        style={{ height: 220, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlacePin onChange={onChange} />
        {value && (
          <Marker
            position={value}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                onChange({ lat: pos.lat, lng: pos.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
