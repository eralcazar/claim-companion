import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Barcode, CheckCircle2, Package, ScanLine, Trash2 } from "lucide-react";
import { useConfirmPicking, type PickingAssignment } from "@/hooks/usePicking";

type OrderItem = {
  id: string;
  catalog_id: string | null;
  cantidad: number;
  nombre_snapshot: string;
  presentacion_snapshot: string | null;
  lote_id: string | null;
};

type LotOption = {
  id: string;
  lote: string;
  caducidad: string;
  cantidad_actual: number;
};

type Split = { lot_id: string; cantidad: number };

type ItemState = {
  item: OrderItem;
  sku: string | null;
  lots: LotOption[];
  splits: Split[];
  verified: boolean;
};

export function PickingDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: any | null;
}) {
  const confirm = useConfirmPicking();
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState("");

  const branchId = order?.branch_id as string | null;

  useEffect(() => {
    if (!open || !order) return;
    if (!branchId) {
      toast.error("La orden no tiene sucursal asignada. Asígnala antes de surtir.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const items = (order.items || []) as OrderItem[];
      const catalogIds = Array.from(new Set(items.map((i) => i.catalog_id).filter(Boolean))) as string[];

      // Fetch SKUs for verification
      const skuMap: Record<string, string | null> = {};
      if (catalogIds.length) {
        const { data: cats } = await supabase
          .from("pharmacy_catalog")
          .select("id, sku")
          .in("id", catalogIds);
        for (const c of cats || []) skuMap[c.id] = c.sku;
      }

      const next: Record<string, ItemState> = {};
      for (const it of items) {
        let lots: LotOption[] = [];
        let splits: Split[] = [];
        if (it.catalog_id && branchId) {
          const { data: fefo } = await supabase.rpc("sugerir_lotes_fefo", {
            _catalog_id: it.catalog_id,
            _branch_id: branchId,
            _cantidad: it.cantidad,
          });
          const { data: allLots } = await supabase
            .from("pharmacy_lots")
            .select("id, lote, caducidad, cantidad_actual")
            .eq("catalog_id", it.catalog_id)
            .eq("branch_id", branchId)
            .eq("estado", "activo")
            .gt("cantidad_actual", 0)
            .order("caducidad", { ascending: true });
          lots = (allLots || []) as LotOption[];

          if (it.lote_id) {
            // POS pre-assigned lot
            splits = [{ lot_id: it.lote_id, cantidad: it.cantidad }];
          } else if (fefo && fefo.length) {
            splits = (fefo as any[]).map((f) => ({ lot_id: f.lot_id, cantidad: f.cantidad_a_tomar }));
          }
        }
        next[it.id] = {
          item: it,
          sku: it.catalog_id ? skuMap[it.catalog_id] ?? null : null,
          lots,
          splits,
          verified: false,
        };
      }
      if (!cancelled) setStates(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, order, branchId]);

  const allReady = useMemo(() => {
    const list = Object.values(states);
    if (!list.length) return false;
    return list.every((s) => {
      const total = s.splits.reduce((a, b) => a + (b.cantidad || 0), 0);
      return total === s.item.cantidad && s.splits.every((x) => x.lot_id && x.cantidad > 0);
    });
  }, [states]);

  const allVerified = useMemo(
    () => Object.values(states).every((s) => s.verified || !s.sku),
    [states]
  );

  function updateSplit(itemId: string, idx: number, patch: Partial<Split>) {
    setStates((prev) => {
      const s = prev[itemId];
      if (!s) return prev;
      const splits = s.splits.map((sp, i) => (i === idx ? { ...sp, ...patch } : sp));
      return { ...prev, [itemId]: { ...s, splits } };
    });
  }

  function addSplit(itemId: string) {
    setStates((prev) => {
      const s = prev[itemId];
      if (!s) return prev;
      return { ...prev, [itemId]: { ...s, splits: [...s.splits, { lot_id: "", cantidad: 0 }] } };
    });
  }

  function removeSplit(itemId: string, idx: number) {
    setStates((prev) => {
      const s = prev[itemId];
      if (!s) return prev;
      return { ...prev, [itemId]: { ...s, splits: s.splits.filter((_, i) => i !== idx) } };
    });
  }

  function handleScan(value: string) {
    const code = value.trim();
    if (!code) return;
    const match = Object.values(states).find(
      (s) => s.sku && s.sku.toLowerCase() === code.toLowerCase()
    );
    if (!match) {
      toast.error(`Código no coincide con ningún producto de la orden: ${code}`);
      return;
    }
    setStates((prev) => ({ ...prev, [match.item.id]: { ...match, verified: true } }));
    toast.success(`Verificado: ${match.item.nombre_snapshot}`);
    setScan("");
  }

  async function handleConfirm() {
    if (!order || !branchId) return;
    const assignments: PickingAssignment[] = Object.values(states)
      .filter((s) => s.item.catalog_id)
      .map((s) => ({
        item_id: s.item.id,
        catalog_id: s.item.catalog_id!,
        cantidad_requerida: s.item.cantidad,
        splits: s.splits.filter((sp) => sp.lot_id && sp.cantidad > 0),
      }));
    await confirm.mutateAsync({ order_id: order.id, branch_id: branchId, assignments });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Surtido de orden {order?.folio ? `· ${order.folio}` : ""}
          </DialogTitle>
        </DialogHeader>

        {!branchId ? (
          <div className="p-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            La orden no tiene sucursal. Asígnala antes de surtir.
          </div>
        ) : loading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <ScanLine className="h-3 w-3" /> Escanear código (SKU)
                </Label>
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={scan}
                    onChange={(e) => setScan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScan(scan);
                      }
                    }}
                    placeholder="Escanea o teclea el SKU y presiona Enter"
                    className="h-9"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleScan(scan)}>
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {Object.values(states).map((s) => {
              const totalAsignado = s.splits.reduce((a, b) => a + (b.cantidad || 0), 0);
              const ok = totalAsignado === s.item.cantidad;
              return (
                <Card key={s.item.id} className={s.verified ? "border-primary/50" : ""}>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {s.item.cantidad}× {s.item.nombre_snapshot}
                          {s.item.presentacion_snapshot && (
                            <span className="text-muted-foreground"> · {s.item.presentacion_snapshot}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">SKU: {s.sku || "—"}</p>
                      </div>
                      {s.verified && (
                        <Badge className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Verificado
                        </Badge>
                      )}
                    </div>

                    {!s.item.catalog_id ? (
                      <p className="text-xs text-muted-foreground italic">
                        Producto sin catálogo — se surte manual sin lote.
                      </p>
                    ) : s.lots.length === 0 ? (
                      <div className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Sin lotes disponibles en la sucursal.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {s.splits.map((sp, i) => {
                          const lot = s.lots.find((l) => l.id === sp.lot_id);
                          return (
                            <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                              <select
                                className="h-9 rounded-md border bg-background px-2 text-sm"
                                value={sp.lot_id}
                                onChange={(e) => updateSplit(s.item.id, i, { lot_id: e.target.value })}
                              >
                                <option value="">— Selecciona lote —</option>
                                {s.lots.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    Lote {l.lote} · cad {l.caducidad} · disp {l.cantidad_actual}
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                min={1}
                                max={lot?.cantidad_actual}
                                value={sp.cantidad}
                                onChange={(e) =>
                                  updateSplit(s.item.id, i, { cantidad: Number(e.target.value) || 0 })
                                }
                                className="h-9 tabular-nums"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeSplit(s.item.id, i)}
                                disabled={s.splits.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between text-xs">
                          <Button size="sm" variant="ghost" onClick={() => addSplit(s.item.id)}>
                            + Dividir en otro lote
                          </Button>
                          <span className={ok ? "text-primary" : "text-destructive"}>
                            Asignado: {totalAsignado} / {s.item.cantidad}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!allReady || confirm.isPending || loading}
            title={!allVerified ? "Sugerimos verificar por código de barras antes de confirmar" : ""}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {confirm.isPending ? "Surtiendo…" : allVerified ? "Confirmar surtido" : "Confirmar (sin verificar todo)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}