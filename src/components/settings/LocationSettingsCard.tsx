import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLocationPreference, type TrackingMode } from "@/hooks/useLocationPreference";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkGeoPermission, requestGeoPermission, permissionInstructions, type GeoPermissionState } from "@/lib/geo/permissions";
import { invalidateLocationPrefCache } from "@/lib/geo/attach";

const READING_TABLES = [
  "blood_pressure_readings",
  "heart_rate_readings",
  "spo2_readings",
  "temperature_readings",
  "glucose_readings",
  "activity_readings",
] as const;

export function LocationSettingsCard() {
  const { tagging, tracking, mode, update, loading } = useLocationPreference();
  const [clearing, setClearing] = useState(false);
  const [perm, setPerm] = useState<GeoPermissionState>("prompt");

  useEffect(() => {
    checkGeoPermission().then(setPerm);
  }, []);

  const askPermission = async () => {
    const r = await requestGeoPermission();
    setPerm(r);
    if (r === "granted") toast.success("Permiso de ubicación concedido.");
    else if (r === "denied") toast.error("Permiso denegado. Revisá los ajustes del navegador.");
  };

  const clearAll = async () => {
    if (!confirm("¿Borrar la ubicación de TODAS tus mediciones guardadas? Esta acción no se puede deshacer.")) return;
    setClearing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sin sesión");
      for (const t of READING_TABLES) {
        await (supabase.from(t) as any)
          .update({ latitude: null, longitude: null, location_accuracy_m: null, location_captured_at: null })
          .eq("user_id", uid);
      }
      toast.success("Se borraron todas las ubicaciones.");
    } catch (e: any) {
      toast.error(`No se pudo borrar: ${e.message ?? e}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Ubicación y GPS
        </CardTitle>
        <CardDescription>
          Controlá qué información de ubicación se guarda con tus mediciones y recorridos.
          Nada se captura sin tu consentimiento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(perm === "denied" || perm === "unavailable") && (
          <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/5 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Permiso de ubicación bloqueado</div>
              <p className="text-muted-foreground mt-1">{permissionInstructions(perm)}</p>
            </div>
          </div>
        )}
        {perm === "prompt" && (
          <div className="flex items-center justify-between gap-2 rounded-md border p-3 text-xs">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <div className="font-medium">Permiso de ubicación pendiente</div>
                <p className="text-muted-foreground">Concedelo una sola vez para grabar recorridos y etiquetar mediciones.</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={askPermission}>Solicitar</Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="tag-toggle">Etiquetar mediciones con ubicación</Label>
            <p className="text-xs text-muted-foreground">
              Al guardar una lectura manual o desde un dispositivo, se adjunta lat/lng aproximados.
            </p>
          </div>
          <Switch
            id="tag-toggle"
            checked={tagging}
            disabled={loading}
            onCheckedChange={(v) => { update({ tagging: v }); invalidateLocationPrefCache(); }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="track-toggle">Permitir recorridos GPS</Label>
            <p className="text-xs text-muted-foreground">
              Necesario para caminatas, carreras y ciclismo con ruta en el mapa.
            </p>
          </div>
          <Switch
            id="track-toggle"
            checked={tracking}
            disabled={loading}
            onCheckedChange={(v) => update({ tracking: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label>Modo de seguimiento GPS</Label>
            <p className="text-xs text-muted-foreground">
              Balanceá precisión y consumo de batería durante recorridos.
            </p>
          </div>
          <Select value={mode} onValueChange={(v) => update({ mode: v as TrackingMode })} disabled={loading}>
            <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">Equilibrado</SelectItem>
              <SelectItem value="high_accuracy">Alta precisión</SelectItem>
              <SelectItem value="battery_saver">Ahorro de batería</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-[11px] text-muted-foreground">
          En navegador web sólo se registra en primer plano. Para grabación en segundo plano se requiere la app instalada como nativa.
        </p>

        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" onClick={clearAll} disabled={clearing}>
            {clearing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Borrar ubicaciones de todas mis mediciones
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2">
            Los mapas se muestran con © OpenStreetMap contributors. No compartimos tu ubicación
            con terceros.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}