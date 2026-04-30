import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyOcrQuota, totalQuota } from "@/hooks/useOcrQuota";

export function OcrBalanceCard() {
  const { data: quota, isLoading } = useMyOcrQuota();
  if (isLoading) return null;

  const sub = quota?.subscription_balance ?? 0;
  const addon = quota?.addon_balance ?? 0;
  const total = totalQuota(quota);
  const empty = total === 0;

  return (
    <Card
      className={
        empty
          ? "border-destructive/50 bg-destructive/5"
          : "border-primary/20 bg-primary/5"
      }
    >
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        <div
          className={
            "h-11 w-11 rounded-full flex items-center justify-center shrink-0 " +
            (empty ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")
          }
        >
          {empty ? <AlertTriangle className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {empty
              ? "Sin escaneos OCR disponibles"
              : `Escaneos OCR disponibles: ${total} ${total === 1 ? "página" : "páginas"}`}
          </div>
          <div className="text-xs text-muted-foreground">
            Suscripción: {sub} · Adicionales: {addon}
          </div>
        </div>
        <Button asChild size="sm" variant={empty ? "default" : "outline"}>
          <Link to="/planes#ocr">{empty ? "Comprar ahora" : "Comprar más"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}