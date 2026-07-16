import { useState } from "react";
import { useAdminBleKnownDevices, type BleKnownDevice } from "@/hooks/useBleDevices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const SERVICES = [
  { label: "Presión (0x1810)", value: "00001810-0000-1000-8000-00805f9b34fb" },
  { label: "Oximetría (0x1822)", value: "00001822-0000-1000-8000-00805f9b34fb" },
  { label: "Termómetro (0x1809)", value: "00001809-0000-1000-8000-00805f9b34fb" },
  { label: "Glucosa (0x1808)", value: "00001808-0000-1000-8000-00805f9b34fb" },
  { label: "Frecuencia cardíaca (0x180D)", value: "0000180d-0000-1000-8000-00805f9b34fb" },
];

export default function BleDevicesManager() {
  const { list, upsert, remove } = useAdminBleKnownDevices();
  const [draft, setDraft] = useState<Partial<BleKnownDevice>>({
    name_pattern: "",
    brand: "",
    model: "",
    vendor: "",
    service_uuid: SERVICES[0].value,
    verified: true,
    blocked: false,
  });

  const handleSave = async () => {
    if (!draft.name_pattern || !draft.service_uuid) {
      toast.error("Patrón de nombre y servicio son obligatorios");
      return;
    }
    try {
      await upsert.mutateAsync(draft);
      toast.success("Guardado");
      setDraft({ name_pattern: "", brand: "", model: "", vendor: "", service_uuid: SERVICES[0].value, verified: true, blocked: false });
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Whitelist de dispositivos BLE</h1>
        <p className="text-sm text-muted-foreground">Marca, modelo y estado de verificación / bloqueo para dispositivos Bluetooth clínicos.</p>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Nuevo dispositivo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Marca</Label><Input value={draft.brand ?? ""} onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))} placeholder="Omron" /></div>
          <div><Label>Modelo</Label><Input value={draft.model ?? ""} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))} placeholder="M7 Intelli IT" /></div>
          <div><Label>Vendor (opcional)</Label><Input value={draft.vendor ?? ""} onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value }))} /></div>
          <div><Label>Patrón de nombre BLE (soporta % como comodín)</Label><Input value={draft.name_pattern ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name_pattern: e.target.value }))} placeholder="BLEsmart_%" /></div>
          <div>
            <Label>Servicio GATT</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.service_uuid} onChange={(e) => setDraft((d) => ({ ...d, service_uuid: e.target.value }))}>
              {SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-6 pt-6">
            <div className="flex items-center gap-2"><Switch checked={!!draft.verified} onCheckedChange={(v) => setDraft((d) => ({ ...d, verified: v }))} /><Label>Verificado</Label></div>
            <div className="flex items-center gap-2"><Switch checked={!!draft.blocked} onCheckedChange={(v) => setDraft((d) => ({ ...d, blocked: v }))} /><Label>Bloqueado</Label></div>
          </div>
          <div className="md:col-span-2"><Button onClick={handleSave} disabled={upsert.isPending}>Guardar</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Dispositivos registrados</CardTitle></CardHeader>
        <CardContent>
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (list.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin dispositivos configurados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Patrón</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data!.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.brand ?? d.vendor ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{d.model ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{d.name_pattern}</TableCell>
                    <TableCell className="text-xs font-mono">{d.service_uuid.slice(4, 8)}</TableCell>
                    <TableCell className="space-x-1">
                      {d.verified ? <Badge className="bg-success text-success-foreground gap-1"><ShieldCheck className="h-3 w-3" />Verificado</Badge> : <Badge variant="outline">Sin verificar</Badge>}
                      {d.blocked && <Badge variant="destructive" className="gap-1"><ShieldOff className="h-3 w-3" />Bloqueado</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}