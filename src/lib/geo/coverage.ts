import { haversineMeters } from "./haversine";

export interface CoverageArea {
  id: string;
  nombre: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  activa: boolean;
  owner_id: string | null;
}

export function isInsideAnyArea(
  lat: number,
  lng: number,
  areas: Pick<CoverageArea, "center_lat" | "center_lng" | "radius_m" | "activa">[],
): boolean {
  return areas.some(
    (a) =>
      a.activa &&
      haversineMeters(
        { latitude: lat, longitude: lng },
        { latitude: a.center_lat, longitude: a.center_lng },
      ) <= a.radius_m,
  );
}