import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Loader2, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildGpx, downloadFile } from "@/lib/geo/gpx";
import JSZip from "jszip";

type RouteRow = {
  id: string;
  activity_type: string;
  started_at: string;
};

async function loadPoints(routeId: string) {
  const { data } = await (supabase.from("workout_route_points") as any)
    .select("latitude, longitude, altitude_m, captured_at, sequence")
    .eq("route_id", routeId)
    .order("sequence", { ascending: true });
  return (data as any[]) ?? [];
}

export function ExportSingleGpxButton({ route }: { route: RouteRow }) {
  const [loading, setLoading] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const pts = await loadPoints(route.id);
      if (pts.length < 2) {
        toast.info("Este recorrido no tiene puntos suficientes.");
        return;
      }
      const gpx = buildGpx(route, pts);
      const stamp = new Date(route.started_at).toISOString().slice(0, 10);
      downloadFile(`carecentral-${route.activity_type}-${stamp}.gpx`, gpx);
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo exportar");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" variant="ghost" onClick={handle} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      <span className="ml-1 text-xs">GPX</span>
    </Button>
  );
}

export function ExportRangeGpxButton() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sin sesión");
      const { data: routes, error } = await (supabase.from("workout_routes") as any)
        .select("id, activity_type, started_at")
        .eq("user_id", uid)
        .gte("started_at", `${from}T00:00:00`)
        .lte("started_at", `${to}T23:59:59`)
        .order("started_at", { ascending: true });
      if (error) throw error;
      const list = (routes as RouteRow[]) ?? [];
      if (list.length === 0) {
        toast.info("Sin recorridos en el rango seleccionado.");
        return;
      }
      const zip = new JSZip();
      for (const r of list) {
        const pts = await loadPoints(r.id);
        if (pts.length < 2) continue;
        const stamp = new Date(r.started_at).toISOString().slice(0, 19).replace(/[:T]/g, "-");
        zip.file(`${stamp}-${r.activity_type}.gpx`, buildGpx(r, pts));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadFile(`carecentral-recorridos-${from}_a_${to}.zip`, blob, "application/zip");
      toast.success(`Exportados ${list.length} recorridos.`);
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <FileArchive className="h-4 w-4 mr-1" /> Exportar rango GPX
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button onClick={run} disabled={loading} className="w-full" size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Descargar .zip
        </Button>
      </PopoverContent>
    </Popover>
  );
}