import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLocationPreference } from "@/hooks/useLocationPreference";

const READING_TABLES = [
  "blood_pressure_readings",
  "heart_rate_readings",
  "spo2_readings",
  "temperature_readings",
  "glucose_readings",
  "activity_readings",
] as const;

export function LocationSettingsCard() {
  const { tagging, tracking, update, loading } = useLocationPreference();
  const [clearing, setClearing] = useState(false);

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
            onCheckedChange={(v) => update({ tagging: v })}
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