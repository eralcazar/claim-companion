import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useFirmas,
  useCreateFirma,
  useDeleteFirma,
  useSetFirmaPredeterminada,
  useUpdateFirma,
} from "@/hooks/useFirmas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import SignatureCanvas from "@/components/claims/forms/shared/SignatureCanvas";
import { Plus, Star, Trash2, ArrowLeft, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function FirmasManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: firmas = [], isLoading } = useFirmas(user?.id);
  const createMut = useCreateFirma(user?.id);
  const deleteMut = useDeleteFirma(user?.id);
  const setDefaultMut = useSetFirmaPredeterminada(user?.id);
  const updateMut = useUpdateFirma(user?.id);

  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [imagen, setImagen] = useState("");
  const [esPred, setEsPred] = useState(false);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [toDelete, setToDelete] = useState<string | null>(null);

  const reset = () => {
    setNombre("");
    setImagen("");
    setEsPred(false);
  };

  const handleCreate = async () => {
    if (!nombre.trim()) {
      toast.error("Indica un nombre para la firma");
      return;
    }
    if (!imagen) {
      toast.error("Captura tu firma antes de guardar");
      return;
    }
    await createMut.mutateAsync({
      nombre: nombre.trim(),
      imagen_base64: imagen,
      es_predeterminada: esPred || firmas.length === 0,
    });
    reset();
    setOpen(false);
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-heading text-2xl font-bold">Mis firmas</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Administra las firmas electrónicas que usarás para firmar reclamos. Sólo
        puede haber una firma predeterminada.
      </p>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Nueva firma
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva firma</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nombre</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Firma personal"
              />
            </div>
            <SignatureCanvas
              value={imagen}
              onChange={setImagen}
              label="Dibuja tu firma"
              height={170}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="es_pred"
                checked={esPred}
                onCheckedChange={(v) => setEsPred(!!v)}
              />
              <Label htmlFor="es_pred" className="text-sm">
                Marcar como predeterminada
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "Guardando..." : "Guardar firma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Cargando firmas...
        </p>
      )}

      {!isLoading && firmas.length === 0 && (
        <Card>
          <CardContent className="text-center py-12 text-sm text-muted-foreground">
            Aún no tienes firmas. Crea la primera con el botón superior.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {firmas.map((f) => (
          <Card key={f.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                {f.nombre}
                {f.es_predeterminada && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Predeterminada
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-1">
                {!f.es_predeterminada && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Marcar como predeterminada"
                    onClick={() => setDefaultMut.mutate(f.id)}
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="Renombrar"
                  onClick={() => {
                    setRenameId(f.id);
                    setRenameValue(f.nombre);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  title="Eliminar"
                  onClick={() => setToDelete(f.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-background p-2 flex items-center justify-center">
                <img
                  src={f.imagen_base64}
                  alt={f.nombre}
                  className="max-h-32 object-contain"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!renameId}
        onOpenChange={(v) => { if (!v) { setRenameId(null); setRenameValue(""); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Renombrar firma</DialogTitle></DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nuevo nombre"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!renameId || !renameValue.trim()) return;
                await updateMut.mutateAsync({ id: renameId, nombre: renameValue.trim() });
                setRenameId(null);
                setRenameValue("");
              }}
              disabled={updateMut.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar firma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) deleteMut.mutate(toDelete);
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