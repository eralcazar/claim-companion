import { useState, useMemo } from "react";
import { useCatalog, useUpsertCatalog, useDeleteCatalog, type CatalogItem } from "@/hooks/usePharmacy";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search, RefreshCw, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export default function ProductManager() {
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CatalogItem> | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const { data: items = [], isLoading } = useCatalog({ q });
  const upsert = useUpsertCatalog();
  const del = useDeleteCatalog();
  const qc = useQueryClient();

  const filtered = useMemo(
    () => (onlyActive ? items.filter((i) => i.activo) : items),
    [items, onlyActive],
  );

  const startNew = () => {
    setEditing({ nombre: "", presentacion: "", precio_centavos: 0, moneda: "mxn", activo: true });
    setOpen(true);
  };
  const startEdit = (it: CatalogItem) => {
    setEditing(it);
    setOpen(true);
  };
  const save = async () => {
    if (!editing) return;
    if (!editing.nombre || !editing.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!editing.precio_centavos || editing.precio_centavos <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }
    try {
      await upsert.mutateAsync(editing);
      setOpen(false);
      setEditing(null);
    } catch {
      // toast handled in hook
    }
  };

  const sync = async (id: string) => {
    setSyncingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("sync-catalog-product", {
        body: { catalog_id: id, environment: getStripeEnvironment() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Sincronizado con cobros");
      qc.invalidateQueries({ queryKey: ["pharmacy_catalog"] });
    } catch (e: any) {
      const ctx = e?.context;
      let msg = e?.message ?? "No se pudo sincronizar";
      try {
        if (ctx && typeof ctx.text === "function") {
          const body = await ctx.text();
          const parsed = JSON.parse(body);
          if (parsed?.error) msg = parsed.error;
        }
      } catch { /* ignore */ }
      toast.error(msg);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Package className="h-6 w-6 text-primary" />Productos de la tienda
      </h1>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={onlyActive} onCheckedChange={setOnlyActive} id="only-active" />
          <Label htmlFor="only-active">Solo activos</Label>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cobros</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <p className="font-medium">{it.nombre}</p>
                      {it.presentacion && <p className="text-xs text-muted-foreground">{it.presentacion}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{it.sku || "—"}</TableCell>
                    <TableCell>{it.categoria || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">${(it.precio_centavos / 100).toFixed(2)} {it.moneda?.toUpperCase()}</TableCell>
                    <TableCell>
                      <Badge variant={it.activo ? "default" : "secondary"}>{it.activo ? "Activo" : "Inactivo"}</Badge>
                    </TableCell>
                    <TableCell>
                      {it.stripe_product_id ? <Badge variant="outline">Sincronizado</Badge> : <Badge variant="secondary">Pendiente</Badge>}
                    </TableCell>
                    <TableCell className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sync(it.id)}
                        disabled={syncingId === it.id || !it.activo || !it.precio_centavos}
                        title={!it.activo ? "Activá el producto" : !it.precio_centavos ? "Definí un precio > 0" : "Sincronizar con cobros"}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${syncingId === it.id ? "animate-spin" : ""}`} />Sync
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(it)}><Edit className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-8">Sin productos.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nuevo"} producto</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nombre</Label>
                  <Input value={editing.nombre || ""} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input value={editing.categoria || ""} onChange={(e) => setEditing({ ...editing, categoria: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Presentación</Label>
                  <Input value={editing.presentacion || ""} onChange={(e) => setEditing({ ...editing, presentacion: e.target.value })} />
                </div>
                <div>
                  <Label>Precio (MXN)</Label>
                  <Input type="number" step="0.01" value={editing.precio_centavos != null ? (editing.precio_centavos / 100).toFixed(2) : ""}
                    onChange={(e) => setEditing({ ...editing, precio_centavos: Math.round(parseFloat(e.target.value || "0") * 100) })} />
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Input value={editing.moneda || "mxn"} onChange={(e) => setEditing({ ...editing, moneda: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Descripción corta</Label>
                  <Input value={editing.descripcion || ""} onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Descripción larga</Label>
                  <Textarea rows={3} value={editing.descripcion_larga || ""} onChange={(e) => setEditing({ ...editing, descripcion_larga: e.target.value })} />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={!!editing.activo} onCheckedChange={(v) => setEditing({ ...editing, activo: v })} />
                  <Label>Activo</Label>
                </div>
              </div>
              <Button className="w-full" onClick={save} disabled={upsert.isPending}>Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}