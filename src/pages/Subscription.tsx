import { useSubscription, usePlans } from "@/hooks/usePlans";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CreditCard, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { useState } from "react";

export default function SubscriptionPage() {
  const { subscription, isActive, loading } = useSubscription();
  const { data: plans = [] } = usePlans();
  const [opening, setOpening] = useState(false);

  const plan = plans.find((p) => p.id === subscription?.plan_id);
  const hasStripeCustomer = !!subscription?.stripe_customer_id;

  const openPortal = async () => {
    if (!hasStripeCustomer) {
      toast.error("Tu paquete actual no tiene pagos registrados. Para gestionarlo, cambia a un plan de pago.");
      return;
    }
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if (error || !data?.url) throw new Error(error?.message || "No se pudo abrir el portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOpening(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-primary" />Mi suscripción
      </h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          {!subscription ? (
            <>
              <p className="text-muted-foreground">No tenés una suscripción activa.</p>
              <Button asChild><Link to="/planes">Ver planes</Link></Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-xl font-bold">{plan?.nombre || "—"}</p>
                </div>
                <Badge variant={isActive ? "default" : "secondary"}>{subscription.status}</Badge>
              </div>
              {subscription.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Acceso hasta:" : "Próxima renovación:"}{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {hasStripeCustomer && (
                  <Button onClick={openPortal} disabled={opening}>
                    <ExternalLink className="h-4 w-4 mr-1" />Gestionar suscripción
                  </Button>
                )}
                <Button variant="outline" asChild><Link to="/planes">Cambiar de plan</Link></Button>
              </div>
              {!hasStripeCustomer && (
                <p className="text-xs text-muted-foreground">
                  Este paquete fue asignado manualmente o es gratuito, por lo que no tiene gestión de pagos.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}