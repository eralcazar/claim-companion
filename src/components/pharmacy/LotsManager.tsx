import { useMemo, useState } from "react";
import { useCatalog } from "@/hooks/usePharmacy";
import { useActiveBranch } from "@/hooks/usePharmacyBranches";
import { useLots, useUpsertLot, useRotationAlerts, useCreateLotMovement, useLotMovements, type LotWithCatalog } from "@/hooks/usePharmacyLots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle, Package, ArrowUpDown, TrendingDown } from "lucide-react";
import { SucursalSelector } from "./SucursalSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function daysUntil(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - now.getTime()) / 86400000);
}

function estadoBadge(lot: LotWithCatalog) {
  const dias = daysUntil(lot.caducidad);
  if (lot.estado === "bloqueado") return <Badge variant="destructive">Bloqueado</Badge>;
  if (dias < 0) return <Badge variant="destructive">Vencido</Badge>;
  if (lot.cantidad_actual <= 0) return <Badge variant="secondary">Agotado</Badge>;
  if (dias < 30) return <Badge className="bg-red-500 hover:bg-red-600 text-white">Vence &lt;30d</Badge>;
  if (dias < 90) return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Vence &lt;90d</Badge>;
  if (dias < 180) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Vence &lt;180d</Badge>;
  return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">OK</Badge>;
}

