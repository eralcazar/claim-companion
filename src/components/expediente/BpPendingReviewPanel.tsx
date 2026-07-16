import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useBpPendingReview, useReviewBpReading } from "@/hooks/useBleDevices";

/**
 * Lista lecturas de presión con `requires_review=true` para validación humana.
 * Solo visible cuando hay pendientes.
 */
export function BpPendingReviewPanel({ patientId }: { patientId: string }) {
  const q = useBpPendingReview(patientId);
  const review = useReviewBpReading();

  if (!q.data || q.data.length === 0) return null;

  const act = async (id: string, action: "validate" | "discard") => {
    try {
      await review.mutateAsync({ id, action });
      toast.success(action === "validate" ? "Lectura validada" : "Lectura descartada");
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-warning" />
          Lecturas BLE pendientes de revisión ({q.data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {q.data.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2">
              <div>
                <p className="text-sm font-medium">
                  {r.systolic}/{r.diastolic} mmHg{r.pulse ? ` · ${r.pulse} bpm` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.taken_at).toLocaleString()} · {r.device_name ?? "dispositivo BLE"}
                  <Badge variant="outline" className="ml-2">BLE</Badge>
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => act(r.id, "validate")} disabled={review.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Validar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act(r.id, "discard")} disabled={review.isPending}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}