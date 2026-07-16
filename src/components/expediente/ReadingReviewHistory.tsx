import { useReadingReviewHistory } from "@/hooks/useBleDevices";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

const KIND_LABEL: Record<string, string> = {
  blood_pressure: "Presión",
  spo2: "SpO₂",
  temperature: "Temperatura",
  activity: "Actividad",
  glucose: "Glucosa",
  heart_rate: "Frec. cardíaca",
};

/**
 * Historial de revisiones (validaciones / rechazos) de lecturas BLE con quién,
 * cuándo y motivo opcional.
 */
export function ReadingReviewHistory({ patientId }: { patientId: string }) {
  const { data = [], isLoading } = useReadingReviewHistory(patientId);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Historial de revisiones de lecturas</h3>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Sin revisiones registradas todavía.</p>
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={r.action === "validate" ? "default" : "destructive"}>
                      {r.action === "validate" ? "Validada" : "Descartada"}
                    </Badge>
                    <Badge variant="outline">{KIND_LABEL[r.reading_kind] ?? r.reading_kind}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("es-MX")}</span>
                  </div>
                  {r.notes && <p className="text-sm mt-1 whitespace-pre-wrap">{r.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Revisor: {r.reviewer_id ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}