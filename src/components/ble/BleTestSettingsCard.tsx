import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_BLE_SETTINGS, useBleTestSettings } from "@/hooks/useBleTestSettings";

export function BleTestSettingsCard() {
  const { settings, isLoading, save } = useBleTestSettings();
  const [form, setForm] = useState(DEFAULT_BLE_SETTINGS);

  useEffect(() => { setForm(settings); }, [settings.scan_timeout_ms, settings.read_timeout_ms, settings.max_retries, settings.retry_delay_ms]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: Math.max(0, Number(e.target.value) || 0) }));

  const onSave = () => {
    save.mutate(form, {
      onSuccess: () => toast.success("Ajustes BLE guardados"),
      onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-5 w-5 text-primary" /> Ajustes de pruebas BLE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Personaliza los tiempos de espera y reintentos usados por la prueba de conexión y el asistente de emparejamiento.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Timeout escaneo (ms)</Label>
            <Input type="number" min={1000} step={500} value={form.scan_timeout_ms} onChange={set("scan_timeout_ms")} />
          </div>
          <div>
            <Label>Timeout lectura (ms)</Label>
            <Input type="number" min={1000} step={500} value={form.read_timeout_ms} onChange={set("read_timeout_ms")} />
          </div>
          <div>
            <Label>Reintentos máx.</Label>
            <Input type="number" min={1} max={10} value={form.max_retries} onChange={set("max_retries")} />
          </div>
          <div>
            <Label>Delay entre reintentos (ms)</Label>
            <Input type="number" min={0} step={250} value={form.retry_delay_ms} onChange={set("retry_delay_ms")} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={save.isPending || isLoading} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}