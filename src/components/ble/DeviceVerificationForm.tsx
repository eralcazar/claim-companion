import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useCreateDeviceVerification,
  useDeleteDeviceVerification,
  useDeviceVerifications,
  type DeviceVerificationStatus,
} from "@/hooks/useDeviceVerifications";
import type { CompatibleDevice } from "@/lib/ble/compatibleDevices";

const STATUS_META: Record<
  DeviceVerificationStatus,
  { label: string; tone: string; icon: any }
> = {
  success: { label: "Funcionó", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  partial: { label: "Parcial", tone: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: AlertTriangle },
  failed: { label: "Falló", tone: "bg-rose-500/15 text-rose-700 border-rose-500/30", icon: XCircle },
};

export function DeviceVerificationForm({ device }: { device: CompatibleDevice }) {
  const [status, setStatus] = useState<DeviceVerificationStatus>("success");
  const [firmware, setFirmware] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [notes, setNotes] = useState("");

  const list = useDeviceVerifications(device.id);
  const create = useCreateDeviceVerification();
  const remove = useDeleteDeviceVerification();

  const submit = async () => {
    try {
      await create.mutateAsync({
        device_id: device.id,
        status,
        firmware: firmware.trim() || null,
        app_version: appVersion.trim() || null,
        connection_method: device.connectionMethod,
        notes: notes.trim() || null,
      });
      setFirmware("");
      setAppVersion("");
      setNotes("");
      toast({ title: "Verificación guardada" });
    } catch (e: any) {
      toast({ title: "No se pudo guardar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as DeviceVerificationStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="success">Funcionó bien</SelectItem>
              <SelectItem value="partial">Funcionó parcialmente</SelectItem>
              <SelectItem value="failed">No funcionó</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Firmware (si aplica)</Label>
          <Input value={firmware} onChange={(e) => setFirmware(e.target.value)} placeholder="p. ej. 1.2.3" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Versión de la app / navegador</Label>
          <Input value={appVersion} onChange={(e) => setAppVersion(e.target.value)} placeholder="p. ej. Chrome 131, iOS 17.4" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Notas</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="¿Qué pasó al conectar? ¿Qué mediciones importó?" />
        </div>
      </div>
      <Button onClick={submit} disabled={create.isPending} className="w-full sm:w-auto">
        {create.isPending ? "Guardando..." : "Guardar verificación"}
      </Button>

      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-sm font-medium">Mis verificaciones previas</p>
        {list.isLoading && <p className="text-xs text-muted-foreground">Cargando...</p>}
        {list.data && list.data.length === 0 && (
          <p className="text-xs text-muted-foreground">Aún no has registrado pruebas de este dispositivo.</p>
        )}
        <ul className="space-y-2">
          {list.data?.map((v) => {
            const meta = STATUS_META[v.status];
            const Icon = meta.icon;
            return (
              <li key={v.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                <Badge variant="outline" className={`gap-1 ${meta.tone}`}>
                  <Icon className="h-3 w-3" /> {meta.label}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.tested_at).toLocaleString()}
                    {v.firmware ? ` · fw ${v.firmware}` : ""}
                    {v.app_version ? ` · ${v.app_version}` : ""}
                  </p>
                  {v.notes && <p className="mt-1 whitespace-pre-wrap">{v.notes}</p>}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove.mutate({ id: v.id, device_id: device.id })}
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}