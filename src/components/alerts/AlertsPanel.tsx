import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Plus, BellOff, BellRing } from "lucide-react";
import { useMedicalAlerts, useCreateAlert, useToggleAlert } from "@/hooks/useMedicalAlerts";
import { useAuth } from "@/contexts/AuthContext";

interface Props { patientId: string }

const SEV_VARIANT: Record<string, any> = { info: "secondary", warning: "default", critical: "destructive" };
const SEV_LABEL: Record<string, string> = { info: "Informativa", warning: "Advertencia", critical: "Crítica" };
const TIPOS = ["presion","oxigenacion","temperatura","glucosa","estudio","medicamento","otro"];

export function AlertsPanel({ patientId }: Props) {
  const { user } = useAuth();
  const [showInactive, setShowInactive] = useState(false);
  const { data = [], isLoading } = useMedicalAlerts(patientId, !showInactive);
  const create = useCreateAlert();
  const toggle = useToggleAlert();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ tipo: "otro", severidad: "warning", titulo: "", mensaje: "" });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.titulo?.trim()) return;
    await create.mutateAsync({ ...form, patient_id: patientId });
    setForm({ tipo: "otro", severidad: "warning", titulo: "", mensaje: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Alertas médicas</h2>
          <p className="text-xs text-muted-foreground">Visibles para todos los profesionales con acceso al paciente.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs"><Switch checked={showInactive} onCheckedChange={setShowInactive} /> Ver inactivas</div>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nueva alerta</Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Sin alertas {showInactive ? "" : "activas"}.</p>
      ) : (
        <div className="space-y-2">
          {data.map((a) => {
            const canToggle = a.created_by === user?.id;
            return (
              <Card key={a.id} className={a.severidad === "critical" ? "border-destructive" : ""}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={SEV_VARIANT[a.severidad]}>{SEV_LABEL[a.severidad]}</Badge>
                      <Badge variant="outline">{a.tipo}</Badge>
                      {!a.activa && <Badge variant="secondary">Inactiva</Badge>}
                      <span className="font-semibold">{a.titulo}</span>
                    </div>
                    {a.mensaje && <p className="text-sm mt-1 whitespace-pre-wrap">{a.mensaje}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("es-MX")}</p>
                  </div>
                  {canToggle && (
                    <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: a.id, activa: !a.activa })}>
                      {a.activa ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva alerta médica</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severidad</Label>
                <Select value={form.severidad} onValueChange={(v) => set("severidad", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informativa</SelectItem>
                    <SelectItem value="warning">Advertencia</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ej: Hipertensión descontrolada" /></div>
            <div><Label>Mensaje / detalles</Label><Textarea rows={3} value={form.mensaje} onChange={(e) => set("mensaje", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={create.isPending || !form.titulo?.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}