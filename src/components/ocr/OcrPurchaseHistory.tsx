import { useCallback, useState } from "react";
import { useMyOcrPurchases, useMyOcrQuota, totalQuota, useOcrPacks, type OcrPackPurchase } from "@/hooks/useOcrQuota";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Receipt, CheckCircle2, Clock, XCircle, RefreshCw, AlertTriangle, RotateCw, Info, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { data: packs = [] } = useOcrPacks({ onlyActive: true });
  const qc = useQueryClient();
  const [retryPackId, setRetryPackId] = useState<string | null>(null);
  const [detailsPurchase, setDetailsPurchase] = useState<OcrPackPurchase | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ["my_ocr_quota"] });
    refetch();
  };

  const sub = quota?.subscription_balance ?? 0;
  const addon = quota?.addon_balance ?? 0;
  const total = totalQuota(quota);
  const pending = purchases.filter((p) => p.status === "pending").length;
  const failedPurchases = purchases.filter((p) => p.status === "failed");
  const lastFailed: OcrPackPurchase | undefined = failedPurchases[0];

  const failureReason = (p: OcrPackPurchase): string => {
    if (!p.stripe_session_id && !p.stripe_payment_intent_id) {
      return "No se inició el cobro en la pasarela. Probá de nuevo.";
    }
    if (p.environment === "sandbox") {
      return "El pago fue rechazado en modo prueba (tarjeta declinada o autenticación 3DS fallida). Podés reintentar con otra tarjeta de prueba.";
    }
    return "Tu banco rechazó el cobro o la sesión expiró antes de completarse. Podés reintentar el pago.";
  };

  const retryPack = packs.find((pk) => pk.id === retryPackId) || null;

  const fetchRetryClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("ocr-pack-checkout", {
      body: {
        pack_id: retryPackId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=ocr_pack`,
      },
    });
    if (error || !data?.clientSecret) throw new Error(error?.message || "No se pudo iniciar el cobro");
    return data.clientSecret;
  }, [retryPackId]);

  return (
    <div id="compras-ocr" className="space-y-4 scroll-mt-20">
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

      {lastFailed && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-medium text-destructive">
                Tu última compra OCR no se pudo completar
              </div>
              <div className="text-sm text-destructive/90">
                <span className="font-medium">
                  {lastFailed.ocr_packs?.nombre || "Paquete OCR"}
                </span>{" "}
                — {failureReason(lastFailed)}
              </div>
              <div className="text-xs text-muted-foreground">
                Intento del {formatDate(lastFailed.created_at)}.
                {failedPurchases.length > 1 && ` (${failedPurchases.length} intentos fallidos en total)`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {lastFailed.pack_id && packs.some((pk) => pk.id === lastFailed.pack_id) && (
              <Button
                size="sm"
                onClick={() => setRetryPackId(lastFailed.pack_id!)}
              >
                <RotateCw className="h-4 w-4 mr-1" />
                Reintentar pago
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setDetailsPurchase(lastFailed)}>
              <Info className="h-4 w-4 mr-1" />
              Ver detalles
            </Button>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Verificar estado
            </Button>
          </div>
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
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Cargando…</TableCell></TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aún no tenés compras de paquetes OCR.</TableCell></TableRow>
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
                      <TableCell className="text-right">
                        {p.status === "failed" ? (
                          <div className="flex items-center justify-end gap-1">
                            {p.pack_id && packs.some((pk) => pk.id === p.pack_id) && (
                              <Button size="sm" variant="outline" onClick={() => setRetryPackId(p.pack_id!)}>
                                <RotateCw className="h-3 w-3 mr-1" />
                                Reintentar
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setDetailsPurchase(p)}>
                              <Info className="h-3 w-3 mr-1" />
                              Detalles
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!retryPackId} onOpenChange={(v) => !v && setRetryPackId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Reintentar pago{retryPack ? ` — ${retryPack.nombre}` : ""}
            </DialogTitle>
          </DialogHeader>
          {retryPackId && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: fetchRetryClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}