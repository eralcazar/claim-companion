import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, FileDown } from "lucide-react";
import type { RowError } from "@/lib/ejercicios/importParsers";

export function ImportReport({
  okCount,
  errors,
  onDownloadErrors,
  onFixAndRetry,
}: {
  okCount: number;
  errors: RowError[];
  onDownloadErrors: () => void;
  onFixAndRetry?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Reporte de importación</CardTitle>
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {okCount} ok</Badge>
          {errors.length > 0 && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {errors.length} con error</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errors.length === 0 ? (
          <div className="text-sm text-emerald-600">Sin errores. Todo listo.</div>
        ) : (
          <>
            <div className="max-h-72 overflow-y-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Fila</th>
                    <th className="text-left p-2">Campo</th>
                    <th className="text-left p-2">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(0, 200).map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{e.row}</td>
                      <td className="p-2">{e.field ?? "-"}</td>
                      <td className="p-2">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errors.length > 200 && (
                <div className="p-2 text-xs text-muted-foreground">Mostrando 200 de {errors.length}.</div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onDownloadErrors} className="gap-1">
                <FileDown className="h-4 w-4" /> Descargar CSV de errores
              </Button>
              {onFixAndRetry && <Button size="sm" onClick={onFixAndRetry}>Reintentar</Button>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}