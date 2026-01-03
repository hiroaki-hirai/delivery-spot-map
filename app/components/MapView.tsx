"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

// Leafletのデフォルトアイコンが崩れるのを防ぐ（Next.jsだとよく起きる）
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Feature = {
  type: "Feature";
  properties: {
    title?: string;
    category?: string;
    memo?: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

export default function MapView() {
  const center: LatLngExpression = [34.426, 132.743]; // [lat, lng] Map表示は逆順
  const [spots, setSpots] = useState<Feature[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/spots.geojson");
      const data = (await res.json()) as FeatureCollection;
      setSpots(data.features ?? []);
    })();
  }, []);

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {spots.map((f, idx) => {
          const [lng, lat] = f.geometry.coordinates;
          const title = f.properties.title ?? "スポット";
          const memo = f.properties.memo ?? "";
          const category = f.properties.category ?? "";

          return (
            <Marker key={idx} position={[lat, lng]}>
              <Popup>
                <div style={{ fontWeight: 700 }}>{title}</div>
                {category && <div>カテゴリ: {category}</div>}
                {memo && <div>{memo}</div>}
                <div style={{ opacity: 0.7, marginTop: 6 }}>
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
