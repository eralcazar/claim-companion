import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle2, XCircle, AlertTriangle, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { COMPATIBLE_DEVICES, type CompatibleDevice } from "@/lib/ble/compatibleDevices";
import {
  useMyDeviceVerifications,
  useCreateDeviceVerification,
  useDeleteDeviceVerification,
  type DeviceVerification,
  type DeviceVerificationStatus,
} from "@/hooks/useDeviceVerifications";

const REGIONS = ["México", "EE.UU.", "Canadá", "España", "LATAM", "UE", "Asia", "Otro"];
const METHODS: Array<{ v: string; l: string }> = [
  { v: "ble_direct", l: "BLE directo (navegador)" },
  { v: "vendor_app_bridge", l: "App del fabricante" },
  { v: "health_connect", l: "Google Health Connect" },
  { v: "healthkit", l: "Apple HealthKit" },
  { v: "manual", l: "Registro manual" },
];

const BP_DEVICES = COMPATIBLE_DEVICES.filter((d) => d.deviceType === "bp_monitor");

function latestFor(list: DeviceVerification[], deviceId: string) {
  return list.find((v) => v.device_id === deviceId) ?? null;
}

function CompatibilityBadge({ v }: { v: DeviceVerification | null }) {
  if (!v) return <Badge variant="outline" className="text-xs">Sin probar</Badge>;
  if (v.marked_compatible === true) return <Badge className="bg-emerald-600 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Compatible</Badge>;
  if (v.marked_compatible === false) return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />No compatible</Badge>;
  if (v.status === "success") return <Badge className="bg-emerald-600 text-xs">Éxito</Badge>;
  if (v.status === "partial") return <Badge className="bg-amber-500 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Parcial</Badge>;
  return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Falló</Badge>;
}

export default function TensiometrosCompatibilidad() {
  const { data: mine = [], isLoading } = useMyDeviceVerifications();
  const createVer = useCreateDeviceVerification();
  const delVer = useDeleteDeviceVerification();

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<CompatibleDevice | null>(null);

  const [form, setForm] = useState({
    region: "México",
    model_label: "",
    firmware: "",
    app_version: "",
    connection_method: "ble_direct",
    status: "success" as DeviceVerificationStatus,
    marked_compatible: true as boolean,
    notes: "",
  });

  const bpList = useMemo(() => {
    const term = q.trim().toLowerCase();
    return BP_DEVICES.filter((d) =>
      !term ||
      d.name.toLowerCase().includes(term) ||
      d.brand.toLowerCase().includes(term)
    );
  }, [q]);

  function openFor(device: CompatibleDevice) {
    setTarget(device);
    setForm({
      region: "México",
      model_label: device.name,
      firmware: "",
      app_version: "",
      connection_method: device.connectionMethod === "not_compatible" ? "manual" : device.connectionMethod,
      status: "success",
      marked_compatible: true,
      notes: "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!target) return;
    try {
      await createVer.mutateAsync({
        device_id: target.id,
        status: form.status,
        firmware: form.firmware || null,
        app_version: form.app_version || null,
        connection_method: form.connection_method,
        notes: form.notes || null,
        region: form.region || null,
        model_label: form.model_label || null,
        marked_compatible: form.marked_compatible,
      });
      toast.success("Prueba registrada");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    }
  }

  const totalTested = new Set(mine.filter((v) => BP_DEVICES.some((d) => d.id === v.device_id)).map((v) => v.device_id)).size;
  const totalCompat = BP_DEVICES.filter((d) => latestFor(mine, d.id)?.marked_compatible === true).length;

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Compatibilidad de tensiómetros
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra pruebas reales por modelo, región y versión, y marca cada tensiómetro como compatible o no.
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="rounded-lg border px-3 py-2">
            <div className="text-muted-foreground">Probados</div>
            <div className="text-lg font-bold">{totalTested} / {BP_DEVICES.length}</div>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <div className="text-muted-foreground">Compatibles</div>
            <div className="text-lg font-bold text-emerald-600">{totalCompat}</div>
          </div>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar marca o modelo…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {bpList.map((d) => {
          const last = latestFor(mine, d.id);
          const history = mine.filter((v) => v.device_id === d.id);
          return (
            <Card key={d.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-start justify-between gap-2">
                  <span className="font-medium leading-tight">{d.brand} · {d.name}</span>
                  <CompatibilityBadge v={last} />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 flex-1 flex flex-col">
                <p className="text-muted-foreground line-clamp-2">{d.notes}</p>
                {last && (
                  <div className="rounded-md bg-muted/40 p-2 space-y-0.5">
                    <div><b>Última prueba:</b> {new Date(last.tested_at).toLocaleDateString("es-MX")}</div>
                    {last.region && <div>Región: {last.region}</div>}
                    {(last.firmware || last.app_version) && (
                      <div>Ver.: {[last.firmware, last.app_version].filter(Boolean).join(" · ")}</div>
                    )}
                    {last.notes && <div className="text-muted-foreground">"{last.notes}"</div>}
                  </div>
                )}
                {history.length > 1 && (
                  <details className="text-[11px]">
                    <summary className="cursor-pointer text-primary">Historial ({history.length})</summary>
                    <ul className="mt-1 space-y-1">
                      {history.map((h) => (
                        <li key={h.id} className="flex items-center justify-between gap-2 border-t pt-1">
                          <span>
                            {new Date(h.tested_at).toLocaleDateString("es-MX")} · {h.status}
                            {h.region ? ` · ${h.region}` : ""}
                          </span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => delVer.mutate({ id: h.id, device_id: d.id })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="pt-1 mt-auto">
                  <Button size="sm" className="w-full" onClick={() => openFor(d)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Registrar prueba
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && bpList.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground py-8 text-center">Sin resultados.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar prueba · {target?.brand} {target?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Modelo (etiqueta exacta en la caja)</Label>
              <Input value={form.model_label} onChange={(e) => setForm({ ...form, model_label: e.target.value })} placeholder="p. ej. HEM-7156T-LA" />
            </div>
            <div>
              <Label>Región / mercado</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de conexión</Label>
              <Select value={form.connection_method} onValueChange={(v) => setForm({ ...form, connection_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Firmware del equipo</Label>
              <Input value={form.firmware} onChange={(e) => setForm({ ...form, firmware: e.target.value })} placeholder="v1.0.3" />
            </div>
            <div>
              <Label>Versión de app / navegador</Label>
              <Input value={form.app_version} onChange={(e) => setForm({ ...form, app_version: e.target.value })} placeholder="Chrome 129" />
            </div>
            <div>
              <Label>Resultado de la prueba</Label>
              <Select value={form.status} onValueChange={(v: DeviceVerificationStatus) => setForm({ ...form, status: v, marked_compatible: v !== "failed" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Éxito completo</SelectItem>
                  <SelectItem value="partial">Parcial (con detalles)</SelectItem>
                  <SelectItem value="failed">Falló</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marcar como</Label>
              <Select value={form.marked_compatible ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, marked_compatible: v === "yes" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">✅ Compatible</SelectItem>
                  <SelectItem value="no">❌ No compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observaciones</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Qué funcionó, qué no, pasos usados…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={createVer.isPending}>Guardar prueba</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}