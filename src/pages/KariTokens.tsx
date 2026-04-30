import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAiTokenPacks, useKariBalance, useMyKariPurchases } from "@/hooks/useKariTokens";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ConfirmPurchaseDialog } from "@/components/kari/ConfirmPurchaseDialog";

export default function KariTokens() {
  const { data: packs = [] } = useAiTokenPacks();
  const { data: balance } = useKariBalance();
  const { data: purchases = [] } = useMyKariPurchases();
  const [confirmPackId, setConfirmPackId] = useState<string | null>(null);
  const [checkoutPackId, setCheckoutPackId] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("ai-tokens-checkout", {
      body: {
        pack_id: checkoutPackId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=ai_tokens`,
      },
    });
    if (error || !data?.clientSecret) throw new Error(error?.message || "No se pudo iniciar el cobro");
    return data.clientSecret;
  }, [checkoutPackId]);

  const confirmPack = packs.find((p) => p.id === confirmPackId) ?? null;

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link to="/kari"><ArrowLeft className="h-4 w-4 mr-1" />Volver al chat</Link>
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />Tokens de IA para Kari
          </h1>
          <p className="text-sm text-muted-foreground">
            Compra tokens para conversar con Kari. Los tokens no caducan y se acumulan.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 text-base py-1 px-3">
          <Sparkles className="h-4 w-4" />
          {(balance?.balance ?? 0).toLocaleString("es-MX")} disponibles
        </Badge>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {packs.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-lg">{p.nombre}</h3>
              {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">${(p.precio_centavos / 100).toFixed(0)}</span>
                <span className="text-xs text-muted-foreground">{p.moneda}</span>
              </div>
              <div className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">{p.tokens.toLocaleString("es-MX")}</span> tokens
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!p.stripe_price_id}
                onClick={() => setConfirmPackId(p.id)}
              >
                {p.stripe_price_id ? "Comprar" : "No disponible"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {packs.length === 0 && (
          <Card className="sm:col-span-3">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No hay paquetes disponibles aún.
            </CardContent>
          </Card>
        )}
      </div>

      {purchases.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold">Historial de compras</h2>
            <div className="space-y-1 text-sm">
              {purchases.map((pp) => (
                <div key={pp.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                  <div>
                    <span className="font-medium">{pp.tokens.toLocaleString("es-MX")}</span> tokens
                    <span className="text-xs text-muted-foreground ml-2">
                      {format(new Date(pp.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">${(pp.amount_cents / 100).toFixed(0)} {pp.currency}</span>
                    <Badge variant={pp.status === "completed" ? "default" : pp.status === "pending" ? "secondary" : "destructive"} className="text-[10px]">
                      {pp.status === "completed" ? "Pagado" : pp.status === "pending" ? "Pendiente" : "Falló"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!checkoutPackId} onOpenChange={(v) => !v && setCheckoutPackId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comprar tokens de IA</DialogTitle></DialogHeader>
          {checkoutPackId && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmPurchaseDialog
        open={!!confirmPackId}
        onOpenChange={(v) => !v && setConfirmPackId(null)}
        pack={confirmPack}
        onConfirm={() => {
          setCheckoutPackId(confirmPackId);
          setConfirmPackId(null);
        }}
      />
    </div>
  );
}