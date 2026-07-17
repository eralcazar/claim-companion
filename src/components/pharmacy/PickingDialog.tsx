import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Barcode, CheckCircle2, Package, ScanLine, Trash2, Printer, Tag } from "lucide-react";
import { useConfirmPicking, logPickingAudit, type PickingAssignment } from "@/hooks/usePicking";
import { useAuth } from "@/contexts/AuthContext";

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
  estado?: string;
};

type Split = { lot_id: string; cantidad: number };

type ItemState = {
  item: OrderItem;
  sku: string | null;
  lots: LotOption[];
  splits: Split[];
  verified: boolean;
  fefoLotIds: string[]; // orden FEFO sugerido (por vencimiento asc, sin bloqueados/vencidos)
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
  const { roles } = useAuth();
  const canPick = roles.includes("admin") || roles.includes("farmacia");
  const confirm = useConfirmPicking();
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState("");

  const branchId = order?.branch_id as string | null;

  useEffect(() => {
    if (!open || !order) return;
    if (!canPick) return;
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
        let fefoLotIds: string[] = [];
        if (it.catalog_id && branchId) {
          const { data: fefo } = await supabase.rpc("sugerir_lotes_fefo", {
            _catalog_id: it.catalog_id,
            _branch_id: branchId,
            _cantidad: it.cantidad,
          });
          const { data: allLots } = await supabase
            .from("pharmacy_lots")
            .select("id, lote, caducidad, cantidad_actual, estado")
            .eq("catalog_id", it.catalog_id)
            .eq("branch_id", branchId)
            .order("caducidad", { ascending: true });
          lots = (allLots || []) as LotOption[];
          fefoLotIds = ((fefo as any[]) || []).map((f) => f.lot_id);

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
          fefoLotIds,
        };
      }
      if (!cancelled) setStates(next);
      setLoading(false);
      // Auditar apertura de surtido
      if (order?.id) logPickingAudit(order.id, "start", { items: items.length });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, order, branchId, canPick]);

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

  // Detección de violación FEFO: lote seleccionado no es el sugerido y existe
  // otro lote activo con vencimiento anterior no bloqueado con stock suficiente.
  const fefoViolations = useMemo(() => {
    const violations: { itemId: string; reason: string }[] = [];
    for (const s of Object.values(states)) {
      if (!s.item.catalog_id) continue;
      const activeLots = s.lots.filter(
        (l) => l.estado !== "bloqueado" && l.estado !== "vencido" && l.cantidad_actual > 0
      );
      for (const sp of s.splits) {
        if (!sp.lot_id) continue;
        const chosen = s.lots.find((l) => l.id === sp.lot_id);
        if (!chosen) continue;
        if (chosen.estado === "bloqueado" || chosen.estado === "vencido") {
          violations.push({
            itemId: s.item.id,
            reason: `Lote ${chosen.lote} está ${chosen.estado} y no puede surtirse.`,
          });
          continue;
        }
        const earlier = activeLots.find(
          (l) => l.id !== chosen.id && l.caducidad < chosen.caducidad && l.cantidad_actual >= sp.cantidad
        );
        if (earlier) {
          violations.push({
            itemId: s.item.id,
            reason: `Rompe FEFO: existe lote ${earlier.lote} (vence ${earlier.caducidad}) antes que ${chosen.lote} (vence ${chosen.caducidad}).`,
          });
        }
      }
    }
    return violations;
  }, [states]);

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
    // Intenta match por SKU o por número de lote
    const match = Object.values(states).find(
      (s) => s.sku && s.sku.toLowerCase() === code.toLowerCase()
    );
    if (match) {
      setStates((prev) => ({ ...prev, [match.item.id]: { ...match, verified: true } }));
      toast.success(`Verificado: ${match.item.nombre_snapshot}`);
      if (order?.id) logPickingAudit(order.id, "scan", { code, item_id: match.item.id, kind: "sku" });
      setScan("");
      return;
    }
    // Buscar por lote
    for (const s of Object.values(states)) {
      const lot = s.lots.find((l) => l.lote.toLowerCase() === code.toLowerCase());
      if (lot) {
        const isFefo = s.fefoLotIds.includes(lot.id);
        if (!isFefo) {
          toast.error(`Lote ${lot.lote} no cumple FEFO — usa el sugerido.`);
          if (order?.id)
            logPickingAudit(order.id, "scan_reject", {
              code, item_id: s.item.id, lot_id: lot.id, reason: "no_fefo",
            });
          return;
        }
        setStates((prev) => ({ ...prev, [s.item.id]: { ...prev[s.item.id], verified: true } }));
        toast.success(`Lote ${lot.lote} verificado (FEFO OK).`);
        if (order?.id) logPickingAudit(order.id, "scan", { code, item_id: s.item.id, lot_id: lot.id, kind: "lot" });
        setScan("");
        return;
      }
    }
    toast.error(`Código no coincide con ningún producto/lote: ${code}`);
    if (order?.id) logPickingAudit(order.id, "scan_reject", { code, reason: "not_found" });
  }

  function printPickingSheet() {
    if (!order) return;
    const rows = Object.values(states)
      .map((s) => {
        const splitsHtml = s.splits
          .map((sp) => {
            const lot = s.lots.find((l) => l.id === sp.lot_id);
            return `<tr><td></td><td>${lot?.lote ?? "—"}</td><td>${lot?.caducidad ?? "—"}</td><td class="num">${sp.cantidad}</td></tr>`;
          })
          .join("");
        return `
          <tr class="hd"><td colspan="4"><b>${s.item.cantidad}×</b> ${escapeHtml(s.item.nombre_snapshot)} ${s.item.presentacion_snapshot ? "· " + escapeHtml(s.item.presentacion_snapshot) : ""} — SKU ${escapeHtml(s.sku || "—")}</td></tr>
          ${splitsHtml}`;
      })
      .join("");
    openPrint(
      `Hoja de surtido — ${order.folio ?? order.id}`,
      `<h1>Hoja de surtido</h1>
       <p><b>Folio:</b> ${escapeHtml(order.folio ?? order.id)}<br/>
       <b>Sucursal:</b> ${escapeHtml(branchId ?? "")}<br/>
       <b>Fecha:</b> ${new Date().toLocaleString()}</p>
       <table>
         <thead><tr><th>Producto</th><th>Lote FEFO</th><th>Vencimiento</th><th>Cant.</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>
       <p class="foot">Surtido según FEFO — lote con vencimiento más próximo primero, respetando bloqueos.</p>`
    );
  }

  function printLabels() {
    if (!order) return;
    const cards = Object.values(states)
      .flatMap((s) =>
        s.splits
          .filter((sp) => sp.lot_id && sp.cantidad > 0)
          .map((sp) => {
            const lot = s.lots.find((l) => l.id === sp.lot_id);
            return `<div class="label">
              <div class="prod">${escapeHtml(s.item.nombre_snapshot)}</div>
              <div class="row"><span>SKU</span><b>${escapeHtml(s.sku || "—")}</b></div>
              <div class="row"><span>Lote</span><b>${escapeHtml(lot?.lote ?? "—")}</b></div>
              <div class="row"><span>Lot ID</span><small>${escapeHtml(sp.lot_id)}</small></div>
              <div class="row"><span>Vence</span><b>${escapeHtml(lot?.caducidad ?? "—")}</b></div>
              <div class="row"><span>Cant.</span><b>${sp.cantidad}</b></div>
              <div class="foot">Orden ${escapeHtml(order.folio ?? order.id)}</div>
            </div>`;
          })
      )
      .join("");
    openPrint(
      `Etiquetas de lote — ${order.folio ?? order.id}`,
      `<div class="grid">${cards}</div>`,
      `.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
       .label{border:1px dashed #333;padding:8px;border-radius:6px;font-size:11px}
       .prod{font-weight:700;font-size:12px;margin-bottom:4px}
       .row{display:flex;justify-content:space-between;gap:6px;border-bottom:1px dotted #ccc;padding:2px 0}
       .row small{font-family:monospace;font-size:9px}
       .foot{margin-top:4px;font-size:9px;color:#666;text-align:right}`
    );
  }

  async function handleConfirm() {
    if (!order || !branchId) return;
    if (fefoViolations.length > 0) {
      toast.error("Corrige las violaciones FEFO antes de confirmar.");
      return;
    }
    const assignments: PickingAssignment[] = Object.values(states)
      .filter((s) => s.item.catalog_id)
      .map((s) => ({
        item_id: s.item.id,
        catalog_id: s.item.catalog_id!,
        cantidad_requerida: s.item.cantidad,
        splits: s.splits.filter((sp) => sp.lot_id && sp.cantidad > 0),
      }));
    await confirm.mutateAsync({ order_id: order.id, branch_id: branchId, assignments });
    // Ofrece imprimir etiquetas justo después
    setTimeout(() => {
      if (window.confirm("Surtido confirmado. ¿Imprimir etiquetas de lote ahora?")) printLabels();
    }, 100);
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

        {!canPick ? (
          <div className="p-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Necesitas rol farmacia o admin para surtir órdenes.
          </div>
        ) : !branchId ? (
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
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={printPickingSheet}>
                <Printer className="h-4 w-4 mr-1" /> Hoja de surtido
              </Button>
              <Button size="sm" variant="outline" onClick={printLabels}>
                <Tag className="h-4 w-4 mr-1" /> Etiquetas por lote
              </Button>
            </div>

            {fefoViolations.length > 0 && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs space-y-1">
                <p className="font-medium flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Violaciones FEFO — no se puede confirmar
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {fefoViolations.map((v, i) => (
                    <li key={i}>{v.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <Card className="bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <ScanLine className="h-3 w-3" /> Escanear código (SKU o lote)
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
                    placeholder="Escanea SKU o número de lote y presiona Enter"
                    className="h-9"
                  />
                  <Button size="sm" variant="outline" onClick={() => handleScan(scan)}>
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Los escaneos por lote que rompan FEFO se rechazan y quedan registrados en la bitácora.
                </p>
              </CardContent>
            </Card>

            {Object.values(states).map((s) => {
              const totalAsignado = s.splits.reduce((a, b) => a + (b.cantidad || 0), 0);
              const ok = totalAsignado === s.item.cantidad;
              const activeLots = s.lots.filter(
                (l) => l.estado !== "bloqueado" && l.estado !== "vencido" && l.cantidad_actual > 0
              );
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
                    ) : activeLots.length === 0 ? (
                      <div className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Sin lotes activos disponibles (revisa vencidos/bloqueados).
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {s.fefoLotIds.length > 0 && (
                          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1 items-center">
                            <span>FEFO sugerido:</span>
                            {s.fefoLotIds.map((lid) => {
                              const l = s.lots.find((x) => x.id === lid);
                              return (
                                <Badge key={lid} variant="secondary" className="text-[10px]">
                                  {l?.lote} · vence {l?.caducidad}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        {s.splits.map((sp, i) => {
                          const lot = s.lots.find((l) => l.id === sp.lot_id);
                          const breaksFefo = !!lot && lot.estado !== "bloqueado" && lot.estado !== "vencido" &&
                            activeLots.some((l) => l.id !== lot.id && l.caducidad < lot.caducidad && l.cantidad_actual >= sp.cantidad);
                          const blocked = lot?.estado === "bloqueado" || lot?.estado === "vencido";
                          return (
                            <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                              <select
                                className={`h-9 rounded-md border bg-background px-2 text-sm ${breaksFefo || blocked ? "border-destructive" : ""}`}
                                value={sp.lot_id}
                                onChange={(e) => updateSplit(s.item.id, i, { lot_id: e.target.value })}
                              >
                                <option value="">— Selecciona lote —</option>
                                {s.lots.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    Lote {l.lote} · cad {l.caducidad} · disp {l.cantidad_actual}{l.estado && l.estado !== "activo" ? ` · ${l.estado}` : ""}
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
            disabled={!canPick || !allReady || confirm.isPending || loading || fefoViolations.length > 0}
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

// -----------------------------------------------------------------------------
// Helpers de impresión
// -----------------------------------------------------------------------------
function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function openPrint(title: string, body: string, extraCss = "") {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) {
    toast.error("El navegador bloqueó la ventana de impresión.");
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:16px}
      h1{font-size:16px;margin:0 0 8px}
      p{font-size:12px;margin:4px 0}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
      th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}
      th{background:#f5f5f5}
      td.num{text-align:right;font-variant-numeric:tabular-nums}
      tr.hd td{background:#fafafa;font-size:12px}
      .foot{margin-top:12px;font-size:10px;color:#666}
      @media print{ .noprint{display:none} }
      ${extraCss}
    </style></head><body>${body}
    <div class="noprint" style="margin-top:16px;text-align:right">
      <button onclick="window.print()">Imprimir</button>
    </div>
    <script>setTimeout(()=>window.print(),300)</script>
    </body></html>`);
  w.document.close();
}