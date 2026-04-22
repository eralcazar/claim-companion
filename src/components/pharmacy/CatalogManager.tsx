import { useState } from "react";
import { useCatalog, useUpsertCatalog, useDeleteCatalog, type CatalogItem } from "@/hooks/usePharmacy";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";

export function CatalogManager() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CatalogItem> | null>(null);
  const { data: items = [], isLoading } = useCatalog({ q });
  const upsert = useUpsertCatalog();
  const del = useDeleteCatalog();

  const startNew = () => {
    setEditing({ nombre: "", presentacion: "", precio_centavos: 0, moneda: "mxn", activo: true });
    setOpen(true);
  };

  const startEdit = (it: CatalogItem) => {
    setEditing(it);
    setOpen(true);
  };

  const save = async () => {
    if (!editing?.nombre || editing.precio_centavos == null) return;
    await upsert.mutateAsync(editing);
    setOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar medicamento" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin medicamentos en el catálogo.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id} className={it.activo ? "" : "opacity-60"}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.nombre}</p>
                  {it.presentacion && <p className="text-xs text-muted-foreground truncate">{it.presentacion}</p>}
                </div>
                <div className="text-sm font-medium tabular-nums">
                  ${(it.precio_centavos / 100).toFixed(2)} {it.moneda.toUpperCase()}
                </div>
                <Button size="icon" variant="ghost" onClick={() => startEdit(it)}><Edit className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nuevo"} medicamento</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={editing.nombre || ""} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Presentación</Label>
                <Input value={editing.presentacion || ""} onChange={(e) => setEditing({ ...editing, presentacion: e.target.value })} placeholder="Ej. Caja c/30 tabletas 500mg" />
              </div>
              <div>
                <Label>Precio (MXN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editing.precio_centavos != null ? (editing.precio_centavos / 100).toFixed(2) : ""}
                  onChange={(e) => setEditing({ ...editing, precio_centavos: Math.round(parseFloat(e.target.value || "0") * 100) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.activo} onCheckedChange={(v) => setEditing({ ...editing, activo: v })} />
                <Label>Activo</Label>
              </div>
              <Button className="w-full" onClick={save} disabled={upsert.isPending}>Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}