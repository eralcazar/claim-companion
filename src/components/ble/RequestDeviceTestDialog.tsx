import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FlaskConical } from "lucide-react";
import type { CompatibleDevice } from "@/lib/ble/compatibleDevices";
import { useCreateDeviceTestRequest } from "@/hooks/useDeviceTestRequests";

export function RequestDeviceTestDialog({
  device,
  open,
  onOpenChange,
}: {
  device: CompatibleDevice;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [region, setRegion] = useState("");
  const [firmware, setFirmware] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [note, setNote] = useState("");
  const create = useCreateDeviceTestRequest();

  const submit = async () => {
    if (note.length > 500) {
      toast.error("La nota no puede exceder 500 caracteres");
      return;
    }
    try {
      await create.mutateAsync({
        device_id: device.id,
        device_name: device.name,
        region: region.trim() || undefined,
        firmware: firmware.trim() || undefined,
        app_version: appVersion.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success("Solicitud enviada. El equipo revisará este dispositivo.");
      setRegion(""); setFirmware(""); setAppVersion(""); setNote("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No fue posible enviar la solicitud");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Solicitar prueba del dispositivo
          </DialogTitle>
          <DialogDescription>
            El equipo CareCentral evaluará <span className="font-medium">{device.name}</span> y publicará la evidencia cuando quede verificado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="dtr-region">Región / país</Label>
            <Input id="dtr-region" value={region} onChange={(e) => setRegion(e.target.value.slice(0, 60))} placeholder="p. ej. MX, US, EU" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dtr-fw">Firmware</Label>
              <Input id="dtr-fw" value={firmware} onChange={(e) => setFirmware(e.target.value.slice(0, 60))} placeholder="v1.2.3" />
            </div>
            <div>
              <Label htmlFor="dtr-app">Versión app</Label>
              <Input id="dtr-app" value={appVersion} onChange={(e) => setAppVersion(e.target.value.slice(0, 60))} placeholder="Mi Fitness 4.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="dtr-note">Nota (opcional)</Label>
            <Textarea
              id="dtr-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="¿Qué te interesa validar? (emparejamiento, lecturas, sync…)"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">{note.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Enviando…" : "Enviar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}