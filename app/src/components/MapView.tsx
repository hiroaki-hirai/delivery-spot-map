"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  addSpot,
  addSpotsBulk,
  geojsonToSpots,
  getAllSpots,
  isSeeded,
  setSeeded,
} from "@/lib/spotsDb";
import type { Spot, SpotCategory } from "@/lib/spotsDb";

import { iconByCategory } from "@/components/map/icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapRightClickAdd({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    contextmenu(e) {
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
    category: SpotCategory;
  } | null>(null);

  // 1) 起動時に DB を読む → 空なら GeoJSON を seed → 最後に DB を読む（DBを正）
  useEffect(() => {
    (async () => {
      // まずDBを読む
      const dbSpots = await getAllSpots();
      if (dbSpots.length > 0) {
        setSpots(dbSpots);
        return;
      }

      // 空なら seed（ただし一度だけにしたいなら seeded フラグも使う）
      const seeded = await isSeeded();
      if (!seeded) {
        const res = await fetch("/spots.geojson");
        const geo = await res.json(); // geojsonToSpots 側で型寄せする前提
        const initialSpots = geojsonToSpots(geo);
        if (initialSpots.length > 0) {
          await addSpotsBulk(initialSpots);
        }
        await setSeeded(true);
      }

      // 最後にDBを読み直して stateへ
      const after = await getAllSpots();
      setSpots(after);
    })();
  }, []);

  const allSpots = useMemo(() => spots, [spots]);

  // 2) 追加もDBへ保存 → 保存後に state を更新（DBを正）
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

    // stateだけ更新してもOKだが、DBを正にするなら読み直しが確実
    const after = await getAllSpots();
    setSpots(after);

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

        {/* 既存スポット表示（Spot[]） */}
        {allSpots.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={iconByCategory[s.category ?? "wait"]}
            >
            <Popup>
              <div style={{ fontWeight: 700 }}>{s.title}</div>
              <div style={{ opacity: 0.8 }}>カテゴリ: {s.category ?? "-"}</div>
              <div>{s.memo ?? ""}</div>
            </Popup>
          </Marker>
        ))}

        {/* 追加中（draft）マーカー */}
        {draft && (
            <Marker
              position={[draft.lat, draft.lng]}
              icon={iconByCategory[draft.category ?? "wait"]}
            >
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
                        d ? { ...d, category: e.target.value as SpotCategory } : d
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
