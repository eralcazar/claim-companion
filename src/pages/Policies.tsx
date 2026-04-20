import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Shield, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { ASEGURADORAS, ESTADOS_MX, TIPOS_CONTRATACION } from "@/lib/constants";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";

type PolicyStatus = Database["public"]["Enums"]["policy_status"];

const EMPTY_FORM = {
  company: "METLIFE",
  policy_number: "",
  numero_certificado: "",
  tipo_contratacion: "individual",
  contractor_name: "",
  start_date: "",
  end_date: "",
  status: "activa" as PolicyStatus,
  suma_asegurada: "",
  deducible: "",
  coaseguro_porcentaje: "",
  tope_coaseguro: "",
  observaciones: "",
  // agente
  agente_nombre: "",
  agente_clave: "",
  agente_telefono: "",
  agente_estado: "",
  // titular
  titular_paternal_surname: "",
  titular_maternal_surname: "",
  titular_first_name: "",
  titular_dob: "",
  titular_birth_country: "México",
  titular_birth_state: "",
  titular_nationality: "Mexicana",
  titular_occupation: "",
  titular_rfc: "",
  titular_street: "",
  titular_ext_number: "",
  titular_int_number: "",
  titular_postal_code: "",
  titular_neighborhood: "",
  titular_municipality: "",
  titular_city: "",
  titular_state: "",
  titular_country: "México",
  titular_cell_phone: "",
  titular_landline: "",
  titular_intl_prefix: "",
  titular_email: "",
  titular_auth_contact: false,
};

