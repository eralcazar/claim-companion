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

const INITIAL_FORM = {
  first_name: "",
  paternal_surname: "",
  maternal_surname: "",
  date_of_birth: "",
  sex: "",
  rfc: "",
  curp: "",
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

  const Field = ({ id, label, type = "text", placeholder = "" }: { id: string; label: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
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
          <Field id="first_name" label="Nombre(s)" />
          <Field id="paternal_surname" label="Apellido Paterno" />
          <Field id="maternal_surname" label="Apellido Materno" />
          <Field id="date_of_birth" label="Fecha de Nacimiento" type="date" />
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
          <Field id="rfc" label="RFC" placeholder="XXXX000000XXX" />
          <Field id="curp" label="CURP" placeholder="XXXX000000XXXXXX00" />
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dirección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field id="street" label="Calle" />
          <div className="grid grid-cols-2 gap-3">
            <Field id="street_number" label="Número" />
            <Field id="interior_number" label="Número Interior" />
          </div>
          <Field id="neighborhood" label="Colonia" />
          <Field id="municipality" label="Municipio" />
          <Field id="state" label="Estado" />
          <Field id="postal_code" label="Código Postal" />
          <Field id="country" label="País" />
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field id="email" label="Correo Electrónico" type="email" />
          <Field id="phone" label="Teléfono" type="tel" />
        </CardContent>
      </Card>

      {/* Emergencia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos de Emergencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field id="emergency_contact_name" label="Nombre" />
          <Field id="emergency_contact_phone" label="Teléfono" type="tel" />
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
