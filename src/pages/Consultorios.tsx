import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Star } from "lucide-react";
import { useMyProfessionalProfile, useSaveLocation, useDeleteLocation } from "@/hooks/useMyProfessionalProfile";
import { useActiveLocation } from "@/contexts/ActiveLocationContext";

export default function Consultorios() {
  const { data: profile } = useMyProfessionalProfile();
  const save = useSaveLocation();
  const del = useDeleteLocation();
  const { activeLocationId, setActiveLocationId } = useActiveLocation();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const locations = profile?.professional_locations ?? [];

  function newLoc() { setEditing({}); setOpen(true); }
  function edit(l: any) { setEditing(l); setOpen(true); }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Mis consultorios
          </h1>
          <p className="text-sm text-muted-foreground">Gestiona todas tus sedes y activa la que estás atendiendo.</p>
        </div>
        {profile && (
          <Button size="sm" onClick={newLoc}><Plus className="h-4 w-4 mr-1" /> Nueva sede</Button>
        )}
      </header>

      {!profile && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          Primero completa tu perfil profesional en <a className="text-primary underline" href="/medico/perfil">Mi perfil profesional</a>.
        </CardContent></Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {locations.map((l: any) => (
          <Card key={l.id} className={activeLocationId === l.id ? "border-primary" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {l.nombre ?? "Consultorio"}
                {l.es_principal && <Badge variant="secondary" className="text-[10px]"><Star className="h-3 w-3 mr-0.5" /> Principal</Badge>}
                {activeLocationId === l.id && <Badge className="text-[10px]">Activo</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {l.direccion && <p>{l.direccion}</p>}
              {(l.ciudad || l.estado) && <p className="text-muted-foreground">{[l.ciudad, l.estado].filter(Boolean).join(", ")}</p>}
              {l.telefono && <p className="text-muted-foreground">📞 {l.telefono}</p>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setActiveLocationId(l.id)} disabled={activeLocationId === l.id}>
                  {activeLocationId === l.id ? "En uso" : "Usar ahora"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => edit(l)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (confirm("¿Eliminar esta sede?")) del.mutate(l.id);
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {open && editing && (
        <LocDialog
          initial={editing}
          professionalId={profile?.id}
          onClose={() => setOpen(false)}
          onSubmit={async (v) => { await save.mutateAsync(v); setOpen(false); }}
        />
      )}
    </div>
  );
}

function LocDialog({ initial, professionalId, onClose, onSubmit }: {
  initial: any; professionalId: string | undefined;
  onClose: () => void; onSubmit: (v: any) => Promise<void>;
}) {
  const [f, setF] = useState({
    id: initial.id,
    professional_id: initial.professional_id ?? professionalId,
    nombre: initial.nombre ?? "",
    direccion: initial.direccion ?? "",
    ciudad: initial.ciudad ?? "",
    estado: initial.estado ?? "",
    cp: initial.cp ?? "",
    telefono: initial.telefono ?? "",
    es_principal: initial.es_principal ?? false,
    activo: initial.activo ?? true,
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial.id ? "Editar consultorio" : "Nuevo consultorio"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Nombre</Label><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
          <div className="col-span-2"><Label>Dirección</Label><Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></div>
          <div><Label>Ciudad</Label><Input value={f.ciudad} onChange={(e) => setF({ ...f, ciudad: e.target.value })} /></div>
          <div><Label>Estado</Label><Input value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })} /></div>
          <div><Label>CP</Label><Input value={f.cp} onChange={(e) => setF({ ...f, cp: e.target.value })} /></div>
          <div><Label>Teléfono</Label><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.es_principal} onChange={(e) => setF({ ...f, es_principal: e.target.checked })} />
            Marcar como sede principal
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSubmit(f)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}