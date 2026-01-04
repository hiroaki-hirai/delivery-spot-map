import L from "leaflet";

export type SpotCategory = "wait" | "shortcut" | "danger";

const makeIcon = (url: string) =>
  new L.Icon({
    iconUrl: url,
    iconRetinaUrl: url,
    iconSize: [32, 45],      // ← 視認性◎
    iconAnchor: [16, 45],   // ← ピンの先端
    popupAnchor: [0, -41],
  });

export const iconByCategory: Record<SpotCategory, L.Icon> = {
  wait: makeIcon("/icons/wait.png"),
  shortcut: makeIcon("/icons/shortcut.png"),
  danger: makeIcon("/icons/danger.png"),
};
