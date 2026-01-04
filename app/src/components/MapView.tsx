"use client";


import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import {
  addSpot,
  addSpotsBulk,
  geojsonToSpots,
  getAllSpots,
  isSeeded,
  setSeeded,
  type Spot,
} from "@/lib/spotsDb";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";


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
    category?: "wait" | "shortcut" | "danger";
    memo?: string;
    createdAt?: string;
  };
  geometry: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
};

type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

function MapRightClickAdd({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    contextmenu(e) {
      // 右クリック（スマホだと長押し相当になることも）
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView() {
  const center: LatLngExpression = [34.426, 132.743];

  const [spots, setSpots] = useState<Spot[]>([]);
  const [draft, setDraft] = useState<{
    lat: number;
    lng: number;
    title: string;
    memo: string;
    category: "wait" | "shortcut" | "danger";
  } | null>(null);

  useEffect(() => {
  (async () => {
    // 1) IndexedDBから読む
    const saved = await getAllSpots();

    // 2) まだ空なら、初回だけGeoJSONを取り込む
    if (saved.length === 0) {
      const seeded = await isSeeded();
      if (!seeded) {
        const res = await fetch("/spots.geojson");
        const geo = await res.json();
        const initial = geojsonToSpots(geo);
        await addSpotsBulk(initial);
        await setSeeded(true);
        setSpots(initial);
        return;
      }
    }

    setSpots(saved);
  })();
  }, []);


  const allSpots = useMemo(() => spots, [spots]);

  const saveDraft = () => {
    if (!draft) return;

    const newFeature: Feature = {
      type: "Feature",
      properties: {
        title: draft.title || "新規スポット",
        memo: draft.memo,
        category: draft.category,
        createdAt: new Date().toISOString(),
      },
      geometry: {
        type: "Point",
        coordinates: [draft.lng, draft.lat], // GeoJSONは [lng, lat]
      },
    };

    setSpots((prev) => [newFeature, ...prev]);
    setDraft(null);
  };

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 右クリックで追加地点を選ぶ */}
        <MapRightClickAdd
          onPick={(lat, lng) => {
            setDraft({
              lat,
              lng,
              title: "",
              memo: "",
              category: "wait",
            });
          }}
        />

        {/* 既存スポット表示 */}
        {allSpots.map((f, idx) => {
          const [lng, lat] = f.geometry.coordinates;
          return (
            <Marker key={idx} position={[lat, lng]}>
              <Popup>
                <div style={{ fontWeight: 700 }}>{f.properties.title}</div>
                <div style={{ opacity: 0.8 }}>
                  カテゴリ: {f.properties.category ?? "-"}
                </div>
                <div>{f.properties.memo ?? ""}</div>
              </Popup>
            </Marker>
          );
        })}

        {/* 追加中（draft）マーカー */}
        {draft && (
          <Marker position={[draft.lat, draft.lng]}>
            <Popup autoClose={false} closeOnClick={false}>
              <div style={{ display: "grid", gap: 8, width: 260 }}>
                <div style={{ fontWeight: 700 }}>スポット追加</div>

                <label>
                  タイトル
                  <input
                    style={{ width: "100%" }}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, title: e.target.value } : d))
                    }
                    placeholder="例）待機スポット（西条）"
                  />
                </label>

                <label>
                  カテゴリ
                  <select
                    style={{ width: "100%" }}
                    value={draft.category}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              category: e.target.value as any,
                            }
                          : d
                      )
                    }
                  >
                    <option value="wait">wait（待機）</option>
                    <option value="shortcut">shortcut（裏道）</option>
                    <option value="danger">danger（注意）</option>
                  </select>
                </label>

                <label>
                  メモ
                  <textarea
                    style={{ width: "100%" }}
                    rows={3}
                    value={draft.memo}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, memo: e.target.value } : d))
                    }
                    placeholder="例）昼ピークに鳴りやすい、駐車OK"
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveDraft} style={{ flex: 1 }}>
                    保存
                  </button>
                  <button
                    onClick={() => setDraft(null)}
                    style={{ flex: 1 }}
                  >
                    キャンセル
                  </button>
                </div>

                <div style={{ opacity: 0.7 }}>
                  {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
