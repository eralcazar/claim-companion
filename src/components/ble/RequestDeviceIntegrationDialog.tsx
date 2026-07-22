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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { useCreateDeviceTestRequest } from "@/hooks/useDeviceTestRequests";
import {
  DEVICE_TYPE_LABELS,
  READING_LABELS,
  type CompatibleReading,
  type DeviceType,
} from "@/lib/ble/compatibleDevices";

const DEVICE_TYPES: (DeviceType | "otro")[] = [
  "oximeter",
  "bp_monitor",
  "thermometer",
  "smartband",
  "smartwatch",
  "ring",
  "scale",
  "otro",
];

const READINGS: CompatibleReading[] = [
  "heart_rate",
  "spo2",
  "blood_pressure",
  "temperature",
  "activity",
  "sleep",
  "weight",
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function RequestDeviceIntegrationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType | "otro">("smartband");
  const [readings, setReadings] = useState<CompatibleReading[]>([]);
  const [region, setRegion] = useState("");
  const [vendorApp, setVendorApp] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const create = useCreateDeviceTestRequest();

  const toggleReading = (r: CompatibleReading) =>
    setReadings((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );

  const reset = () => {
    setBrand(""); setModel(""); setDeviceType("smartband"); setReadings([]);
    setRegion(""); setVendorApp(""); setUrl(""); setReason("");
  };

  const submit = async () => {
    if (!brand.trim() || !model.trim()) {
      toast.error("Marca y modelo son obligatorios");
      return;
    }
    if (reason.length > 500) {
      toast.error("El motivo no puede exceder 500 caracteres");
      return;
    }
    const device_name = `${brand.trim()} ${model.trim()}`;
    const device_id = `integration-request:${slugify(device_name)}`;
    const payload = {
      device_id,
      device_name,
      region: region.trim() || undefined,
      app_version: vendorApp.trim() || undefined,
      note: JSON.stringify({
        kind: "integration_request",
        deviceType,
        readings,
        url: url.trim() || null,
        reason: reason.trim() || null,
      }),
    };
    try {
      await create.mutateAsync(payload);
      toast.success("Solicitud de integración enviada. Te avisaremos cuando la evaluemos.");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No fue posible enviar la solicitud");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Solicitar integración de un modelo
          </DialogTitle>
          <DialogDescription>
            ¿Tu dispositivo no está en el catálogo? Cuéntanos los datos y el equipo CareCentral evaluará su integración.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rdi-brand">Marca *</Label>
              <Input id="rdi-brand" value={brand} onChange={(e) => setBrand(e.target.value.slice(0, 60))} placeholder="Omron, Xiaomi…" />
            </div>
            <div>
              <Label htmlFor="rdi-model">Modelo *</Label>
              <Input id="rdi-model" value={model} onChange={(e) => setModel(e.target.value.slice(0, 80))} placeholder="M7 Intelli IT" />
            </div>
          </div>

          <div>
            <Label>Tipo de dispositivo</Label>
            <Select value={deviceType} onValueChange={(v) => setDeviceType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEVICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "otro" ? "Otro" : DEVICE_TYPE_LABELS[t as DeviceType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Métricas de interés</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {READINGS.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={readings.includes(r)} onCheckedChange={() => toggleReading(r)} />
                  {READING_LABELS[r]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rdi-region">Región / país</Label>
              <Input id="rdi-region" value={region} onChange={(e) => setRegion(e.target.value.slice(0, 60))} placeholder="MX, US…" />
            </div>
            <div>
              <Label htmlFor="rdi-app">App del fabricante</Label>
              <Input id="rdi-app" value={vendorApp} onChange={(e) => setVendorApp(e.target.value.slice(0, 80))} placeholder="Mi Fitness, Omron connect…" />
            </div>
          </div>

          <div>
            <Label htmlFor="rdi-url">Enlace del producto</Label>
            <Input id="rdi-url" value={url} onChange={(e) => setUrl(e.target.value.slice(0, 300))} placeholder="https://…" />
          </div>

          <div>
            <Label htmlFor="rdi-reason">Motivo / caso de uso</Label>
            <Textarea
              id="rdi-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="¿Para qué te gustaría usarlo? ¿Cuántos pacientes lo tienen?"
            />
            <p className="text-xs text-muted-foreground mt-1">{reason.length}/500</p>
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