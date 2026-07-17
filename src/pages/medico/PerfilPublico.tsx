import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, MapPin, Plus, Send, Trash2, Undo2, AlertCircle } from "lucide-react";
import {
  useCreateMyProfile,
  useDeleteLocation,
  useMyProfessionalProfile,
  useSaveLocation,
  useSetSpecialties,
  useSubmitForReview,
  useUpdateMyProfile,
  useWithdrawProfile,
} from "@/hooks/useMyProfessionalProfile";
import { useSpecialties } from "@/hooks/useMarketplace";

const TIPOS = [
  { v: "medico", l: "Médico" },
  { v: "enfermero", l: "Enfermero" },
  { v: "nutricionista", l: "Nutricionista" },
  { v: "psicologo", l: "Psicólogo" },
  { v: "dentista", l: "Dentista" },
  { v: "laboratorio", l: "Laboratorio" },
  { v: "farmacia", l: "Farmacia" },
];

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  borrador: { label: "Borrador", color: "bg-muted text-muted-foreground" },
  pendiente: { label: "Pendiente de revisión", color: "bg-amber-500/15 text-amber-600" },
  publicado: { label: "Publicado", color: "bg-emerald-500/15 text-emerald-600" },
  rechazado: { label: "Rechazado", color: "bg-destructive/15 text-destructive" },
};

export default function PerfilPublico() {
  useEffect(() => {
    document.title = "Mi perfil público | CareCentral";
  }, []);

  const { data: profile, isLoading } = useMyProfessionalProfile();
  const create = useCreateMyProfile();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return <CreateProfileCard onCreate={(x) => create.mutate(x)} loading={create.isPending} />;

  return <ProfileEditor profile={profile} />;
}

