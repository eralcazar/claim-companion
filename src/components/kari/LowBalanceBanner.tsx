import { Link } from "react-router-dom";
import { AlertTriangle, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKariBalanceStatus } from "@/hooks/useKariTokens";
import { cn } from "@/lib/utils";

interface Props {
  monthlyLimit?: { used: number; cap: number; resets_at: string } | null;
  className?: string;
}

/**
 * Banner que muestra alertas de saldo bajo o cero, y de límite mensual alcanzado.
 * Se autosuprime si todo está bien.
 */
export function LowBalanceBanner({ monthlyLimit, className }: Props) {
  const { balance, isEmpty, isLow } = useKariBalanceStatus();

  const monthlyExceeded =
    monthlyLimit && monthlyLimit.cap > 0 && monthlyLimit.used >= monthlyLimit.cap;

  if (!isEmpty && !isLow && !monthlyExceeded) return null;

  if (monthlyExceeded) {
    const resets = new Date(monthlyLimit!.resets_at);
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/10 text-destructive-foreground p-3 text-sm flex items-start gap-2",
          className,
        )}
      >
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-destructive">Límite mensual alcanzado</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Has usado {monthlyLimit!.used.toLocaleString("es-MX")} de{" "}
            {monthlyLimit!.cap.toLocaleString("es-MX")} tokens de tu paquete este mes. Se renueva el{" "}
            {resets.toLocaleDateString("es-MX")}.
          </p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm flex items-center gap-2",
          className,
        )}
      >
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-destructive">Sin tokens de IA</div>
          <p className="text-xs text-muted-foreground">Compra un paquete para seguir hablando con Kari.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/kari/tokens">
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />Comprar
          </Link>
        </Button>
      </div>
    );
  }

  // isLow
  return (
    <div
      className={cn(
        "rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm flex items-center gap-2",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 text-warning shrink-0" />
      <div className="flex-1">
        <div className="font-medium">Te quedan {balance.toLocaleString("es-MX")} tokens</div>
        <p className="text-xs text-muted-foreground">Considera comprar más para no quedarte sin Kari.</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/kari/tokens">
          <ShoppingCart className="h-3.5 w-3.5 mr-1" />Comprar
        </Link>
      </Button>
    </div>
  );
}