export function LotsManager() {
  const { branchId } = useActiveBranch();
  const { data: lots = [], isLoading } = useLots({ branchId });
  const { data: catalog = [] } = useCatalog({ onlyActive: true });
  const { data: alerts = [] } = useRotationAlerts(branchId);
  const upsertLot = useUpsertLot();
  const createMov = useCreateLotMovement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [movDialog, setMovDialog] = useState<{ lot: LotWithCatalog; tipo: "salida" | "ajuste" | "merma" } | null>(null);
  const [form, setForm] = useState({
    catalog_id: "",
    lote: "",
    caducidad: "",
    cantidad_inicial: 0,
    costo_unitario_centavos: 0,
    ubicacion: "",
    notas: "",
  });
  const [movQty, setMovQty] = useState(1);
  const [movMotivo, setMovMotivo] = useState("");

  const alertasCriticas = useMemo(
    () => alerts.filter((a) => a.severidad === "critico" || a.severidad === "alto"),
    [alerts]
  );

  const openNew = () => {
    setForm({ catalog_id: "", lote: "", caducidad: "", cantidad_inicial: 0, costo_unitario_centavos: 0, ubicacion: "", notas: "" });
    setDialogOpen(true);
  };

  const saveLot = async () => {
    if (!branchId || !form.catalog_id || !form.lote || !form.caducidad || form.cantidad_inicial <= 0) return;
    await upsertLot.mutateAsync({
      catalog_id: form.catalog_id,
      branch_id: branchId,
      lote: form.lote.trim(),
      caducidad: form.caducidad,
      cantidad_inicial: form.cantidad_inicial,
      cantidad_actual: form.cantidad_inicial,
      costo_unitario_centavos: form.costo_unitario_centavos,
      ubicacion: form.ubicacion || null,
      notas: form.notas || null,
    });
    setDialogOpen(false);
  };

  const submitMov = async () => {
    if (!movDialog || !branchId || movQty <= 0) return;
    await createMov.mutateAsync({
      lot_id: movDialog.lot.id,
      catalog_id: movDialog.lot.catalog_id,
      branch_id: branchId,
      tipo: movDialog.tipo,
      cantidad: movQty,
      motivo: movMotivo || undefined,
    });
    setMovDialog(null);
    setMovQty(1);
    setMovMotivo("");
  };

  if (!branchId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecciona una sucursal para gestionar lotes.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Lotes y caducidades</h2>
          <SucursalSelector />
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo lote
        </Button>
      </div>

      {alertasCriticas.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" /> Rotación urgente ({alertasCriticas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {alertasCriticas.slice(0, 6).map((a) => (
                <div key={a.lot_id} className="flex justify-between border-b pb-1 last:border-0">
                  <span>{a.producto_nombre} · lote {a.lote}</span>
                  <span className="font-medium">{a.alerta} · {a.cantidad_actual} u</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="activos">
        <TabsList>
          <TabsTrigger value="activos">Activos</TabsTrigger>
          <TabsTrigger value="alertas">Alertas ({alerts.length})</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value="activos">
          <LotsList
            items={lots.filter((l) => l.estado === "activo" && l.cantidad_actual > 0)}
            onMov={(lot, tipo) => setMovDialog({ lot, tipo })}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="alertas">
          <LotsList
            items={lots.filter((l) => {
              const d = daysUntil(l.caducidad);
              return l.cantidad_actual > 0 && (d < 180 || l.estado === "vencido");
            })}
            onMov={(lot, tipo) => setMovDialog({ lot, tipo })}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="todos">
          <LotsList items={lots} onMov={(lot, tipo) => setMovDialog({ lot, tipo })} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Producto</Label>
              <Select value={form.catalog_id} onValueChange={(v) => setForm({ ...form, catalog_id: v })}>
                <SelectTrigger><SelectValue placeholder="Elige producto" /></SelectTrigger>
                <SelectContent>
                  {catalog.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre} {c.presentación ? `· ${c.presentación}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lote</Label>
                <Input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} placeholder="L-A12345" />
              </div>
              <div>
                <Label>Caducidad</Label>
                <Input type="date" value={form.caducidad} onChange={(e) => setForm({ ...form, caducidad: e.target.value })} />
              </div>
              <div>
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={form.cantidad_inicial} onChange={(e) => setForm({ ...form, cantidad_inicial: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <Label>Costo unitario (MXN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={(form.costo_unitario_centavos / 100).toFixed(2)}
                  onChange={(e) => setForm({ ...form, costo_unitario_centavos: Math.round(parseFloat(e.target.value || "0") * 100) })}
                />
              </div>
              <div className="col-span-2">
                <Label>Ubicación</Label>
                <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Anaquel A-3" />
              </div>
              <div className="col-span-2">
                <Label>Notas</Label>
                <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveLot} disabled={upsertLot.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!movDialog} onOpenChange={(o) => !o && setMovDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movDialog?.tipo === "salida" ? "Salida" : movDialog?.tipo === "merma" ? "Merma" : "Ajuste"} — {movDialog?.lot.catalog.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Lote {movDialog?.lot.lote} · disponible {movDialog?.lot.cantidad_actual}
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input type="number" min={1} value={movQty} onChange={(e) => setMovQty(parseInt(e.target.value || "0", 10))} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Venta mostrador / merma / conteo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovDialog(null)}>Cancelar</Button>
            <Button onClick={submitMov} disabled={createMov.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LotsList({
  items,
  onMov,
  isLoading,
}: {
  items: LotWithCatalog[];
  onMov: (lot: LotWithCatalog, tipo: "salida" | "ajuste" | "merma") => void;
  isLoading: boolean;
}) {
  if (isLoading) return <div className="text-sm text-muted-foreground py-6">Cargando lotes…</div>;
  if (items.length === 0) return <div className="text-sm text-muted-foreground py-6">Sin lotes.</div>;
  return (
    <div className="space-y-2">
      {items.map((l) => (
        <Card key={l.id}>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{l.catalog.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  Lote <span className="font-mono">{l.lote}</span> · Cad. {l.caducidad} · {l.cantidad_actual}/{l.cantidad_inicial} u · Costo ${(l.costo_unitario_centavos / 100).toFixed(2)}
                  {l.ubicacion ? ` · ${l.ubicacion}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {estadoBadge(l)}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => onMov(l, "salida")}>
                  <ArrowUpDown className="h-3 w-3" /> Salida
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => onMov(l, "merma")}>
                  <TrendingDown className="h-3 w-3" /> Merma
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}