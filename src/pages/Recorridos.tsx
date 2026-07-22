import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, MapPin, Footprints, Bike, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LiveRouteMap } from "@/components/map/LiveRouteMap";
import { RouteMap } from "@/components/map/RouteMap";
import { useLiveTracking } from "@/hooks/useLiveTracking";
import { useLocationPreference } from "@/hooks/useLocationPreference";
import { formatDistance, formatDuration, formatPace } from "@/lib/geo/haversine";
import { supabase } from "@/integrations/supabase/client";

type SavedRoute = {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  points?: { latitude: number; longitude: number; sequence: number }[];
};

const ACTIVITIES = [
  { value: "walking", label: "Caminata", Icon: Footprints },
  { value: "running", label: "Correr", Icon: Footprints },
  { value: "cycling", label: "Ciclismo", Icon: Bike },
];

export default function Recorridos() {
  const { state, start, pause, resume, stop, reset } = useLiveTracking();
  const { tracking, tagging, update, loading } = useLocationPreference();
  const [activity, setActivity] = useState("walking");
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [selected, setSelected] = useState<SavedRoute | null>(null);

  useEffect(() => {
    document.title = "Recorridos GPS · CareCentral";
  }, []);

  const loadRoutes = async () => {
    const { data } = await (supabase.from("workout_routes") as any)
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    setRoutes((data as SavedRoute[]) ?? []);
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutePoints = async (route: SavedRoute) => {
    const { data } = await (supabase.from("workout_route_points") as any)
      .select("latitude, longitude, sequence")
      .eq("route_id", route.id)
      .order("sequence", { ascending: true });
    setSelected({ ...route, points: (data as any) ?? [] });
  };

  const handleStart = async () => {
    if (!tracking) {
      toast.error("Activá primero el permiso de recorridos GPS en Ajustes de ubicación.");
      return;
    }
    await start();
  };

  const handleStop = async () => {
    stop();
    if (state.points.length < 2) {
      toast.info("Recorrido muy corto, no se guardó.");
      reset();
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sin sesión");
      const durationS = state.durationS || 1;
      const distanceKm = state.distanceM / 1000;
      const pace = distanceKm > 0 ? durationS / distanceKm : null;

      const { data: route, error } = await (supabase.from("workout_routes") as any)
        .insert({
          user_id: uid,
          activity_type: activity,
          started_at: new Date(state.startedAt ?? Date.now()).toISOString(),
          ended_at: new Date().toISOString(),
          distance_m: Math.round(state.distanceM),
          duration_s: state.durationS,
          avg_pace_s_per_km: pace,
          elevation_gain_m: state.elevationGainM,
        })
        .select()
        .single();
      if (error) throw error;

      const points = state.points.map((p, i) => ({
        route_id: route.id,
        sequence: i,
        captured_at: p.captured_at,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude_m: p.altitude_m,
        speed_mps: p.speed_mps,
        accuracy_m: p.accuracy_m,
        heading_deg: p.heading_deg,
      }));
      // insert in chunks of 500
      for (let i = 0; i < points.length; i += 500) {
        await (supabase.from("workout_route_points") as any).insert(points.slice(i, i + 500));
      }
      toast.success("Recorrido guardado.");
      reset();
      await loadRoutes();
    } catch (e: any) {
      toast.error(`No se pudo guardar: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const pace = state.distanceM > 0 && state.durationS > 0
    ? state.durationS / (state.distanceM / 1000)
    : null;

  return (
    <div className="container mx-auto max-w-5xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Recorridos GPS</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Registrá caminatas, carreras y rutas de ciclismo sobre OpenStreetMap. Tu ubicación
        sólo se captura mientras un recorrido está activo.
      </p>

      {!loading && !tracking && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-4 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-medium">Permiso de recorridos GPS desactivado</div>
              <p className="text-xs text-muted-foreground">
                Activá el switch para permitir el uso del GPS mientras entrenás.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="tracking-toggle" className="text-xs">Permitir</Label>
              <Switch
                id="tracking-toggle"
                checked={tracking}
                onCheckedChange={(v) => update({ tracking: v })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sesión en vivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Actividad</Label>
            <Select value={activity} onValueChange={setActivity} disabled={state.isTracking}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITIES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.isTracking && (
              <Badge variant={state.isPaused ? "secondary" : "default"} className="ml-auto">
                {state.isPaused ? "Pausado" : "En vivo"}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Distancia</div>
              <div className="text-xl font-bold">{formatDistance(state.distanceM)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Duración</div>
              <div className="text-xl font-bold">{formatDuration(state.durationS)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Ritmo</div>
              <div className="text-xl font-bold">{formatPace(pace)}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">Elevación</div>
              <div className="text-xl font-bold">{Math.round(state.elevationGainM)} m</div>
            </div>
          </div>

          <LiveRouteMap points={state.points} height={320} />

          <div className="flex flex-wrap gap-2">
            {!state.isTracking ? (
              <Button onClick={handleStart} disabled={saving}>
                <Play className="h-4 w-4 mr-2" /> Iniciar recorrido
              </Button>
            ) : (
              <>
                {state.isPaused ? (
                  <Button variant="secondary" onClick={resume}>
                    <Play className="h-4 w-4 mr-2" /> Reanudar
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={pause}>
                    <Pause className="h-4 w-4 mr-2" /> Pausar
                  </Button>
                )}
                <Button variant="destructive" onClick={handleStop} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
                  Terminar y guardar
                </Button>
              </>
            )}
            {state.points.length === 0 && state.isTracking && (
              <span className="text-xs text-muted-foreground self-center">
                Esperando primera lectura del GPS…
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis recorridos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {routes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no tenés recorridos guardados.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {routes.map((r) => {
                const info = ACTIVITIES.find((a) => a.value === r.activity_type) ?? ACTIVITIES[0];
                const Icon = info.Icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => loadRoutePoints(r)}
                    className="text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{info.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.started_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                      <span>{formatDistance(r.distance_m)}</span>
                      <span>{formatDuration(r.duration_s)}</span>
                      <span>{formatPace(r.avg_pace_s_per_km)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selected && selected.points && selected.points.length > 1 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Vista del recorrido</div>
              <RouteMap points={selected.points} height={280} />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        Mapas © OpenStreetMap contributors · Uso conforme a la Tile Usage Policy de OSM.
      </p>
    </div>
  );
}