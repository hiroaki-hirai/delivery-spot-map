import L from "leaflet";

export type SpotCategory = "wait" | "shortcut" | "danger";

const makeIcon = (url: string) =>
  new L.Icon({
    iconUrl: url,
    iconRetinaUrl: url,
    iconSize: [32, 42],      // ← 視認性◎
    iconAnchor: [16, 42],   // ← ピンの先端
    popupAnchor: [0, -38],
  });

export const iconByCategory: Record<SpotCategory, L.Icon> = {
  wait: makeIcon("/icons/wait.png"),
  shortcut: makeIcon("/icons/shortcut.png"),
  danger: makeIcon("/icons/danger.png"),
};
