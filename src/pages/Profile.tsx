import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const ESTADOS_MX = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

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
  street: "",
  street_number: "",
  interior_number: "",
  neighborhood: "",
  municipality: "",
  state: "",
  postal_code: "",
  country: "México",
  email: "",
  phone: "",
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
      setForm({
        first_name: (profile as any).first_name || "",
        paternal_surname: (profile as any).paternal_surname || "",
        maternal_surname: (profile as any).maternal_surname || "",
        date_of_birth: profile.date_of_birth || "",
        sex: (profile as any).sex || "",
        rfc: (profile as any).rfc || "",
        curp: (profile as any).curp || "",
        birth_country: (profile as any).birth_country || "México",
        birth_state: (profile as any).birth_state || "",
        nationality: (profile as any).nationality || "Mexicana",
        occupation: (profile as any).occupation || "",
        street: (profile as any).street || "",
        street_number: (profile as any).street_number || "",
        interior_number: (profile as any).interior_number || "",
        neighborhood: (profile as any).neighborhood || "",
        municipality: (profile as any).municipality || "",
        state: (profile as any).state || "",
        postal_code: (profile as any).postal_code || "",
        country: (profile as any).country || "México",
        email: profile.email || "",
        phone: profile.phone || "",
        emergency_contact_name: (profile as any).emergency_contact_name || "",
        emergency_contact_phone: (profile as any).emergency_contact_phone || "",
      });
    }
  }, [profile]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...form,
          full_name: `${form.first_name} ${form.paternal_surname} ${form.maternal_surname}`.trim(),
        } as any)
        .eq("user_id", user!.id);
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
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_MX.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderField("nationality", "Nacionalidad")}
          {renderField("occupation", "Ocupación")}
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
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_MX.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
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
          {renderField("phone", "Teléfono", "tel")}
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

      <Button variant="outline" className="w-full text-destructive" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}
