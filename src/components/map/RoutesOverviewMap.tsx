import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leafletSetup";
import { formatDistance, formatDuration, formatPace } from "@/lib/geo/haversine";

export type OverviewRoute = {
  id: string;
  activity_type: string;
  started_at: string;
  distance_m: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  start_lat?: number | null;
  start_lng?: number | null;
};

function ClusterLayer({ routes, onSelect }: { routes: OverviewRoute[]; onSelect?: (id: string) => void }) {
  const map = useMap();
  const groupRef = useRef<any>(null);

  useEffect(() => {
    const L2 = L as any;
    const cluster = L2.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      maxClusterRadius: 60,
    });
    for (const r of routes) {
      if (r.start_lat == null || r.start_lng == null) continue;
      const marker = L.marker([r.start_lat, r.start_lng]);
      marker.bindPopup(
        `<div style="font-family:inherit">
          <div style="font-weight:600;margin-bottom:2px">${r.activity_type}</div>
          <div style="font-size:11px;color:#64748b">${new Date(r.started_at).toLocaleString()}</div>
          <div style="font-size:12px;margin-top:4px">
            ${formatDistance(r.distance_m)} · ${formatDuration(r.duration_s)} · ${formatPace(r.avg_pace_s_per_km)}
          </div>
        </div>`,
      );
      marker.on("click", () => onSelect?.(r.id));
      cluster.addLayer(marker);
    }
    cluster.addTo(map);
    groupRef.current = cluster;
    try {
      const b = cluster.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [30, 30] });
    } catch { /* empty */ }
    return () => {
      if (groupRef.current) map.removeLayer(groupRef.current);
    };
  }, [routes, map, onSelect]);

  return null;
}

export function RoutesOverviewMap({
  routes,
  height = 380,
  onSelect,
}: {
  routes: OverviewRoute[];
  height?: number | string;
  onSelect?: (id: string) => void;
}) {
  useEffect(() => { ensureLeafletIcons(); }, []);
  const withPos = routes.filter((r) => r.start_lat != null && r.start_lng != null);
  const center: [number, number] = withPos.length
    ? [withPos[0].start_lat as number, withPos[0].start_lng as number]
    : [19.4326, -99.1332];

  return (
    <div style={{ height, width: "100%", borderRadius: "1rem", overflow: "hidden" }}>
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        <ClusterLayer routes={withPos} onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}