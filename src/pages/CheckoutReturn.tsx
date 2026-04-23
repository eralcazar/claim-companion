import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Store, CreditCard, Sparkles } from "lucide-react";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const kind = params.get("kind");

  const config = (() => {
    if (kind === "ocr_pack") {
      return {
        title: "¡Escaneos añadidos!",
        message: "Tus escaneos OCR adicionales se acreditaron a tu cuenta.",
        primary: { label: "Volver a Estudios", to: "/estudios", icon: Sparkles },
      };
    }
    if (kind === "subscription") {
      return {
        title: "¡Suscripción activada!",
        message: "Tu suscripción quedó activa. Ya podés usar todas las funciones incluidas.",
        primary: { label: "Mi suscripción", to: "/suscripcion", icon: CreditCard },
      };
    }
    return {
      title: "¡Pago recibido!",
      message: "Tu pago se procesó correctamente. La farmacia preparará tu pedido.",
      primary: { label: "Ver mis pedidos", to: "/farmacia", icon: Store },
    };
  })();
  const Icon = config.primary.icon;

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h1 className="font-heading text-xl font-bold">{config.title}</h1>
          <p className="text-sm text-muted-foreground">
            {sessionId ? config.message : "No encontramos información del pago."}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to={config.primary.to}><Icon className="h-4 w-4 mr-2" />{config.primary.label}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}