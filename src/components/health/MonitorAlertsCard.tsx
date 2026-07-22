import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertTriangle, Info } from "lucide-react";
import type { MonitorAlert } from "@/hooks/useMonitorHealth";

export function MonitorAlertsCard({ alerts }: { alerts: MonitorAlert[] }) {
  if (!alerts.length) return null;
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Alertas del monitor
          <Badge variant="outline">{alerts.length}</Badge>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {alerts.map((a) => (
            <AccordionItem key={a.id} value={a.id}>
              <AccordionTrigger className="text-left text-sm">
                <span className="flex items-center gap-2">
                  {a.severity === "warning"
                    ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    : <Info className="h-3.5 w-3.5 text-blue-600" />}
                  {a.title}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs space-y-2">
                <p className="text-muted-foreground">{a.detail}</p>
                <ol className="list-decimal ml-5 space-y-0.5">
                  {a.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}