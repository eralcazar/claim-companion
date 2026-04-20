import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listAllFormats,
  getFormDefinition,
  getFormKey,
  checkFormatExists,
} from "@/components/claims/forms/registry";
import { Navigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Row {
  insurer: string;
  formatId: string;
  label: string;
  file: string;
  hasDefinition: boolean;
  hasCoordinates: boolean;
  storageOk: boolean | null; // null = checking
}

export default function PipelineStatus() {
  const { roles } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const all = listAllFormats();
    const initial: Row[] = all.map(({ insurer, format }) => ({
      insurer,
      formatId: format.id,
      label: format.label,
      file: format.file,
      hasDefinition: !!getFormDefinition(insurer, format.id),
      hasCoordinates: !!getFormKey(insurer, format.id),
      storageOk: null,
    }));
    setRows(initial);

    (async () => {
      const checks = await Promise.all(
        initial.map((r) => checkFormatExists(r.insurer, r.formatId))
      );
      setRows(initial.map((r, i) => ({ ...r, storageOk: checks[i] })));
      setLoading(false);
    })();
  }, []);

  if (!roles.includes("admin")) {
    return <Navigate to="/" replace />;
  }

  const okCount = rows.filter((r) => r.storageOk && r.hasCoordinates && r.hasDefinition).length;

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-heading text-2xl font-bold">Estado del Pipeline</h1>
        <Badge variant={okCount === rows.length ? "default" : "secondary"}>
          {okCount} / {rows.length} listos
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Diagnóstico por formato: ¿existe el PDF en Storage? ¿hay coordenadas? ¿hay definición de formulario?
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Verificando Storage..." : "Resultados"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aseguradora</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead className="text-center">Storage</TableHead>
                <TableHead className="text-center">Coordenadas</TableHead>
                <TableHead className="text-center">Definición</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.insurer}_${r.formatId}`}>
                  <TableCell className="font-medium">{r.insurer}</TableCell>
                  <TableCell>{r.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.file}</TableCell>
                  <TableCell className="text-center">
                    <StatusIcon ok={r.storageOk} />
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusIcon ok={r.hasCoordinates} />
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusIcon ok={r.hasDefinition} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Loader2 className="h-4 w-4 animate-spin inline text-muted-foreground" />;
  if (ok) return <CheckCircle2 className="h-4 w-4 inline text-primary" />;
  return <XCircle className="h-4 w-4 inline text-destructive" />;
}