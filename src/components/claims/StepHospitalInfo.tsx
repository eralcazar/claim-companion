import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

export default function StepHospitalInfo({ form, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Completa estos datos si hubo hospitalización o cirugía.
      </p>
      <div className="space-y-2">
        <Label>Nombre del hospital</Label>
        <Input
          value={form.hospital_name}
          onChange={(e) => onChange({ hospital_name: e.target.value })}
          placeholder="Ej: Hospital Ángeles"
        />
      </div>
      <div className="space-y-2">
        <Label>Dirección del hospital</Label>
        <Input
          value={form.hospital_address}
          onChange={(e) => onChange({ hospital_address: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Fecha de ingreso</Label>
          <Input
            type="date"
            value={form.admission_date}
            onChange={(e) => onChange({ admission_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de egreso</Label>
          <Input
            type="date"
            value={form.discharge_date}
            onChange={(e) => onChange({ discharge_date: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Días de hospitalización</Label>
        <Input
          type="number"
          value={form.hospitalization_days}
          onChange={(e) => onChange({ hospitalization_days: e.target.value })}
        />
      </div>
    </div>
  );
}
