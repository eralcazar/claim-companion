import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { BellRing, Save } from "lucide-react";
import { toast } from "sonner";
import { useHrAlertSettings, useUpsertHrAlertSettings } from "@/hooks/useHrAlerts";

export function HrAlertSettingsCard() {
  const { data, isLoading } = useHrAlertSettings();
  const upsert = useUpsertHrAlertSettings();
  const [min, setMin] = useState(55);
  const [max, setMax] = useState(110);
  const [enabled, setEnabled] = useState(true);
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    if (!data) return;
    setMin(data.min_bpm);
    setMax(data.max_bpm);
    setEnabled(data.enabled);
    setNotify(data.notify_in_app);
  }, [data]);

  const submit = async () => {
    if (min < 20 || max > 260 || min >= max) {
      toast.error("Rango inválido (20-260 y mínimo < máximo).");
      return;
    }
    try {
      await upsert.mutateAsync({
        min_bpm: min,
        max_bpm: max,
        enabled,
        notify_in_app: notify,
      });
      toast.success("Alertas actualizadas");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          Alertas de frecuencia cardiaca
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="hr-min" className="text-xs">Mínimo (lpm)</Label>
            <Input
              id="hr-min"
              type="number"
              inputMode="numeric"
              min={20}
              max={200}
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hr-max" className="text-xs">Máximo (lpm)</Label>
            <Input
              id="hr-max"
              type="number"
              inputMode="numeric"
              min={40}
              max={260}
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="hr-enabled" className="text-sm">Alertas activas</Label>
          <Switch id="hr-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="hr-notify" className="text-sm">Notificación en la app</Label>
          <Switch id="hr-notify" checked={notify} onCheckedChange={setNotify} />
        </div>
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={submit}
          disabled={upsert.isPending || isLoading}
        >
          <Save className="h-4 w-4" /> Guardar
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Se creará una notificación cuando una lectura salga de este rango.
          Estándar clínico general: 60–100 lpm en reposo.
        </p>
      </CardContent>
    </Card>
  );
}