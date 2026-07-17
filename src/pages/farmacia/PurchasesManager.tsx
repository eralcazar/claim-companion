import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUp, Plus, Package, CheckCircle2, Trash2 } from "lucide-react";
import { useActiveBranch } from "@/hooks/usePharmacyBranches";
import { SucursalSelector } from "@/components/pharmacy/SucursalSelector";
import {
  usePharmacyPurchases,
  useParseCfdiXml,
  useCreatePurchase,
  useApplyPurchase,
  usePurchaseItems,
  type PurchaseItemDraft,
} from "@/hooks/usePharmacyPurchases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function ItemsPreview({ purchaseId }: { purchaseId: string }) {
  const { data: items = [] } = usePurchaseItems(purchaseId);
  if (!items.length) return <p className="text-xs text-muted-foreground">Sin partidas</p>;
  return (
    <ul className="text-xs space-y-0.5">
      {items.map((it: any) => (
        <li key={it.id} className="flex justify-between gap-2">
          <span className="truncate">
            {it.cantidad}× {it.descripcion}
            {it.lote ? <span className="text-muted-foreground"> · L: {it.lote}</span> : null}
          </span>
          <span className="tabular-nums">${(it.subtotal_centavos / 100).toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

function NewPurchaseDialog({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const parseCfdi = useParseCfdiXml();
  const create = useCreatePurchase();
  const [supplier, setSupplier] = useState({ rfc: "", nombre: "" });
  const [items, setItems] = useState<PurchaseItemDraft[]>([]);
  const [uuid, setUuid] = useState<string | null>(null);
  const [notas, setNotas] = useState("");

  const handleXml = async (file: File) => {
    const xml = await file.text();
    const data: any = await parseCfdi.mutateAsync(xml);
    setUuid(data?.uuid ?? null);
    setSupplier({ rfc: data?.emisor?.rfc ?? "", nombre: data?.emisor?.nombre ?? "" });
    setItems(
      (data?.conceptos ?? []).map((c: any) => ({
        descripcion: c.descripcion,
        clave_sat: c.clave_prod_serv,
        cantidad: Number(c.cantidad || 1),
        costo_unitario_centavos: Math.round((c.valor_unitario ?? 0) * 100),
        subtotal_centavos: Math.round((c.importe ?? 0) * 100),
        iva_pct: 16,
        lote: null,
        caducidad: null,
      })),
    );
  };

  const addManual = () =>
    setItems((prev) => [
      ...prev,
      { descripcion: "", cantidad: 1, costo_unitario_centavos: 0, subtotal_centavos: 0, iva_pct: 16 },
    ]);

  const subtotal = items.reduce((s, i) => s + i.subtotal_centavos, 0);
  const iva = items.reduce((s, i) => s + Math.round(i.subtotal_centavos * (i.iva_pct / 100)), 0);
  const total = subtotal + iva;

  const save = async () => {
    if (!supplier.nombre) return toast.error("Captura proveedor");
    if (!items.length) return toast.error("Agrega al menos un producto");
    for (const it of items) {
      if (!it.lote || !it.caducidad) return toast.error(`Falta lote/caducidad en "${it.descripcion || "producto"}"`);
    }
    await create.mutateAsync({
      branch_id: branchId,
      supplier_nombre: supplier.nombre,
      supplier_rfc: supplier.rfc || null,
      fuente: uuid ? "cfdi_xml" : "manual",
      cfdi_uuid: uuid,
      subtotal_centavos: subtotal,
      iva_centavos: iva,
      total_centavos: total,
      notas: notas || null,
      items,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <Label>Proveedor</Label>
          <Input value={supplier.nombre} onChange={(e) => setSupplier({ ...supplier, nombre: e.target.value })} />
        </div>
        <div className="min-w-[160px]">
          <Label>RFC</Label>
          <Input value={supplier.rfc} onChange={(e) => setSupplier({ ...supplier, rfc: e.target.value })} />
        </div>
        <div>
          <Label>Cargar CFDI XML</Label>
          <Input type="file" accept=".xml" onChange={(e) => e.target.files?.[0] && handleXml(e.target.files[0])} />
        </div>
      </div>
      {uuid ? <Badge variant="secondary">UUID: {uuid.slice(0, 8)}…</Badge> : null}

      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-20">Cant.</TableHead>
              <TableHead className="w-28">Costo unit.</TableHead>
              <TableHead className="w-28">Lote *</TableHead>
              <TableHead className="w-36">Caducidad *</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Input
                    value={it.descripcion}
                    onChange={(e) =>
                      setItems((p) => p.map((x, i) => (i === idx ? { ...x, descripcion: e.target.value } : x)))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={it.cantidad}
                    onChange={(e) => {
                      const cantidad = Number(e.target.value);
                      setItems((p) =>
                        p.map((x, i) =>
                          i === idx
                            ? { ...x, cantidad, subtotal_centavos: x.costo_unitario_centavos * cantidad }
                            : x,
                        ),
                      );
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={(it.costo_unitario_centavos / 100).toFixed(2)}
                    onChange={(e) => {
                      const costo_unitario_centavos = Math.round(Number(e.target.value) * 100);
                      setItems((p) =>
                        p.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                costo_unitario_centavos,
                                subtotal_centavos: costo_unitario_centavos * x.cantidad,
                              }
                            : x,
                        ),
                      );
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={it.lote ?? ""}
                    onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, lote: e.target.value } : x)))}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={it.caducidad ?? ""}
                    onChange={(e) =>
                      setItems((p) => p.map((x, i) => (i === idx ? { ...x, caducidad: e.target.value } : x)))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={addManual}>
          <Plus className="h-4 w-4 mr-1" />Agregar renglón
        </Button>
        <div className="text-sm tabular-nums space-y-0.5 text-right">
          <div>Subtotal: ${(subtotal / 100).toFixed(2)}</div>
          <div>IVA: ${(iva / 100).toFixed(2)}</div>
          <div className="font-semibold">Total: ${(total / 100).toFixed(2)}</div>
        </div>
      </div>
      <Textarea placeholder="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={save} disabled={create.isPending}>Guardar borrador</Button>
      </div>
    </div>
  );
}

export default function PurchasesManager() {
  const { branchId } = useActiveBranch();
  const { data: purchases = [], isLoading } = usePharmacyPurchases(branchId);
  const apply = useApplyPurchase();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />Compras / Entradas
        </h1>
        <div className="flex gap-2 items-center">
          <SucursalSelector />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!branchId}>
                <FileUp className="h-4 w-4 mr-1" />Nueva compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Registrar compra</DialogTitle></DialogHeader>
              {branchId ? <NewPurchaseDialog branchId={branchId} onClose={() => setOpen(false)} /> : null}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!branchId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Selecciona una sucursal.</CardContent></Card>
      ) : isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : purchases.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin compras registradas.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {purchases.map((p: any) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{p.supplier_nombre}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.fecha).toLocaleDateString()} · {p.folio ?? "sin folio"} · fuente {p.fuente}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant={p.estado === "aplicada" ? "default" : "outline"}>{p.estado}</Badge>
                    <p className="font-semibold tabular-nums">${(p.total_centavos / 100).toFixed(2)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ItemsPreview purchaseId={p.id} />
                {p.estado !== "aplicada" ? (
                  <Button size="sm" onClick={() => apply.mutate(p.id)} disabled={apply.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />Aplicar a inventario (crear lotes)
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}