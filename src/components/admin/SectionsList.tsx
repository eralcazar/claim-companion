import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  type Seccion,
  useDeleteSeccion,
  useUpsertSeccion,
} from "@/hooks/useFormatos";

interface Props {
  formularioId: string;
  secciones: Seccion[];
}

export function SectionsList({ formularioId, secciones }: Props) {
  const upsert = useUpsertSeccion(formularioId);
  const remove = useDeleteSeccion(formularioId);
  const [editing, setEditing] = useState<Record<string, Partial<Seccion>>>({});
  const [newName, setNewName] = useState("");
  const [toDelete, setToDelete] = useState<Seccion | null>(null);

  const setField = (id: string, patch: Partial<Seccion>) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const saveRow = (s: Seccion) => {
    const patch = editing[s.id];
    if (!patch) return;
    upsert.mutate({ ...s, ...patch });
    setEditing((prev) => {
      const { [s.id]: _, ...rest } = prev;
      return rest;
    });
  };

  const addNew = () => {
    if (!newName.trim()) return;
    upsert.mutate({
      formulario_id: formularioId,
      nombre: newName.trim(),
      orden: secciones.length,
      pagina: 1,
    });
    setNewName("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre de nueva sección…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNew()}
        />
        <Button onClick={addNew} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-20">Página</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  Sin secciones
                </TableCell>
              </TableRow>
            )}
            {secciones.map((s) => {
              const e = editing[s.id] ?? {};
              const isDirty = Object.keys(e).length > 0;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Input
                      type="number"
                      value={e.orden ?? s.orden}
                      onChange={(ev) => setField(s.id, { orden: Number(ev.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={e.nombre ?? s.nombre}
                      onChange={(ev) => setField(s.id, { nombre: ev.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={e.pagina ?? s.pagina}
                      onChange={(ev) => setField(s.id, { pagina: Number(ev.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isDirty}
                        onClick={() => saveRow(s)}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setToDelete(s)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sección?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{toDelete?.nombre}". Los campos asignados quedarán sin sección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}