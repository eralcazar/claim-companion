import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leafletSetup";

type LatLng = { latitude: number; longitude: number };

function Recenter({ point }: { point: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.latitude, point.longitude], map.getZoom() ?? 16, { animate: true });
  }, [point, map]);
  return null;
}

export function LiveRouteMap({ points, height = 320 }: { points: LatLng[]; height?: number | string }) {
  useEffect(() => {
    ensureLeafletIcons();
  }, []);

  const last = points[points.length - 1] ?? null;
  const center: [number, number] = last ? [last.latitude, last.longitude] : [19.4326, -99.1332];
  const positions = points.map((p) => [p.latitude, p.longitude]) as [number, number][];

  return (
    <div style={{ height, width: "100%", borderRadius: "1rem", overflow: "hidden" }}>
      <MapContainer center={center} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: "#14B8A6", weight: 5 }} />
        )}
        {last && <Marker position={[last.latitude, last.longitude]} />}
        <Recenter point={last} />
      </MapContainer>
    </div>
  );
}