"use client";

import { MapContainer, TileLayer } from "react-leaflet";

export default function MapView() {
  return (
    <div className="h-screen w-screen">
      <MapContainer
        center={[34.4, 132.7]} // 仮: 広島あたり
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}
