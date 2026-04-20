import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEspecialidades,
  useUpsertEspecialidad,
  useDeleteEspecialidad,
} from "@/hooks/useEspecialidades";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, Save } from "lucide-react";

export default function EspecialidadesCatalog() {
  const { roles } = useAuth();
  const { data: especialidades = [] } = useEspecialidades();
  const upsert = useUpsertEspecialidad();
  const del = useDeleteEspecialidad();
  const [newName, setNewName] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);

  if (!roles.includes("admin")) return <Navigate to="/" replace />;

  const handleAdd = () => {
    const nombre = newName.trim();
    if (!nombre) return;
    upsert.mutate({ nombre, activa: true });
    setNewName("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de Especialidades</h1>
        <p className="text-sm text-muted-foreground">
          Especialidades médicas disponibles para asignar a los doctores.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nueva especialidad (ej. Cardiología)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || upsert.isPending}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-32">Activa</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {especialidades.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Sin especialidades. Agrega la primera arriba.
                </TableCell>
              </TableRow>
            )}
            {especialidades.map((e) => (
              <EspecialidadRow
                key={e.id}
                e={e}
                onSave={(payload) => upsert.mutate(payload)}
                onDelete={() => setToDelete(e.id)}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar especialidad?</AlertDialogTitle>
            <AlertDialogDescription>
              No podrás eliminarla si está asignada a algún médico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) del.mutate(toDelete);
                setToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EspecialidadRow({
  e,
  onSave,
  onDelete,
}: {
  e: { id: string; nombre: string; activa: boolean };
  onSave: (payload: { id: string; nombre: string; activa: boolean }) => void;
  onDelete: () => void;
}) {
  const [nombre, setNombre] = useState(e.nombre);
  const [activa, setActiva] = useState(e.activa);
  const dirty = nombre !== e.nombre || activa !== e.activa;

  return (
    <TableRow>
      <TableCell>
        <Input value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
      </TableCell>
      <TableCell>
        <Switch checked={activa} onCheckedChange={setActiva} />
      </TableCell>
      <TableCell className="text-right space-x-1">
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave({ id: e.id, nombre, activa })}
          >
            <Save className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}