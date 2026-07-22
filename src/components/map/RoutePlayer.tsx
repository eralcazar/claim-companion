import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw } from "lucide-react";
import { ensureLeafletIcons, OSM_ATTRIBUTION, OSM_TILE_URL } from "./leafletSetup";
import { haversineMeters, formatDistance, formatDuration } from "@/lib/geo/haversine";

export type PlayerPoint = {
  latitude: number;
  longitude: number;
  captured_at?: string | null;
  speed_mps?: number | null;
  sequence?: number;
};

type Props = { points: PlayerPoint[]; height?: number | string };

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1]))), { padding: [20, 20] });
    }
  }, [positions, map]);
  return null;
}

export function RoutePlayer({ points, height = 320 }: Props) {
  useEffect(() => { ensureLeafletIcons(); }, []);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(4);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const positions = useMemo<[number, number][]>(
    () => points.map((p) => [p.latitude, p.longitude]),
    [points],
  );

  // Cumulative time offset (seconds) per point, based on captured_at.
  const timeline = useMemo(() => {
    if (points.length === 0) return [] as number[];
    const t0 = points[0].captured_at ? new Date(points[0].captured_at).getTime() : 0;
    return points.map((p) =>
      p.captured_at ? (new Date(p.captured_at).getTime() - t0) / 1000 : 0,
    );
  }, [points]);

  // Cumulative distance up to each point.
  const distances = useMemo(() => {
    const arr: number[] = new Array(points.length).fill(0);
    for (let i = 1; i < points.length; i++) arr[i] = arr[i - 1] + haversineMeters(points[i - 1], points[i]);
    return arr;
  }, [points]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTickRef.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000; // real seconds
      lastTickRef.current = now;
      const advance = dt * speed; // in "route seconds"
      setIdx((cur) => {
        if (cur >= points.length - 1) {
          setPlaying(false);
          return cur;
        }
        let next = cur;
        const target = (timeline[cur] || 0) + advance;
        while (next < points.length - 1 && (timeline[next + 1] || 0) <= target) next++;
        // If no timestamps: advance one point per (0.2s / speed)
        if (timeline[timeline.length - 1] === 0 && next === cur) {
          if (dt * speed > 0.2) next = Math.min(cur + 1, points.length - 1);
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, points.length, timeline]);

  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Recorrido sin puntos suficientes para reproducir.</p>;
  }

  const cur = points[idx];
  const elapsedS = timeline[idx] ?? 0;
  const distM = distances[idx] ?? 0;
  const speedKmh = cur.speed_mps != null ? cur.speed_mps * 3.6 : null;
  const paceSecPerKm = distM > 0 && elapsedS > 0 ? elapsedS / (distM / 1000) : null;

  return (
    <div className="space-y-3">
      <div style={{ height, width: "100%", borderRadius: "1rem", overflow: "hidden" }}>
        <MapContainer
          center={positions[0]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          <FitBounds positions={positions} />
          <Polyline positions={positions} pathOptions={{ color: "#94a3b8", weight: 3, opacity: 0.5 }} />
          <Polyline
            positions={positions.slice(0, idx + 1)}
            pathOptions={{ color: "#14B8A6", weight: 5 }}
          />
          <Marker position={[cur.latitude, cur.longitude]} />
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2 rounded bg-muted">
          <div className="text-muted-foreground">Tiempo</div>
          <div className="font-bold">{formatDuration(elapsedS)}</div>
        </div>
        <div className="p-2 rounded bg-muted">
          <div className="text-muted-foreground">Distancia</div>
          <div className="font-bold">{formatDistance(distM)}</div>
        </div>
        <div className="p-2 rounded bg-muted">
          <div className="text-muted-foreground">Velocidad</div>
          <div className="font-bold">{speedKmh != null ? `${speedKmh.toFixed(1)} km/h` : "—"}</div>
        </div>
        <div className="p-2 rounded bg-muted">
          <div className="text-muted-foreground">Ritmo</div>
          <div className="font-bold">
            {paceSecPerKm ? `${Math.floor(paceSecPerKm / 60)}:${String(Math.round(paceSecPerKm % 60)).padStart(2, "0")}/km` : "—"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={playing ? "secondary" : "default"} onClick={() => setPlaying((v) => !v)}>
          {playing ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {playing ? "Pausa" : "Reproducir"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setPlaying(false); setIdx(0); }}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reiniciar
        </Button>
        <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
          <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 4, 10, 25].map((s) => (
              <SelectItem key={s} value={String(s)}>{s}x</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1 min-w-40">
          <Slider
            value={[idx]}
            min={0}
            max={points.length - 1}
            step={1}
            onValueChange={([v]) => { setPlaying(false); setIdx(v); }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-16 text-right">
          {idx + 1}/{points.length}
        </span>
      </div>
    </div>
  );
}