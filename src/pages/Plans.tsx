import { useState, useCallback } from "react";
import { usePlans, usePlanFeatures, useSubscription } from "@/hooks/usePlans";
import { useOcrPacks, useMyOcrQuota, totalQuota } from "@/hooks/useOcrQuota";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, CreditCard, Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AVAILABLE_FEATURES } from "@/lib/features";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { OcrPurchaseHistory } from "@/components/ocr/OcrPurchaseHistory";

export default function Plans() {
  const [billing, setBilling] = useState<"mensual" | "anual">("mensual");
  const { data: plans = [] } = usePlans({ onlyActive: true });
  const { data: features = [] } = usePlanFeatures();
  const { data: packs = [] } = useOcrPacks({ onlyActive: true });
  const { data: quota } = useMyOcrQuota();
  const { subscription, isActive } = useSubscription();
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [checkoutPackId, setCheckoutPackId] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("subscription-create-checkout", {
      body: {
        plan_id: checkoutPlanId,
        billing,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=subscription`,
      },
    });
    if (error || !data?.clientSecret) throw new Error(error?.message || "No se pudo iniciar el cobro");
    return data.clientSecret;
  }, [checkoutPlanId, billing]);

  const fetchPackClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("ocr-pack-checkout", {
      body: {
        pack_id: checkoutPackId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=ocr_pack`,
      },
    });
    if (error || !data?.clientSecret) throw new Error(error?.message || "No se pudo iniciar el cobro");
    return data.clientSecret;
  }, [checkoutPackId]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="font-heading text-3xl font-bold flex items-center gap-2 justify-center">
          <CreditCard className="h-8 w-8 text-primary" />Planes
        </h1>
        <p className="text-muted-foreground">Elegí el paquete que mejor se adapte a vos.</p>
        <Tabs value={billing} onValueChange={(v: any) => setBilling(v)}>
          <TabsList className="mx-auto">
            <TabsTrigger value="mensual">Mensual</TabsTrigger>
            <TabsTrigger value="anual">Anual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => {
          const cents = billing === "mensual" ? p.precio_mensual_centavos : p.precio_anual_centavos;
          const planFeats = features.filter((f) => f.plan_id === p.id);
          const isCurrent = isActive && subscription?.plan_id === p.id;
          const ocrPages = (p as any).ocr_pages_per_month ?? 0;
          return (
            <Card key={p.id} className={isCurrent ? "border-primary" : ""}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-heading text-xl font-bold">{p.nombre}</h3>
                  {p.descripcion && <p className="text-sm text-muted-foreground">{p.descripcion}</p>}
                </div>
                <div className="text-3xl font-bold tabular-nums">
                  ${(cents / 100).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">/{billing === "mensual" ? "mes" : "año"}</span>
                </div>
                <ul className="space-y-1 text-sm">
                  {ocrPages > 0 && (
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {ocrPages} escaneos OCR / mes
                    </li>
                  )}
                  {planFeats.map((f) => {
                    const def = AVAILABLE_FEATURES.find((d) => d.key === f.feature_key);
                    return (
                      <li key={f.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {def?.label || f.feature_key}
                      </li>
                    );
                  })}
                  {planFeats.length === 0 && <li className="text-muted-foreground italic">Sin funciones definidas</li>}
                </ul>
                <Button className="w-full" disabled={isCurrent || cents === 0} onClick={() => setCheckoutPlanId(p.id)}>
                  {isCurrent ? "Plan actual" : cents === 0 ? "No disponible" : "Suscribirme"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {plans.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">Aún no hay planes disponibles.</CardContent></Card>
        )}
      </div>

      {/* OCR packs */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-heading text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />Paquetes de escaneos OCR
            </h2>
            <p className="text-sm text-muted-foreground">
              Comprá escaneos adicionales para análisis de estudios con IA. <span className="font-medium">No caducan</span> y se acumulan.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <InfinityIcon className="h-3 w-3" />
              Disponibles: <span className="font-bold">{totalQuota(quota)}</span>
            </Badge>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {packs.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-heading text-lg font-bold">{p.nombre}</h3>
                {p.descripcion && <p className="text-xs text-muted-foreground">{p.descripcion}</p>}
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums">${(p.precio_centavos / 100).toFixed(0)}</span>
                  <span className="text-xs text-muted-foreground">{p.moneda}</span>
                </div>
                <div className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">{p.cantidad_escaneos}</span> escaneos
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!p.stripe_price_id}
                  onClick={() => setCheckoutPackId(p.id)}
                >
                  {p.stripe_price_id ? "Comprar" : "No disponible"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {packs.length === 0 && (
            <Card className="sm:col-span-3"><CardContent className="p-6 text-center text-sm text-muted-foreground">No hay paquetes disponibles aún.</CardContent></Card>
          )}
        </div>
      </div>

      <Dialog open={!!checkoutPlanId} onOpenChange={(v) => !v && setCheckoutPlanId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Suscripción</DialogTitle></DialogHeader>
          {checkoutPlanId && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutPackId} onOpenChange={(v) => !v && setCheckoutPackId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comprar escaneos OCR</DialogTitle></DialogHeader>
          {checkoutPackId && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: fetchPackClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>

      <div className="pt-6 border-t">
        <OcrPurchaseHistory />
      </div>
    </div>
  );
}