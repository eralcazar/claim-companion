import { useEffect, useState } from "react";
import {
  useMedicoByUser,
  useMedicoEspecialidades,
  useMedicoDocumentos,
  useUpsertMedico,
  useAddMedicoEspecialidad,
  useUpdateMedicoEspecialidad,
  useRemoveMedicoEspecialidad,
  useUploadMedicoDocumento,
  useDeleteMedicoDocumento,
  getMedicoDocSignedUrl,
} from "@/hooks/useMedicos";
import { useEspecialidades } from "@/hooks/useEspecialidades";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Save, Plus, Trash2, Upload, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  displayName?: string;
}

export function MedicoEditor({ userId, displayName }: Props) {
  const { data: medico } = useMedicoByUser(userId);
  const { data: especialidades = [] } = useEspecialidades();
  const { data: medicoEsps = [] } = useMedicoEspecialidades(medico?.id ?? null);
  const { data: documentos = [] } = useMedicoDocumentos(medico?.id ?? null);

  const upsert = useUpsertMedico();
  const addEsp = useAddMedicoEspecialidad();
  const updEsp = useUpdateMedicoEspecialidad();
  const rmEsp = useRemoveMedicoEspecialidad();
  const uploadDoc = useUploadMedicoDocumento();
  const delDoc = useDeleteMedicoDocumento();

  const [form, setForm] = useState({
    cedula_general: "",
    telefono_consultorio: "",
    direccion_consultorio: "",
    nombre_consultorio: "",
    email_consultorio: "",
    horario_atencion: "",
    consultorio_calle: "",
    consultorio_numero: "",
    consultorio_colonia: "",
    consultorio_cp: "",
    consultorio_municipio: "",
    consultorio_estado: "",
    foto_path: "",
  });
  const [newEspId, setNewEspId] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<typeof documentos[number] | null>(
    null
  );

  useEffect(() => {
    if (medico) {
      setForm({
        cedula_general: medico.cedula_general ?? "",
        telefono_consultorio: medico.telefono_consultorio ?? "",
        direccion_consultorio: medico.direccion_consultorio ?? "",
        nombre_consultorio: medico.nombre_consultorio ?? "",
        email_consultorio: medico.email_consultorio ?? "",
        horario_atencion: medico.horario_atencion ?? "",
        consultorio_calle: medico.consultorio_calle ?? "",
        consultorio_numero: medico.consultorio_numero ?? "",
        consultorio_colonia: medico.consultorio_colonia ?? "",
        consultorio_cp: medico.consultorio_cp ?? "",
        consultorio_municipio: medico.consultorio_municipio ?? "",
        consultorio_estado: medico.consultorio_estado ?? "",
        foto_path: medico.foto_path ?? "",
      });
      if (medico.foto_path) {
        supabase.storage.from("medicos").createSignedUrl(medico.foto_path, 3600)
          .then(({ data }) => setFotoUrl(data?.signedUrl ?? null));
      } else {
        setFotoUrl(null);
      }
    }
  }, [medico?.id]);

  const handleSave = async () => {
    await upsert.mutateAsync({ user_id: userId, ...form });
  };

  const handleFotoUpload = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/foto-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("medicos")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    setForm((prev) => ({ ...prev, foto_path: path }));
    await upsert.mutateAsync({ user_id: userId, ...form, foto_path: path });
    const { data } = await supabase.storage.from("medicos").createSignedUrl(path, 3600);
    setFotoUrl(data?.signedUrl ?? null);
    toast.success("Foto actualizada");
  };

  const handleAddEsp = async () => {
    if (!medico?.id) {
      toast.error("Primero guarda los datos generales del médico");
      return;
    }
    if (!newEspId) return;
    if (medicoEsps.some((e) => e.especialidad_id === newEspId)) {
      toast.error("Ya tiene esa especialidad");
      return;
    }
    await addEsp.mutateAsync({
      medico_id: medico.id,
      especialidad_id: newEspId,
      cedula_especialidad: null,
    });
    setNewEspId("");
  };

  const handleUpload = async (
    file: File,
    tipo: string,
    especialidad_id?: string | null
  ) => {
    if (!medico?.id) {
      toast.error("Primero guarda los datos generales del médico");
      return;
    }
    await uploadDoc.mutateAsync({
      medico_id: medico.id,
      tipo,
      especialidad_id,
      file,
    });
  };

  const handleDownload = async (path: string) => {
    try {
      const url = await getMedicoDocSignedUrl(path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Error al abrir");
    }
  };

  const especialidadName = (id: string | null) =>
    id ? especialidades.find((e) => e.id === id)?.nombre ?? "—" : "—";

  return (
    <div className="space-y-4">
      {displayName && (
        <div className="text-sm text-muted-foreground">
          Editando: <span className="font-medium text-foreground">{displayName}</span>
        </div>
      )}

      {/* Datos generales */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Datos profesionales</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Cédula general</Label>
            <Input
              value={form.cedula_general}
              onChange={(e) =>
                setForm({ ...form, cedula_general: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono consultorio</Label>
            <Input
              value={form.telefono_consultorio}
              onChange={(e) =>
                setForm({ ...form, telefono_consultorio: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Dirección consultorio</Label>
            <Input
              value={form.direccion_consultorio}
              onChange={(e) =>
                setForm({ ...form, direccion_consultorio: e.target.value })
              }
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending}>
          <Save className="h-4 w-4" />
          Guardar datos
        </Button>
      </Card>

      {/* Consultorio */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Consultorio</h3>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto del médico" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Sin foto</span>
              )}
            </div>
            <label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFotoUpload(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button variant="outline" size="sm" asChild type="button">
                <span>
                  <Upload className="h-3.5 w-3.5" />
                  Subir foto
                </span>
              </Button>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2 flex-1 min-w-[280px]">
            <div className="space-y-1.5">
              <Label>Nombre del consultorio</Label>
              <Input value={form.nombre_consultorio} onChange={(e) => setForm({ ...form, nombre_consultorio: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email del consultorio</Label>
              <Input type="email" value={form.email_consultorio} onChange={(e) => setForm({ ...form, email_consultorio: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Horario de atención</Label>
              <Input placeholder="Ej: Lun-Vie 9:00-18:00" value={form.horario_atencion} onChange={(e) => setForm({ ...form, horario_atencion: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Calle</Label>
              <Input value={form.consultorio_calle} onChange={(e) => setForm({ ...form, consultorio_calle: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={form.consultorio_numero} onChange={(e) => setForm({ ...form, consultorio_numero: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Colonia</Label>
              <Input value={form.consultorio_colonia} onChange={(e) => setForm({ ...form, consultorio_colonia: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>CP</Label>
              <Input value={form.consultorio_cp} onChange={(e) => setForm({ ...form, consultorio_cp: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Municipio</Label>
              <Input value={form.consultorio_municipio} onChange={(e) => setForm({ ...form, consultorio_municipio: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={form.consultorio_estado} onChange={(e) => setForm({ ...form, consultorio_estado: e.target.value })} />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending}>
          <Save className="h-4 w-4" />
          Guardar consultorio
        </Button>
      </Card>

      {/* Especialidades */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Especialidades</h3>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <Label>Agregar especialidad</Label>
            <Select value={newEspId} onValueChange={setNewEspId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una especialidad" />
              </SelectTrigger>
              <SelectContent>
                {especialidades
                  .filter((e) => e.activa)
                  .filter(
                    (e) => !medicoEsps.some((me) => me.especialidad_id === e.id)
                  )
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddEsp}
            disabled={!newEspId || addEsp.isPending}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        {medicoEsps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin especialidades asignadas.
          </p>
        ) : (
          <div className="space-y-2">
            {medicoEsps.map((me) => (
              <div
                key={me.id}
                className="flex flex-wrap items-center gap-2 border rounded-md p-2"
              >
                <Badge variant="secondary" className="text-sm">
                  {especialidadName(me.especialidad_id)}
                </Badge>
                <Input
                  className="flex-1 min-w-[180px] h-8 text-sm"
                  placeholder="Cédula de especialidad"
                  defaultValue={me.cedula_especialidad ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== (me.cedula_especialidad ?? null)) {
                      updEsp.mutate({
                        id: me.id,
                        medico_id: me.medico_id,
                        cedula_especialidad: v,
                      });
                    }
                  }}
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        handleUpload(f, "cedula_especialidad", me.especialidad_id);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    type="button"
                  >
                    <span>
                      <Upload className="h-3.5 w-3.5" />
                      Cédula
                    </span>
                  </Button>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    rmEsp.mutate({ id: me.id, medico_id: me.medico_id })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Documentos */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Documentos</h3>
        <div className="flex flex-wrap gap-2">
          <label>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, "ine");
                e.currentTarget.value = "";
              }}
            />
            <Button variant="outline" size="sm" asChild type="button">
              <span>
                <Upload className="h-3.5 w-3.5" />
                Subir INE
              </span>
            </Button>
          </label>
          <label>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, "cedula_general");
                e.currentTarget.value = "";
              }}
            />
            <Button variant="outline" size="sm" asChild type="button">
              <span>
                <Upload className="h-3.5 w-3.5" />
                Subir cédula general
              </span>
            </Button>
          </label>
        </div>

        {documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin documentos.</p>
        ) : (
          <div className="space-y-1">
            {documentos.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 px-2 py-1.5 border rounded-md text-sm"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{d.file_name}</span>
                <Badge variant="outline" className="text-xs">
                  {d.tipo}
                  {d.especialidad_id && ` · ${especialidadName(d.especialidad_id)}`}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleDownload(d.file_path)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => setDocToDelete(d)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog
        open={!!docToDelete}
        onOpenChange={(o) => !o && setDocToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              {docToDelete?.file_name} — esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (docToDelete) delDoc.mutate(docToDelete);
                setDocToDelete(null);
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