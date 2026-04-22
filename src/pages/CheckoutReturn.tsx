import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Store } from "lucide-react";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h1 className="font-heading text-xl font-bold">¡Pago recibido!</h1>
          <p className="text-sm text-muted-foreground">
            {sessionId
              ? "Tu pago se procesó correctamente. La farmacia preparará tu pedido."
              : "No encontramos información del pago."}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to="/farmacia"><Store className="h-4 w-4 mr-2" />Ver mis pedidos</Link>
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