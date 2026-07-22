import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leafletSetup";

export type LatLng = { latitude: number; longitude: number };

type Props = {
  points: LatLng[];
  height?: number | string;
  showStartEnd?: boolean;
  className?: string;
};

export function RouteMap({ points, height = 300, showStartEnd = true, className }: Props) {
  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const positions = useMemo<[number, number][]>(
    () => points.map((p) => [p.latitude, p.longitude]),
    [points],
  );

  const center = positions[Math.floor(positions.length / 2)] ?? [19.4326, -99.1332];
  const bounds = useMemo(
    () => (positions.length ? L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1]))) : null),
    [positions],
  );

  return (
    <div className={className} style={{ height, width: "100%", borderRadius: "1rem", overflow: "hidden" }}>
      <MapContainer
        center={center as [number, number]}
        zoom={14}
        bounds={bounds ?? undefined}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: "#14B8A6", weight: 4 }} />
        )}
        {showStartEnd && positions.length > 0 && (
          <>
            <Marker position={positions[0]} />
            {positions.length > 1 && <Marker position={positions[positions.length - 1]} />}
          </>
        )}
      </MapContainer>
    </div>
  );
}