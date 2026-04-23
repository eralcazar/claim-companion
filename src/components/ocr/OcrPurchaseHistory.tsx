import { useMyOcrPurchases, useMyOcrQuota, totalQuota } from "@/hooks/useOcrQuota";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Receipt, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    paid: { label: "Completada", cls: "bg-success/15 text-success border-success/30", Icon: CheckCircle2 },
    pending: { label: "Pendiente", cls: "bg-warning/15 text-warning border-warning/30", Icon: Clock },
    failed: { label: "Fallida", cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle },
    refunded: { label: "Reembolsada", cls: "bg-muted text-muted-foreground", Icon: XCircle },
    granted: { label: "Regalo", cls: "bg-primary/15 text-primary border-primary/30", Icon: Sparkles },
  };
  const conf = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground", Icon: Clock };
  const { Icon } = conf;
  return (
    <Badge variant="outline" className={`gap-1 ${conf.cls}`}>
      <Icon className="h-3 w-3" />
      {conf.label}
    </Badge>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function OcrPurchaseHistory() {
  const { data: purchases = [], isLoading, refetch, isFetching } = useMyOcrPurchases();
  const { data: quota } = useMyOcrQuota();
  const qc = useQueryClient();

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["my_ocr_quota"] });
    refetch();
  };

  const sub = quota?.subscription_balance ?? 0;
  const addon = quota?.addon_balance ?? 0;
  const total = totalQuota(quota);
  const pending = purchases.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />Mis compras OCR
          </h2>
          <p className="text-sm text-muted-foreground">
            Estado de tus pagos y balance actualizado de escaneos.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total disponible</div>
            <div className="text-3xl font-bold tabular-nums flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />{total}
            </div>
            <div className="text-xs text-muted-foreground mt-1">escaneos OCR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">De tu suscripción</div>
            <div className="text-2xl font-bold tabular-nums">{sub}</div>
            {quota?.period_end && (
              <div className="text-xs text-muted-foreground mt-1">
                Renueva: {new Date(quota.period_end).toLocaleDateString("es-MX")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">De paquetes / regalos</div>
            <div className="text-2xl font-bold tabular-nums">{addon}</div>
            <div className="text-xs text-muted-foreground mt-1">No caducan</div>
          </CardContent>
        </Card>
      </div>

      {pending > 0 && (
        <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
          Tenés {pending} compra{pending > 1 ? "s" : ""} pendiente{pending > 1 ? "s" : ""}. Refrescamos automáticamente cada 5 segundos.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paquete</TableHead>
                  <TableHead className="text-right">Escaneos</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aún no tenés compras de paquetes OCR.</TableCell></TableRow>
                ) : (
                  purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-sm">{formatDate(p.paid_at || p.created_at)}</TableCell>
                      <TableCell className="text-sm">
                        {p.ocr_packs?.nombre || (p.status === "granted" ? "Regalo de admin" : "Paquete OCR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">+{p.cantidad_escaneos}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.precio_centavos > 0 ? `$${(p.precio_centavos / 100).toFixed(2)} ${p.moneda}` : "—"}
                      </TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}