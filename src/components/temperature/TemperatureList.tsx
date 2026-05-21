import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { classifyTemperature, useDeleteTemperature, useTemperatureReadings } from "@/hooks/useTemperature";

const METHOD_LABELS: Record<string, string> = {
  axilar: "Axilar", oral: "Oral", timpanica: "Timpánica", frontal: "Frontal", rectal: "Rectal",
};

export function TemperatureList({ patientId }: { patientId: string }) {
  const { data, isLoading } = useTemperatureReadings(patientId);
  const del = useDeleteTemperature();
  const [pending, setPending] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Cargando lecturas...</p>;
  if (!data || data.length === 0) return <p className="text-muted-foreground">Aún no hay lecturas de temperatura registradas.</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Temperatura</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => {
              const cat = classifyTemperature(Number(r.temperature_c));
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(r.taken_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="font-semibold">{Number(r.temperature_c).toFixed(1)}°C</TableCell>
                  <TableCell>{r.method ? (METHOD_LABELS[r.method] ?? r.method) : "—"}</TableCell>
                  <TableCell><Badge className={cat.className}>{cat.label}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setPending(r.id)} aria-label="Eliminar lectura">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta lectura?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!pending) return;
              await del.mutateAsync({ id: pending, patient_id: patientId });
              setPending(null);
            }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}