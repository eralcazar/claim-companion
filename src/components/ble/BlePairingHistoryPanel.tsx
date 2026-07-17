import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bluetooth, Copy, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBleConnectionErrors, useBlePairings } from "@/hooks/useBlePairings";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SERVICE_LABEL: Record<string, string> = {
  blood_pressure: "Tensiómetro",
  pulse_oximeter: "Oxímetro",
};

export function BlePairingHistoryPanel({ patientId }: { patientId: string }) {
  const pairings = useBlePairings(patientId);
  const errors = useBleConnectionErrors(patientId, 20);

  const copyDetails = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Detalles copiados al portapapeles");
    } catch { toast.error("No se pudo copiar"); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bluetooth className="h-5 w-5 text-primary" /> Historial de dispositivos BLE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pairings.isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (pairings.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay dispositivos emparejados para este paciente.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-left p-2">Dispositivo</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Emparejado</th>
                  <th className="text-left p-2">Última conexión</th>
                  <th className="text-left p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(pairings.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-2">
                      <div className="font-medium">{p.device_name ?? "Sin nombre"}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate max-w-[220px]">{p.external_uuid}</div>
                      {p.model && <div className="text-xs text-muted-foreground">{p.model}</div>}
                    </td>
                    <td className="p-2">{SERVICE_LABEL[p.service_type] ?? p.service_type}</td>
                    <td className="p-2 text-xs">{new Date(p.paired_at).toLocaleString()}</td>
                    <td className="p-2 text-xs">{p.last_connected_at ? new Date(p.last_connected_at).toLocaleString() : "—"}</td>
                    <td className="p-2">
                      {p.last_status === "ok" ? (
                        <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> OK</Badge>
                      ) : p.last_status === "error" ? (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Error</Badge>
                      ) : (
                        <Badge variant="outline">Sin datos</Badge>
                      )}
                      {p.last_error && (
                        <div className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                          <span className="line-clamp-2">{p.last_error}</span>
                          <Button size="sm" variant="ghost" className="h-6 px-2 mt-1 gap-1"
                            onClick={() => copyDetails(`${p.device_name ?? p.external_uuid}\n${p.last_error}\n${p.last_error_at ?? ""}`)}>
                            <Copy className="h-3 w-3" /> Copiar detalles
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(errors.data ?? []).length > 0 && (
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="errors" className="border-none">
              <AccordionTrigger className="px-3 py-2 text-sm">
                Bitácora de errores ({errors.data?.length ?? 0})
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3">
                <ul className="space-y-2">
                  {(errors.data ?? []).map((e) => (
                    <li key={e.id} className="rounded-md border border-border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {SERVICE_LABEL[e.service_type ?? ""] ?? e.service_type ?? "BLE"} · {e.error_code ?? "error"}
                        </span>
                        <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-1">{e.error_message}</div>
                      {e.browser_ua && (
                        <div className="text-muted-foreground truncate mt-1">UA: {e.browser_ua}</div>
                      )}
                      <div className="flex justify-end mt-1">
                        <Button size="sm" variant="ghost" className="h-6 px-2 gap-1"
                          onClick={() => copyDetails(`[${e.created_at}] ${e.error_code ?? ""} ${e.error_message}\nUUID: ${e.external_uuid ?? "-"}\nUA: ${e.browser_ua ?? "-"}`)}>
                          <Copy className="h-3 w-3" /> Copiar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}