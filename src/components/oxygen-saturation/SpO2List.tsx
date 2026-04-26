import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  classifySpO2,
  useDeleteSpO2,
  useSpO2Readings,
} from "@/hooks/useOxygenSaturation";

const CONTEXT_LABELS: Record<string, string> = {
  reposo: "En reposo",
  actividad: "Durante actividad",
  post_actividad: "Post actividad",
  sueno: "Durante el sueño",
  otro: "Otro",
};

export function SpO2List() {
  const { user } = useAuth();
  const { data, isLoading } = useSpO2Readings(user?.id);
  const del = useDeleteSpO2();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando lecturas...</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-muted-foreground">Aún no tienes lecturas registradas.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>SpO2</TableHead>
              <TableHead>Pulso</TableHead>
              <TableHead>Contexto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => {
              const cat = classifySpO2(r.spo2);
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(r.taken_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="font-semibold">{r.spo2}%</TableCell>
                  <TableCell>{r.pulse ?? "—"}</TableCell>
                  <TableCell>{r.context ? (CONTEXT_LABELS[r.context] ?? r.context) : "—"}</TableCell>
                  <TableCell>
                    <Badge className={cat.className}>{cat.label}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPendingDelete(r.id)}
                      aria-label="Eliminar lectura"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta lectura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDelete || !user) return;
                await del.mutateAsync({ id: pendingDelete, patient_id: user.id });
                setPendingDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}