export default function Policies() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies", effectiveUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!effectiveUserId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        user_id: effectiveUserId!,
        company: form.company,
        policy_number: form.policy_number,
        numero_certificado: form.numero_certificado || null,
        tipo_contratacion: form.tipo_contratacion,
        policy_type: form.tipo_contratacion, // mantener compatibilidad
        contractor_name: form.contractor_name,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
        suma_asegurada: form.suma_asegurada ? parseFloat(form.suma_asegurada) : 0,
        deducible: form.deducible ? parseFloat(form.deducible) : 0,
        coaseguro_porcentaje: form.coaseguro_porcentaje ? parseFloat(form.coaseguro_porcentaje) : 0,
        tope_coaseguro: form.tope_coaseguro ? parseFloat(form.tope_coaseguro) : 0,
        observaciones: form.observaciones || "",
        agente_nombre: form.agente_nombre || null,
        agente_clave: form.agente_clave || null,
        agente_telefono: form.agente_telefono || null,
        agente_estado: form.agente_estado || null,
        titular_paternal_surname: form.titular_paternal_surname,
        titular_maternal_surname: form.titular_maternal_surname,
        titular_first_name: form.titular_first_name,
        titular_dob: form.titular_dob || null,
        titular_birth_country: form.titular_birth_country,
        titular_birth_state: form.titular_birth_state,
        titular_nationality: form.titular_nationality,
        titular_occupation: form.titular_occupation,
        titular_rfc: form.titular_rfc,
        titular_street: form.titular_street,
        titular_ext_number: form.titular_ext_number,
        titular_int_number: form.titular_int_number,
        titular_postal_code: form.titular_postal_code,
        titular_neighborhood: form.titular_neighborhood,
        titular_municipality: form.titular_municipality,
        titular_city: form.titular_city,
        titular_state: form.titular_state,
        titular_country: form.titular_country,
        titular_cell_phone: form.titular_cell_phone,
        titular_landline: form.titular_landline,
        titular_intl_prefix: form.titular_intl_prefix,
        titular_email: form.titular_email,
        titular_auth_contact: form.titular_auth_contact,
      };
      if (editingId) {
        const { error } = await supabase.from("insurance_policies").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_policies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success(editingId ? "Póliza actualizada" : "Póliza agregada");
      closeDialog();
    },
    onError: () => toast.error("Error al guardar póliza"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Póliza eliminada");
    },
    onError: () => toast.error("Error al eliminar póliza"),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    // Normalizar company para que coincida con las opciones del select (mayúsculas)
    const upperCompany = (p.company || "METLIFE").toUpperCase();
    const matched = ASEGURADORAS.find((a) => a === upperCompany) || "METLIFE";
    setForm({
      company: matched,
      policy_number: p.policy_number,
      numero_certificado: p.numero_certificado || "",
      tipo_contratacion: p.tipo_contratacion || p.policy_type || "individual",
      contractor_name: p.contractor_name || "",
      start_date: p.start_date,
      end_date: p.end_date || "",
      status: p.status,
      suma_asegurada: p.suma_asegurada?.toString() || "",
      deducible: p.deducible?.toString() || "",
      coaseguro_porcentaje: p.coaseguro_porcentaje?.toString() || "",
      tope_coaseguro: p.tope_coaseguro?.toString() || "",
      observaciones: p.observaciones || "",
      agente_nombre: p.agente_nombre || "",
      agente_clave: p.agente_clave || "",
      agente_telefono: p.agente_telefono || "",
      agente_estado: p.agente_estado || "",
      titular_paternal_surname: p.titular_paternal_surname || "",
      titular_maternal_surname: p.titular_maternal_surname || "",
      titular_first_name: p.titular_first_name || "",
      titular_dob: p.titular_dob || "",
      titular_birth_country: p.titular_birth_country || "México",
      titular_birth_state: p.titular_birth_state || "",
      titular_nationality: p.titular_nationality || "Mexicana",
      titular_occupation: p.titular_occupation || "",
      titular_rfc: p.titular_rfc || "",
      titular_street: p.titular_street || "",
      titular_ext_number: p.titular_ext_number || "",
      titular_int_number: p.titular_int_number || "",
      titular_postal_code: p.titular_postal_code || "",
      titular_neighborhood: p.titular_neighborhood || "",
      titular_municipality: p.titular_municipality || "",
      titular_city: p.titular_city || "",
      titular_state: p.titular_state || "",
      titular_country: p.titular_country || "México",
      titular_cell_phone: p.titular_cell_phone || "",
      titular_landline: p.titular_landline || "",
      titular_intl_prefix: p.titular_intl_prefix || "",
      titular_email: p.titular_email || "",
      titular_auth_contact: p.titular_auth_contact || false,
    });
    setOpen(true);
  };

  const policyFormContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Aseguradora</Label>
        <Select value={form.company} onValueChange={(v) => setForm({ ...form, company: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASEGURADORAS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Número de póliza</Label>
        <Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>No. de Certificado</Label>
        <Input
          value={form.numero_certificado}
          onChange={(e) => setForm({ ...form, numero_certificado: e.target.value })}
          placeholder="Número individual del asegurado"
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo de contratación</Label>
        <Select value={form.tipo_contratacion} onValueChange={(v) => setForm({ ...form, tipo_contratacion: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIPOS_CONTRATACION.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Nombre del contratante</Label>
        <Input value={form.contractor_name} onChange={(e) => setForm({ ...form, contractor_name: e.target.value })} placeholder="Razón social o nombre del contratante" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Fecha de inicio</Label>
          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Fecha final (opcional)</Label>
          <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Suma asegurada ($)</Label>
        <Input type="number" min="0" step="0.01" value={form.suma_asegurada} onChange={(e) => setForm({ ...form, suma_asegurada: e.target.value })} placeholder="0.00" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Deducible ($)</Label>
          <Input type="number" min="0" step="0.01" value={form.deducible} onChange={(e) => setForm({ ...form, deducible: e.target.value })} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>Coaseguro (%)</Label>
          <Input type="number" min="0" max="100" step="0.01" value={form.coaseguro_porcentaje} onChange={(e) => setForm({ ...form, coaseguro_porcentaje: e.target.value })} placeholder="0" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tope de coaseguro ($)</Label>
        <Input type="number" min="0" step="0.01" value={form.tope_coaseguro} onChange={(e) => setForm({ ...form, tope_coaseguro: e.target.value })} placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PolicyStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activa">Activa</SelectItem>
            <SelectItem value="inactiva">Inactiva</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Textarea
          value={form.observaciones}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          placeholder="Notas adicionales sobre la póliza..."
          rows={3}
        />
      </div>

      {/* Datos del Agente */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-medium text-sm mb-3">Datos del Agente</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nombre del agente</Label>
            <Input value={form.agente_nombre} onChange={(e) => setForm({ ...form, agente_nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Clave del agente</Label>
              <Input value={form.agente_clave} onChange={(e) => setForm({ ...form, agente_clave: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.agente_telefono} onChange={(e) => setForm({ ...form, agente_telefono: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado donde opera</Label>
            <Select value={form.agente_estado} onValueChange={(v) => setForm({ ...form, agente_estado: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_MX.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Datos del Titular */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-medium text-sm mb-3">Datos del Asegurado Titular</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Apellido paterno</Label>
            <Input value={form.titular_paternal_surname} onChange={(e) => setForm({ ...form, titular_paternal_surname: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Apellido materno</Label>
            <Input value={form.titular_maternal_surname} onChange={(e) => setForm({ ...form, titular_maternal_surname: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nombres</Label>
            <Input value={form.titular_first_name} onChange={(e) => setForm({ ...form, titular_first_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Fecha de nacimiento</Label>
            <Input type="date" value={form.titular_dob} onChange={(e) => setForm({ ...form, titular_dob: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>RFC</Label>
            <Input value={form.titular_rfc} onChange={(e) => setForm({ ...form, titular_rfc: e.target.value.toUpperCase() })} placeholder="XXXX000000XXX" maxLength={13} />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input type="email" value={form.titular_email} onChange={(e) => setForm({ ...form, titular_email: e.target.value })} />
          </div>
        </div>
      </div>

      <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.policy_number || !form.start_date}>
        {saveMutation.isPending ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mis Pólizas</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Póliza" : "Nueva Póliza"}</DialogTitle></DialogHeader>
            {policyFormContent}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : policies?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No tienes pólizas registradas</CardContent></Card>
      ) : (
        policies?.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {p.company}
                </CardTitle>
                <Badge variant={p.status === "activa" ? "default" : "secondary"}>
                  {p.status === "activa" ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-muted-foreground">Póliza: {p.policy_number}</p>
              {p.numero_certificado && (
                <p className="text-muted-foreground">Certificado: {p.numero_certificado}</p>
              )}
              <p className="text-muted-foreground text-xs">
                Vigencia: {format(new Date(p.start_date), "PP", { locale: es })}
                {p.end_date ? ` — ${format(new Date(p.end_date), "PP", { locale: es })}` : ""}
              </p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-destructive">
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar póliza?</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
