import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Save } from "lucide-react";
import {
  DEFAULT_PREFS,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from "@/hooks/useNotificationPreferences";
import { toast } from "sonner";

export default function NotificationPreferencesPage() {
  const { data, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  const set = <K extends keyof NotificationPreferences>(k: K, v: NotificationPreferences[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  const save = async () => {
    await update.mutateAsync(prefs);
    toast.success("Preferencias guardadas");
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Preferencias de notificaciones</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Elige qué avisos recibir y en qué horario. Aplica a los avisos in-app y a
        las notificaciones del navegador cuando la app está en segundo plano.
      </p>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Categorías</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <PrefRow label="Lecturas validadas" description="Cuando el médico valida una lectura BLE pendiente." checked={prefs.pending_validated} onChange={(v) => set("pending_validated", v)} />
              <PrefRow label="Alertas clínicas" description="Nuevas alertas médicas registradas en tu expediente." checked={prefs.clinical_alerts} onChange={(v) => set("clinical_alerts", v)} />
              <PrefRow label="Recordatorios" description="Recordatorios de citas y medicamentos." checked={prefs.reminders} onChange={(v) => set("reminders", v)} />
              <PrefRow label="Mensajes del sistema" description="Novedades y mensajes generales de CareCentral." checked={prefs.system_messages} onChange={(v) => set("system_messages", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Horario de silencio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <PrefRow label="Activar horario de silencio" description="No mostrar notificaciones del sistema en este rango." checked={prefs.quiet_hours_enabled} onChange={(v) => set("quiet_hours_enabled", v)} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Desde</Label>
                  <Input type="time" value={prefs.quiet_hours_start ?? ""} onChange={(e) => set("quiet_hours_start", e.target.value)} disabled={!prefs.quiet_hours_enabled} />
                </div>
                <div>
                  <Label>Hasta</Label>
                  <Input type="time" value={prefs.quiet_hours_end ?? ""} onChange={(e) => set("quiet_hours_end", e.target.value)} disabled={!prefs.quiet_hours_enabled} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} disabled={update.isPending} className="gap-2">
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function PrefRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}