import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  useBulkDeleteSecciones,
} from "@/hooks/useFormatos";

interface Props {
  formularioId: string;
  secciones: Seccion[];
}

export function SectionsList({ formularioId, secciones }: Props) {
  const upsert = useUpsertSeccion(formularioId);
  const remove = useDeleteSeccion(formularioId);
  const bulkRemove = useBulkDeleteSecciones(formularioId);
  const [editing, setEditing] = useState<Record<string, Partial<Seccion>>>({});
  const [newName, setNewName] = useState("");
  const [toDelete, setToDelete] = useState<Seccion | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  useEffect(() => {
    setSelected(new Set());
  }, [secciones]);

  const allSelected = secciones.length > 0 && secciones.every((s) => selected.has(s.id));
  const toggleAll = (v: boolean) => {
    setSelected(v ? new Set(secciones.map((s) => s.id)) : new Set());
  };
  const toggleOne = (id: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  };

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
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Nombre de nueva sección…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNew()}
          className="flex-1 min-w-[200px]"
        />
        <Button onClick={addNew} disabled={!newName.trim()}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            onClick={() => setBulkConfirm(true)}
            disabled={bulkRemove.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar ({selected.size})
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(!!v)}
                  aria-label="Seleccionar todas"
                />
              </TableHead>
              <TableHead className="w-16">Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-20">Página</TableHead>
              <TableHead className="w-44">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Sin secciones
                </TableCell>
              </TableRow>
            )}
            {secciones.map((s) => {
              const e = editing[s.id] ?? {};
              const isDirty = Object.keys(e).length > 0;
              const isSelected = selected.has(s.id);
              return (
                <TableRow key={s.id} className={isSelected ? "bg-primary/5" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v) => toggleOne(s.id, !!v)}
                      aria-label={`Seleccionar ${s.nombre}`}
                    />
                  </TableCell>
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isDirty}
                        onClick={() => saveRow(s)}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Modificar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setToDelete(s)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Eliminar
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

      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selected.size} secciones?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los campos asignados quedarán sin sección.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkRemove.mutate(Array.from(selected));
                setSelected(new Set());
                setBulkConfirm(false);
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