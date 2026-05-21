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
import { classifyGlucose, useDeleteGlucose, useGlucoseReadings } from "@/hooks/useGlucose";

const CTX_LABELS: Record<string, string> = {
  ayuno: "Ayuno", pre_comida: "Pre comida", postprandial: "Postprandial", aleatoria: "Aleatoria",
};

export function GlucoseList({ patientId }: { patientId: string }) {
  const { data, isLoading } = useGlucoseReadings(patientId);
  const del = useDeleteGlucose();
  const [pending, setPending] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Cargando lecturas...</p>;
  if (!data || data.length === 0) return <p className="text-muted-foreground">Aún no hay lecturas de glucosa registradas.</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Glucosa</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => {
              const cat = classifyGlucose(r.glucose_mgdl, r.measurement_context);
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(r.taken_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="font-semibold">{r.glucose_mgdl} mg/dL</TableCell>
                  <TableCell>{CTX_LABELS[r.measurement_context] ?? r.measurement_context}</TableCell>
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