import { useState } from "react";
import { useInventory, useUpsertInventory, useCreateMovement, useMovements } from "@/hooks/useInventory";
import { useCatalog } from "@/hooks/usePharmacy";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Boxes, AlertTriangle, Plus } from "lucide-react";

export default function InventoryManager() {
  const { data: inventory = [], isLoading } = useInventory();
  const { data: catalog = [] } = useCatalog();
  const upsert = useUpsertInventory();
  const createMov = useCreateMovement();
  const { data: movements = [] } = useMovements();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [movDialog, setMovDialog] = useState<{ catalog_id: string; nombre: string } | null>(null);
  const [movForm, setMovForm] = useState({ tipo: "entrada" as const, cantidad: 1, motivo: "" });

  const lowStock = inventory.filter((r) => r.stock_actual <= r.stock_minimo);
  const productsWithoutInv = catalog.filter((c) => !inventory.find((i) => i.catalog_id === c.id));

  const seedProduct = async (catalog_id: string) => {
    await upsert.mutateAsync({ catalog_id, stock_actual: 0, stock_minimo: 0 });
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Boxes className="h-6 w-6 text-primary" />Inventario
      </h1>

      {lowStock.length > 0 && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm"><strong>{lowStock.length}</strong> producto(s) en stock bajo o agotado.</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="text-right">Costo unit.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((r: any) => {
                      const isEditing = editingId === r.catalog_id;
                      const low = r.stock_actual <= r.stock_minimo;
                      return (
                        <TableRow key={r.catalog_id} className={low ? "bg-warning/5" : ""}>
                          <TableCell>
                            <p className="font-medium">{r.catalog?.nombre}</p>
                            {r.catalog?.sku && <p className="text-xs font-mono text-muted-foreground">{r.catalog.sku}</p>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {low ? <Badge variant="destructive">{r.stock_actual}</Badge> : r.stock_actual}
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <Input type="number" defaultValue={r.stock_minimo} className="w-20 inline-block"
                                id={`min-${r.catalog_id}`} />
                            ) : r.stock_minimo}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input defaultValue={r.ubicacion || ""} className="w-32 inline-block" id={`ubic-${r.catalog_id}`} />
                            ) : (r.ubicacion || "—")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {isEditing ? (
                              <Input type="number" step="0.01" defaultValue={(r.costo_unitario_centavos / 100).toFixed(2)}
                                className="w-24 inline-block" id={`costo-${r.catalog_id}`} />
                            ) : `$${(r.costo_unitario_centavos / 100).toFixed(2)}`}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {isEditing ? (
                              <>
                                <Button size="sm" onClick={async () => {
                                  const min = Number((document.getElementById(`min-${r.catalog_id}`) as HTMLInputElement)?.value || 0);
                                  const ubic = (document.getElementById(`ubic-${r.catalog_id}`) as HTMLInputElement)?.value || null;
                                  const costo = Math.round(parseFloat((document.getElementById(`costo-${r.catalog_id}`) as HTMLInputElement)?.value || "0") * 100);
                                  await upsert.mutateAsync({ catalog_id: r.catalog_id, stock_minimo: min, ubicacion: ubic || undefined, costo_unitario_centavos: costo });
                                  setEditingId(null);
                                }}>Guardar</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setMovDialog({ catalog_id: r.catalog_id, nombre: r.catalog?.nombre })}>
                                  <Plus className="h-3 w-3 mr-1" />Movimiento
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(r.catalog_id)}>Editar</Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {productsWithoutInv.map((p) => (
                      <TableRow key={p.id} className="opacity-60">
                        <TableCell><p className="font-medium">{p.nombre}</p></TableCell>
                        <TableCell colSpan={4} className="text-muted-foreground text-sm italic">Sin registro de inventario</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => seedProduct(p.id)}>Iniciar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{new Date(m.created_at).toLocaleString()}</TableCell>
                      <TableCell>{m.catalog?.nombre || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{m.tipo}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{m.cantidad}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.motivo || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground p-8">Sin movimientos.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!movDialog} onOpenChange={(v) => !v && setMovDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo movimiento — {movDialog?.nombre}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={movForm.tipo} onValueChange={(v: any) => setMovForm({ ...movForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (compra)</SelectItem>
                  <SelectItem value="salida">Salida (merma)</SelectItem>
                  <SelectItem value="ajuste">Ajuste positivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input type="number" min="1" value={movForm.cantidad} onChange={(e) => setMovForm({ ...movForm, cantidad: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={movForm.motivo} onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })} />
            </div>
            <Button className="w-full" onClick={async () => {
              if (!movDialog) return;
              await createMov.mutateAsync({
                catalog_id: movDialog.catalog_id,
                tipo: movForm.tipo,
                cantidad: movForm.cantidad,
                motivo: movForm.motivo,
              });
              setMovDialog(null);
              setMovForm({ tipo: "entrada", cantidad: 1, motivo: "" });
            }}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}