function CreateProfileCard({
  onCreate,
  loading,
}: {
  onCreate: (v: { display_name: string; tipo: string }) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [tipo, setTipo] = useState("medico");
  return (
    <div className="mx-auto max-w-xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Crea tu perfil público</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aparecerás en el buscador de especialistas de CareCentral una vez publicado por un administrador.
          </p>
          <div className="space-y-2">
            <Label>Nombre a mostrar</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dra. Ana Ruiz" />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || loading}
            onClick={() => onCreate({ display_name: name.trim(), tipo })}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Crear borrador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileEditor({ profile }: { profile: any }) {
  const update = useUpdateMyProfile();
  const submit = useSubmitForReview();
  const withdraw = useWithdrawProfile();

  const [form, setForm] = useState({
    display_name: profile.display_name ?? "",
    titulo: profile.titulo ?? "",
    tipo: profile.tipo ?? "medico",
    bio: profile.bio ?? "",
    foto_url: profile.foto_url ?? "",
    cedula_profesional: profile.cedula_profesional ?? "",
    anos_experiencia: profile.anos_experiencia ?? "",
    precio_consulta_centavos: profile.precio_consulta_centavos ?? "",
    telefono_publico: profile.telefono_publico ?? "",
    whatsapp_publico: profile.whatsapp_publico ?? "",
    website: profile.website ?? "",
    acepta_video: !!profile.acepta_video,
    acepta_domicilio: !!profile.acepta_domicilio,
    acepta_presencial: !!profile.acepta_presencial,
  });

  const isBorradorOrRechazado = profile.estado_publicacion === "borrador" || profile.estado_publicacion === "rechazado";

  const estado = ESTADO_LABEL[profile.estado_publicacion] ?? ESTADO_LABEL.borrador;

  const save = () => {
    update.mutate({
      id: profile.id,
      patch: {
        display_name: form.display_name.trim(),
        titulo: form.titulo || null,
        tipo: form.tipo,
        bio: form.bio || null,
        foto_url: form.foto_url || null,
        cedula_profesional: form.cedula_profesional || null,
        anos_experiencia: form.anos_experiencia === "" ? null : Number(form.anos_experiencia),
        precio_consulta_centavos:
          form.precio_consulta_centavos === "" ? null : Math.round(Number(form.precio_consulta_centavos) * 100),
        telefono_publico: form.telefono_publico || null,
        whatsapp_publico: form.whatsapp_publico || null,
        website: form.website || null,
        acepta_video: form.acepta_video,
        acepta_domicilio: form.acepta_domicilio,
        acepta_presencial: form.acepta_presencial,
      } as any,
    });
  };

  const canSubmit =
    isBorradorOrRechazado &&
    !!form.display_name.trim() &&
    !!profile.cedula_profesional &&
    (profile.professional_locations?.length ?? 0) > 0 &&
    (profile.professional_specialties?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mi perfil público</h1>
          <p className="text-sm text-muted-foreground">/{profile.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={estado.color} variant="secondary">{estado.label}</Badge>
          {profile.verificado && <Badge className="bg-primary/15 text-primary">Verificado</Badge>}
          {profile.estado_publicacion === "pendiente" && (
            <Button size="sm" variant="outline" onClick={() => withdraw.mutate(profile.id)}>
              <Undo2 className="mr-2 h-4 w-4" /> Retirar
            </Button>
          )}
          <Button size="sm" disabled={!canSubmit || submit.isPending} onClick={() => submit.mutate(profile.id)}>
            <Send className="mr-2 h-4 w-4" /> Enviar a revisión
          </Button>
        </div>
      </header>

      {profile.estado_publicacion === "rechazado" && profile.motivo_rechazo && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Perfil rechazado</AlertTitle>
          <AlertDescription>{profile.motivo_rechazo}</AlertDescription>
        </Alert>
      )}
      {!canSubmit && isBorradorOrRechazado && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Requisitos para publicar</AlertTitle>
          <AlertDescription>
            Debes tener nombre, cédula profesional, al menos 1 especialidad y 1 ubicación.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
          <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="space-y-3">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <Field label="Nombre a mostrar">
                <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </Field>
              <Field label="Título">
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Dr., Lic., MSc..." />
              </Field>
              <Field label="Tipo">
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Cédula profesional">
                <Input value={form.cedula_profesional} onChange={(e) => setForm({ ...form, cedula_profesional: e.target.value })} />
              </Field>
              <Field label="Años de experiencia">
                <Input type="number" value={form.anos_experiencia} onChange={(e) => setForm({ ...form, anos_experiencia: e.target.value })} />
              </Field>
              <Field label="Precio consulta (MXN)">
                <Input type="number" value={form.precio_consulta_centavos ? Number(form.precio_consulta_centavos) / 100 : ""} onChange={(e) => setForm({ ...form, precio_consulta_centavos: e.target.value === "" ? "" : Number(e.target.value) * 100 })} />
              </Field>
              <Field label="Foto (URL)">
                <Input value={form.foto_url} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} />
              </Field>
              <Field label="Website">
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </Field>
              <Field label="Teléfono público">
                <Input value={form.telefono_publico} onChange={(e) => setForm({ ...form, telefono_publico: e.target.value })} />
              </Field>
              <Field label="WhatsApp público">
                <Input value={form.whatsapp_publico} onChange={(e) => setForm({ ...form, whatsapp_publico: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Label className="mb-2 block">Biografía</Label>
                <Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-6">
                <ToggleRow label="Presencial" checked={form.acepta_presencial} onChange={(v) => setForm({ ...form, acepta_presencial: v })} />
                <ToggleRow label="Video consulta" checked={form.acepta_video} onChange={(v) => setForm({ ...form, acepta_video: v })} />
                <ToggleRow label="Domicilio" checked={form.acepta_domicilio} onChange={(v) => setForm({ ...form, acepta_domicilio: v })} />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button onClick={save} disabled={update.isPending}>
                  {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="especialidades">
          <SpecialtiesEditor profile={profile} />
        </TabsContent>

        <TabsContent value="ubicaciones">
          <LocationsEditor profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label>{label}</Label>
    </div>
  );
}

function SpecialtiesEditor({ profile }: { profile: any }) {
  const { data: all = [] } = useSpecialties();
  const setMut = useSetSpecialties();
  const current: { specialty_id: string; es_principal: boolean }[] = profile.professional_specialties ?? [];
  const [selected, setSelected] = useState<string[]>(current.map((c) => c.specialty_id));
  const [principal, setPrincipal] = useState<string | null>(current.find((c) => c.es_principal)?.specialty_id ?? null);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <Card>
      <CardHeader><CardTitle>Especialidades</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 max-h-[50vh] overflow-y-auto">
          {all.map((s) => {
            const checked = selected.includes(s.id);
            return (
              <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
                <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
                <span className="flex-1 text-sm">{s.nombre}</span>
                {checked && (
                  <button
                    onClick={() => setPrincipal(s.id)}
                    className={`text-xs rounded px-2 py-0.5 ${principal === s.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {principal === s.id ? "Principal" : "Marcar principal"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => setMut.mutate({ professionalId: profile.id, specialtyIds: selected, principalId: principal })}
            disabled={setMut.isPending}
          >
            {setMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar especialidades
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LocationsEditor({ profile }: { profile: any }) {
  const save = useSaveLocation();
  const del = useDeleteLocation();
  const [editing, setEditing] = useState<any | null>(null);
  const locs = profile.professional_locations ?? [];

  const empty = { professional_id: profile.id, nombre: "", direccion: "", ciudad: "", estado: "", cp: "", telefono: "", es_principal: false, activo: true };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Ubicaciones</CardTitle>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing({ ...empty })}>
              <Plus className="mr-2 h-4 w-4" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nueva"} ubicación</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <Field label="Nombre del lugar"><Input value={editing.nombre} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} /></Field>
                <Field label="Dirección"><Input value={editing.direccion} onChange={(e) => setEditing({ ...editing, direccion: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ciudad"><Input value={editing.ciudad} onChange={(e) => setEditing({ ...editing, ciudad: e.target.value })} /></Field>
                  <Field label="Estado"><Input value={editing.estado ?? ""} onChange={(e) => setEditing({ ...editing, estado: e.target.value })} /></Field>
                  <Field label="CP"><Input value={editing.cp ?? ""} onChange={(e) => setEditing({ ...editing, cp: e.target.value })} /></Field>
                  <Field label="Teléfono"><Input value={editing.telefono ?? ""} onChange={(e) => setEditing({ ...editing, telefono: e.target.value })} /></Field>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!editing.es_principal} onCheckedChange={(v) => setEditing({ ...editing, es_principal: v })} />
                  <Label>Principal</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!editing?.nombre || !editing?.direccion || !editing?.ciudad) return;
                  save.mutate(editing, { onSuccess: () => setEditing(null) });
                }}
                disabled={save.isPending}
              >Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {locs.length === 0 && <p className="text-sm text-muted-foreground">Sin ubicaciones aún.</p>}
        {locs.map((l: any) => (
          <div key={l.id} className="flex items-start justify-between rounded-md border p-3">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-primary" /> {l.nombre}
                {l.es_principal && <Badge variant="secondary">Principal</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{l.direccion}, {l.ciudad}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(l)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => del.mutate(l.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}