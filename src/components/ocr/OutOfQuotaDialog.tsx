import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import kariAvatar from "@/assets/kari-avatar.png";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pagesRequired: number;
  pagesAvailable: number;
}

export function OutOfQuotaDialog({ open, onOpenChange, pagesRequired, pagesAvailable }: Props) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src={kariAvatar}
              alt="Kari"
              className="h-12 w-12 rounded-full border border-primary/30 object-cover"
            />
            <div>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Sin escaneos disponibles
              </DialogTitle>
              <DialogDescription className="mt-1">
                Este documento requiere más escaneos de los que tienes en tu plan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Páginas del documento</span>
            <span className="font-semibold">{pagesRequired}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo disponible</span>
            <span className="font-semibold text-destructive">{pagesAvailable}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Compra un paquete de escaneos OCR para continuar subiendo resultados de estudios.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/planes#ocr");
            }}
          >
            Comprar paquete OCR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}