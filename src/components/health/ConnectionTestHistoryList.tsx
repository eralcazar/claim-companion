import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Activity, CheckCircle2, HeartPulse, History, Moon, Trash2, Wind, XCircle } from "lucide-react";
import { useConnectionTestHistory, type ConnectionTest } from "@/hooks/useConnectionTestHistory";
import { DownloadConnectionTestPdfButton } from "./WearableConnectionTestPdf";

const METRIC_ICON: Record<string, any> = {
  heart_rate: HeartPulse,
  steps: Activity,
  sleep: Moon,
  spo2: Wind,
};

const METRIC_LABEL: Record<string, string> = {
  heart_rate: "FC",
  steps: "Pasos",
  sleep: "Sueño",
  spo2: "SpO₂",
};

function StatusBadge({ s }: { s: ConnectionTest["overall_status"] }) {
  if (s === "ok") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> OK</Badge>;
  if (s === "partial") return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/40">Parcial</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Falló</Badge>;
}

export function ConnectionTestHistoryList() {
  const { list, remove } = useConnectionTestHistory(50);
  const tests = list.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Historial de pruebas de conexión
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : tests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no ejecutaste una prueba. Corré "Iniciar prueba" para guardar el resultado con fecha, errores y datos detectados por métrica.
          </p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {tests.map((t) => (
              <AccordionItem value={t.id} key={t.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-2 pr-2">
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-medium">
                        {new Date(t.tested_at).toLocaleString("es-MX")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.platform ?? "—"} · {t.trigger}
                        {t.run_id ? " · extendida" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(t.metrics ?? []).map((m) => {
                        const Icon = METRIC_ICON[m.metric] ?? Activity;
                        const color =
                          m.status === "ok"
                            ? "text-emerald-600"
                            : m.status === "warn"
                              ? "text-amber-600"
                              : "text-destructive";
                        return (
                          <span key={m.id} className={`inline-flex items-center ${color}`} title={METRIC_LABEL[m.metric]}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        );
                      })}
                      <StatusBadge s={t.overall_status} />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-1">
                    <ul className="space-y-1">
                      {(t.metrics ?? []).map((m) => {
                        const Icon = METRIC_ICON[m.metric] ?? Activity;
                        return (
                          <li key={m.id} className="rounded border p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 font-medium">
                                <Icon className="h-3.5 w-3.5" /> {METRIC_LABEL[m.metric] ?? m.metric}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {m.status === "ok" ? "Detectado" : m.status === "warn" ? "Sin datos" : "Error"}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Muestras: {m.samples_count}
                              {m.last_value != null && ` · Último valor: ${m.last_value}`}
                              {m.last_at && ` · ${new Date(m.last_at).toLocaleString("es-MX")}`}
                            </div>
                            {m.error_message && (
                              <div className="text-destructive mt-1">
                                {m.error_code ? `[${m.error_code}] ` : ""}{m.error_message}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex gap-2 pt-1">
                      <DownloadConnectionTestPdfButton test={t} />
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Borrar
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}