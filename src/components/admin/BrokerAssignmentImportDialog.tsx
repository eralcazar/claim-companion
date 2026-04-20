import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CSVImportDialog, type CSVValidationResult } from "./CSVImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AssignmentRow {
  patient_email: string;
  broker_email: string;
  patient_id?: string;
  broker_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** preloaded list to validate emails locally before import */
  users: { user_id: string; email: string | null; roles: string[] }[];
}

export function BrokerAssignmentImportDialog({ open, onOpenChange, users }: Props) {
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);

  const byEmail = new Map(
    users
      .filter((u) => u.email)
      .map((u) => [u.email!.trim().toLowerCase(), u]),
  );

  const parseRow = (raw: Record<string, string>, _i: number): CSVValidationResult<AssignmentRow> => {
    const errors: string[] = [];
    const patient_email = (raw.email_paciente || raw.patient_email || "").trim().toLowerCase();
    const broker_email = (raw.email_broker || raw.broker_email || "").trim().toLowerCase();

    if (!patient_email) errors.push("Falta email_paciente");
    if (!broker_email) errors.push("Falta email_broker");
    if (patient_email && broker_email && patient_email === broker_email)
      errors.push("Paciente y broker no pueden ser el mismo usuario");

    const patient = patient_email ? byEmail.get(patient_email) : undefined;
    const broker = broker_email ? byEmail.get(broker_email) : undefined;

    if (patient_email && !patient) errors.push("Paciente no existe");
    if (broker_email && !broker) errors.push("Broker no existe");
    if (patient && !patient.roles.includes("paciente")) errors.push("Usuario no tiene rol paciente");
    if (broker && !broker.roles.includes("broker")) errors.push("Usuario no tiene rol broker");

    if (errors.length > 0) {
      return { ok: false, row: { patient_email, broker_email }, errors };
    }

    return {
      ok: true,
      row: {
        patient_email,
        broker_email,
        patient_id: patient!.user_id,
        broker_id: broker!.user_id,
      },
      errors: [],
    };
  };

  const onImport = async (rows: AssignmentRow[]) => {
    setImporting(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const r of rows) {
        if (!r.patient_id || !r.broker_id) {
          fail++;
          continue;
        }
        // Replace any existing assignment for this patient
        const { error: delErr } = await supabase
          .from("broker_patients")
          .delete()
          .eq("patient_id", r.patient_id);
        if (delErr) {
          fail++;
          continue;
        }
        const { error: insErr } = await supabase
          .from("broker_patients")
          .insert({ broker_id: r.broker_id, patient_id: r.patient_id });
        if (insErr) fail++;
        else ok++;
      }
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      qc.invalidateQueries({ queryKey: ["broker_assignments"] });
      toast({
        title: "Importación completada",
        description: `${ok} asignadas${fail ? `, ${fail} con error` : ""}`,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <CSVImportDialog<AssignmentRow>
      open={open}
      onOpenChange={onOpenChange}
      title="Importar asignaciones broker–paciente"
      description="Sube un CSV con columnas email_paciente y email_broker. Las asignaciones existentes para cada paciente serán reemplazadas."
      templateHeaders={["email_paciente", "email_broker"]}
      templateExampleRow={["paciente@ejemplo.com", "broker@ejemplo.com"]}
      templateFilename="plantilla_asignaciones_broker.csv"
      parseRow={parseRow}
      previewColumns={[
        { key: "patient_email", label: "Email paciente" },
        { key: "broker_email", label: "Email broker" },
      ]}
      rowToPreview={(r) => ({ patient_email: r.patient_email, broker_email: r.broker_email })}
      onImport={onImport}
      isImporting={importing}
    />
  );
}