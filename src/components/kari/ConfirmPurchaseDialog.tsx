import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  pack: {
    nombre: string;
    tokens: number;
    precio_centavos: number;
    moneda: string;
    descripcion?: string | null;
  } | null;
}

export function ConfirmPurchaseDialog({ open, onOpenChange, onConfirm, pack }: Props) {
  if (!pack) return null;
  const precio = (pack.precio_centavos / 100).toFixed(0);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ¿Confirmar compra?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paquete</span>
                  <span className="font-semibold text-foreground">{pack.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {pack.tokens.toLocaleString("es-MX")}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground text-base">
                    ${precio} {pack.moneda}
                  </span>
                </div>
              </div>
              <p className="text-xs">
                Cargo único. Los tokens no caducan y se acumulan a tu balance actual. Pago seguro
                procesado por Stripe.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirmar y pagar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}