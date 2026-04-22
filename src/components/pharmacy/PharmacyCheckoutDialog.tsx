import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

interface CartItem {
  catalog_id: string;
  cantidad: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patientId: string;
  recetaId?: string | null;
  items: CartItem[];
}

export function PharmacyCheckoutDialog({ open, onOpenChange, patientId, recetaId, items }: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("pharmacy-create-checkout", {
      body: {
        patient_id: patientId,
        receta_id: recetaId || null,
        items,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "No se pudo iniciar el cobro");
    }
    return data.clientSecret as string;
  }, [patientId, recetaId, items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pago de farmacia</DialogTitle>
        </DialogHeader>
        {open && (
          <div id="checkout">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}