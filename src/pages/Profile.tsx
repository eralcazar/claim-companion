import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ESTADOS_MX, ESTADOS_CIVILES, TIPOS_IDENTIFICACION } from "@/lib/constants";
import { Link } from "react-router-dom";
import { Pen } from "lucide-react";

const INITIAL_FORM = {
  first_name: "",
  paternal_surname: "",
  maternal_surname: "",
  date_of_birth: "",
  sex: "",
  rfc: "",
  curp: "",
  birth_country: "México",
  birth_state: "",
  nationality: "Mexicana",
  occupation: "",
  certificate_number: "",
  relationship_to_titular: "",
  // nuevos
  estado_civil: "",
  giro_negocio: "",
  es_pep: false,
  cargo_pep: "",
  tipo_identificacion: "",
  numero_identificacion: "",
  vigencia_identificacion: "",
  // dirección
  street: "",
  street_number: "",
  interior_number: "",
  neighborhood: "",
  municipality: "",
  state: "",
  postal_code: "",
  country: "México",
  // contacto
  email: "",
  phone: "",
  telefono_celular: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

export default function Profile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_FORM);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      const p: any = profile;
      setForm({
        first_name: p.first_name || "",
        paternal_surname: p.paternal_surname || "",
        maternal_surname: p.maternal_surname || "",
        date_of_birth: p.date_of_birth || "",
        sex: p.sex || "",
        rfc: p.rfc || "",
        curp: p.curp || "",
        birth_country: p.birth_country || "México",
        birth_state: p.birth_state || "",
        nationality: p.nationality || "Mexicana",
        occupation: p.occupation || "",
        certificate_number: p.certificate_number || "",
        relationship_to_titular: p.relationship_to_titular || "",
        estado_civil: p.estado_civil || "",
        giro_negocio: p.giro_negocio || "",
        es_pep: !!p.es_pep,
        cargo_pep: p.cargo_pep || "",
        tipo_identificacion: p.tipo_identificacion || "",
        numero_identificacion: p.numero_identificacion || "",
        vigencia_identificacion: p.vigencia_identificacion || "",
        street: p.street || "",
        street_number: p.street_number || "",
        interior_number: p.interior_number || "",
        neighborhood: p.neighborhood || "",
        municipality: p.municipality || "",
        state: p.state || "",
        postal_code: p.postal_code || "",
        country: p.country || "México",
        email: p.email || "",
        phone: p.phone || "",
        telefono_celular: p.telefono_celular || "",
        emergency_contact_name: p.emergency_contact_name || "",
        emergency_contact_phone: p.emergency_contact_phone || "",
      });
    }
  }, [profile]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        full_name: `${form.first_name} ${form.paternal_surname} ${form.maternal_surname}`.trim(),
        vigencia_identificacion: form.vigencia_identificacion || null,
        cargo_pep: form.es_pep ? form.cargo_pep : null,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil actualizado");
    },
    onError: () => toast.error("Error al guardar"),
  });

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  const renderField = (id: string, label: string, type = "text", placeholder = "") => (
    <div className="space-y-1.5" key={id}>
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <Input id={id} type={type} value={(form as any)[id]} onChange={set(id)} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto pb-24">
      <h1 className="font-heading text-2xl font-bold">Mi Perfil</h1>

      {/* Datos Personales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos Personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderField("first_name", "Nombre(s)")}
          {renderField("paternal_surname", "Apellido Paterno")}
          {renderField("maternal_surname", "Apellido Materno")}
          {renderField("date_of_birth", "Fecha de Nacimiento", "date")}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sexo</Label>
            <Select value={form.sex} onValueChange={(v) => setForm((f) => ({ ...f, sex: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hombre">Hombre</SelectItem>
                <SelectItem value="mujer">Mujer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderField("rfc", "RFC", "text", "XXXX000000XXX")}
          {renderField("curp", "CURP", "text", "XXXX000000XXXXXX00")}
          {renderField("birth_country", "País de Nacimiento")}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Estado de Nacimiento</Label>
            <Select value={form.birth_state} onValueChange={(v) => setForm((f) => ({ ...f, birth_state: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_MX.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderField("nationality", "Nacionalidad")}
          {renderField("occupation", "Ocupación")}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Estado civil</Label>
            <Select value={form.estado_civil} onValueChange={(v) => setForm((f) => ({ ...f, estado_civil: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_CIVILES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderField("giro_negocio", "Actividad o giro del negocio")}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">¿Es o ha sido Persona Políticamente Expuesta (PEP) en los últimos 4 años?</Label>
            <RadioGroup
              value={form.es_pep ? "si" : "no"}
              onValueChange={(v) => setForm((f) => ({ ...f, es_pep: v === "si" }))}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="pep_si" value="si" />
                <Label htmlFor="pep_si" className="text-sm">Sí</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="pep_no" value="no" />
                <Label htmlFor="pep_no" className="text-sm">No</Label>
              </div>
            </RadioGroup>
          </div>
          {form.es_pep && renderField("cargo_pep", "Cargo que desempeña o desempeñó")}

          {renderField("certificate_number", "No. de Certificado")}
          {renderField("relationship_to_titular", "Parentesco con el Asegurado Titular")}
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dirección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderField("street", "Calle")}
          <div className="grid grid-cols-2 gap-3">
            {renderField("street_number", "Número")}
            {renderField("interior_number", "Número Interior")}
          </div>
          {renderField("neighborhood", "Colonia")}
          {renderField("municipality", "Municipio")}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Estado</Label>
            <Select value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_MX.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderField("postal_code", "Código Postal")}
          {renderField("country", "País")}
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderField("email", "Correo Electrónico", "email")}
          {renderField("phone", "Teléfono fijo", "tel")}
          {renderField("telefono_celular", "Teléfono celular", "tel")}
        </CardContent>
      </Card>

      {/* Identificación Oficial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identificación Oficial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipo de identificación</Label>
            <Select value={form.tipo_identificacion} onValueChange={(v) => setForm((f) => ({ ...f, tipo_identificacion: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {TIPOS_IDENTIFICACION.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderField("numero_identificacion", "Número de identificación")}
          {renderField("vigencia_identificacion", "Vigencia", "date")}
        </CardContent>
      </Card>

      {/* Emergencia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos de Emergencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {renderField("emergency_contact_name", "Nombre")}
          {renderField("emergency_contact_phone", "Teléfono", "tel")}
        </CardContent>
      </Card>

      <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando..." : "Guardar cambios"}
      </Button>

      <Button asChild variant="outline" className="w-full">
        <Link to="/perfil/firmas">
          <Pen className="h-4 w-4 mr-1" /> Mis firmas electrónicas
        </Link>
      </Button>

      <Button variant="outline" className="w-full text-destructive" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}
