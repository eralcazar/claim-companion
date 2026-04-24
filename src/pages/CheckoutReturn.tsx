import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Store, CreditCard, Sparkles, Receipt, AlertTriangle, RotateCw } from "lucide-react";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const kind = params.get("kind");
  const status = params.get("status"); // "failed" | "canceled" | null

  if (status === "failed" || status === "canceled") {
    const isOcr = kind === "ocr_pack";
    const reason =
      status === "canceled"
        ? "Cancelaste el pago antes de completarlo."
        : "El pago no se pudo procesar. Tu banco lo rechazó o la sesión expiró.";
    const retryTo = isOcr ? "/planes#compras-ocr" : kind === "subscription" ? "/planes" : "/farmacia";
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="font-heading text-xl font-bold">No pudimos completar el pago</h1>
            <p className="text-sm text-muted-foreground">{reason}</p>
            <p className="text-xs text-muted-foreground">
              No se realizó ningún cargo. Podés reintentar cuando quieras.
              {isOcr && " Vas a encontrar el botón de reintento en tu historial de compras OCR."}
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to={retryTo}>
                  <RotateCw className="h-4 w-4 mr-2" />Reintentar
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Panel de Paciente</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = (() => {
    if (kind === "ocr_pack") {
      return {
        title: "¡Escaneos añadidos!",
        message: "Tus escaneos OCR adicionales se acreditaron a tu cuenta.",
        primary: { label: "Volver a Estudios", to: "/estudios", icon: Sparkles },
        secondary: { label: "Ver mis compras OCR", to: "/planes#compras-ocr", icon: Receipt },
      };
    }
    if (kind === "subscription") {
      return {
        title: "¡Suscripción activada!",
        message: "Tu suscripción quedó activa. Ya podés usar todas las funciones incluidas.",
        primary: { label: "Mi suscripción", to: "/suscripcion", icon: CreditCard },
        secondary: null as null | { label: string; to: string; icon: any },
      };
    }
    return {
      title: "¡Pago recibido!",
      message: "Tu pago se procesó correctamente. La farmacia preparará tu pedido.",
      primary: { label: "Ver mis pedidos", to: "/farmacia", icon: Store },
      secondary: null as null | { label: string; to: string; icon: any },
    };
  })();
  const Icon = config.primary.icon;
  const SecondaryIcon = config.secondary?.icon;

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
            {config.secondary && SecondaryIcon && (
              <Button variant="secondary" asChild>
                <Link to={config.secondary.to}>
                  <SecondaryIcon className="h-4 w-4 mr-2" />{config.secondary.label}
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/">Inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}