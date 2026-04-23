import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignedPatients } from "@/hooks/usePatientPersonnel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BloodPressureModule } from "@/components/presion/BloodPressureModule";

export default function PresionArterial() {
  const { user, roles } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPatient = roles.includes("paciente");
  const isPersonnel =
    roles.includes("medico") ||
    roles.includes("enfermero") ||
    roles.includes("admin") ||
    roles.includes("broker");

  const { data: assigned = [] } = useAssignedPatients();

  // Lista combinada: si soy paciente me incluyo, si soy personal incluyo asignados.
  const patientOptions = useMemo(() => {
    const items: { id: string; name: string }[] = [];
    if (isPatient && user) {
      items.push({ id: user.id, name: "Yo (mis tomas)" });
    }
    for (const a of assigned) {
      if (!items.some((it) => it.id === a.patient_id)) {
        items.push({ id: a.patient_id, name: a.patient_name ?? "Paciente" });
      }
    }
    return items;
  }, [isPatient, user, assigned]);

  const initialPatient =
    searchParams.get("paciente") ||
    (isPatient ? user?.id : patientOptions[0]?.id) ||
    user?.id ||
    "";

  const [selectedPatient, setSelectedPatient] = useState<string>(initialPatient);

  useEffect(() => {
    const p = searchParams.get("paciente");
    if (p && p !== selectedPatient) setSelectedPatient(p);
  }, [searchParams, selectedPatient]);

  useEffect(() => {
    if (!selectedPatient && patientOptions.length > 0) {
      setSelectedPatient(patientOptions[0].id);
    }
  }, [patientOptions, selectedPatient]);

  const { data: patientProfile } = useQuery({
    queryKey: ["bp-patient-profile", selectedPatient],
    enabled: !!selectedPatient,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, first_name, paternal_surname, email")
        .eq("user_id", selectedPatient)
        .maybeSingle();
      return data;
    },
  });

  const patientName = useMemo(() => {
    const p = patientProfile as any;
    if (!p) {
      if (selectedPatient === user?.id) return "Yo";
      return "Paciente";
    }
    return (
      p.full_name?.trim() ||
      [p.first_name, p.paternal_surname].filter(Boolean).join(" ").trim() ||
      p.email ||
      "Paciente"
    );
  }, [patientProfile, selectedPatient, user]);

  const showSelector = isPersonnel && patientOptions.length > 1;

  if (!selectedPatient) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto pb-12">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              No tienes pacientes asignados todavía. Cuando un paciente te otorgue acceso,
              podrás registrar y consultar sus tomas de presión.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 animate-fade-in">
      {showSelector && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Paciente:</span>
          <Select
            value={selectedPatient}
            onValueChange={(v) => {
              setSelectedPatient(v);
              setSearchParams((prev) => {
                const np = new URLSearchParams(prev);
                np.set("paciente", v);
                return np;
              });
            }}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {patientOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <BloodPressureModule patientId={selectedPatient} patientName={patientName} canEdit />
    </div>
  );
}