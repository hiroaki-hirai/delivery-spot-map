"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  addSpot,
  geojsonToSpots,
  getAllSpots,
  isSeeded,
  setSeeded,
  type Spot,
} from "@/lib/spotsDb";
import type { FeatureCollection } from "geojson";

// eslint が気になるなら next line で逃がすのもOK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapRightClickAdd({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    contextmenu(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView() {
  const center: LatLngExpression = [34.426, 132.743];

  // ✅ Spot[] に統一
  const [spots, setSpots] = useState<Spot[]>([]);
  const [draft, setDraft] = useState<{
    lat: number;
    lng: number;
    title: string;
    memo: string;
    category: Spot["category"];
  } | null>(null);

  useEffect(() => {
    (async () => {
      // 初回seed（必要なら）
      if (!(await isSeeded())) {
        const res = await fetch("/spots.geojson");
        const data = (await res.json()) as FeatureCollection; // any回避
        const seedSpots = geojsonToSpots(data);
        // まとめて保存したいなら spotsDb 側に bulk を用意するのが理想
        for (const s of seedSpots) await addSpot(s);
        await setSeeded(true);
      }
      setSpots(await getAllSpots());
    })();
  }, []);

  const allSpots = useMemo(() => spots, [spots]);

  const saveDraft = async () => {
    if (!draft) return;

    const newSpot: Spot = {
      id: crypto.randomUUID(),
      title: draft.title || "新規スポット",
      memo: draft.memo || "",
      category: draft.category,
      lat: draft.lat,
      lng: draft.lng,
      createdAt: new Date().toISOString(),
    };

    await addSpot(newSpot);
    setSpots((prev) => [newSpot, ...prev]); // ✅ Spot に Spot を追加
    setDraft(null);
  };

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRightClickAdd
          onPick={(lat, lng) => setDraft({ lat, lng, title: "", memo: "", category: "wait" })}
        />

        {/* ✅ Spot[] 描画 */}
        {allSpots.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}>
            <Popup>
              <div style={{ fontWeight: 700 }}>{s.title}</div>
              <div style={{ opacity: 0.8 }}>カテゴリ: {s.category ?? "-"}</div>
              <div>{s.memo ?? ""}</div>
            </Popup>
          </Marker>
        ))}

        {/* draft マーカー */}
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
                    onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                  />
                </label>

                <label>
                  カテゴリ
                  <select
                    style={{ width: "100%" }}
                    value={draft.category}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, category: e.target.value as Spot["category"] } : d))
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
                    onChange={(e) => setDraft((d) => (d ? { ...d, memo: e.target.value } : d))}
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveDraft} style={{ flex: 1 }}>
                    保存
                  </button>
                  <button onClick={() => setDraft(null)} style={{ flex: 1 }}>
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
