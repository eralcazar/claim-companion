import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, HeartPulse, Activity, Thermometer, Footprints } from "lucide-react";
import { toast } from "sonner";
import {
  useBlePendingReview,
  useReviewReading,
  type PendingReviewKind,
} from "@/hooks/useBleDevices";

const KIND_META: Record<PendingReviewKind, { icon: any; label: string; format: (r: any) => string }> = {
  blood_pressure: {
    icon: HeartPulse,
    label: "Presión",
    format: (r) => `${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · ${r.pulse} bpm` : ""}`,
  },
  spo2: {
    icon: Activity,
    label: "SpO₂",
    format: (r) => `${r.spo2}%${r.pulse ? ` · ${r.pulse} bpm` : ""}`,
  },
  temperature: {
    icon: Thermometer,
    label: "Temperatura",
    format: (r) => `${r.temperature_c} °C`,
  },
  activity: {
    icon: Footprints,
    label: "Actividad",
    format: (r) => `${r.steps ?? 0} pasos · ${r.active_minutes ?? 0} min activos`,
  },
};

/**
 * Panel unificado de lecturas BLE pendientes de revisión clínica
 * (presión, SpO₂, temperatura, actividad). Solo se renderiza si hay pendientes.
 */
export function PendingReviewsPanel({ patientId }: { patientId: string }) {
  const q = useBlePendingReview(patientId);
  const review = useReviewReading();

  if (!q.data || q.data.length === 0) return null;

  const act = async (kind: PendingReviewKind, id: string, action: "validate" | "discard") => {
    try {
      await review.mutateAsync({ kind, id, action });
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
          {q.data.map((r: any) => {
            const meta = KIND_META[r.kind as PendingReviewKind];
            const Icon = meta.icon;
            return (
              <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between rounded-lg border border-border p-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">{meta.label}:</span> {meta.format(r)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.taken_at ?? r.fecha ?? r.created_at).toLocaleString()} · {r.device_name ?? "dispositivo BLE"}
                      <Badge variant="outline" className="ml-2">BLE</Badge>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => act(r.kind, r.id, "validate")} disabled={review.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Validar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act(r.kind, r.id, "discard")} disabled={review.isPending}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}