import { openDB, type DBSchema } from "idb";

export type SpotCategory = "wait" | "shortcut" | "danger";

export type Spot = {
  id: string;
  title: string;
  memo: string;
  category: SpotCategory;
  lat: number;
  lng: number;
  createdAt: string;
};

type Meta = {
  key: "seeded";
  value: boolean;
};

interface SpotDB extends DBSchema {
  spots: {
    key: string;       // id
    value: Spot;
    indexes: { "by-createdAt": string };
  };
  meta: {
    key: Meta["key"];
    value: Meta;
  };
}

const DB_NAME = "delivery-spot-map";
const DB_VERSION = 1;

async function getDb() {
  return openDB<SpotDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore("spots", { keyPath: "id" });
      store.createIndex("by-createdAt", "createdAt");
      db.createObjectStore("meta", { keyPath: "key" });
    },
  });
}

export async function getAllSpots(): Promise<Spot[]> {
  const db = await getDb();
  return db.getAll("spots");
}

export async function addSpot(spot: Spot): Promise<void> {
  const db = await getDb();
  await db.put("spots", spot);
}

export async function addSpotsBulk(spots: Spot[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("spots", "readwrite");
  for (const s of spots) tx.store.put(s);
  await tx.done;
}

export async function isSeeded(): Promise<boolean> {
  const db = await getDb();
  const meta = await db.get("meta", "seeded");
  return meta?.value ?? false;
}

export async function setSeeded(value: boolean): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key: "seeded", value });
}

// GeoJSON → Spot[] に変換（Pointのみ）
export function geojsonToSpots(data: any): Spot[] {
  const features = data?.features ?? [];
  return features
    .filter((f: any) => f?.geometry?.type === "Point")
    .map((f: any, i: number) => {
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const p = f.properties ?? {};
      const createdAt = new Date().toISOString();

      return {
        id: crypto.randomUUID(),
        title: String(p.title ?? `Spot ${i + 1}`),
        memo: String(p.memo ?? ""),
        category: (p.category as SpotCategory) ?? "wait",
        lat,
        lng,
        createdAt,
      };
    });
}
