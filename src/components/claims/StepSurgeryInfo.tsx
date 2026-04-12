import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

export default function StepSurgeryInfo({ form, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Datos del procedimiento o cirugía a programar
      </p>
      <div className="space-y-2">
        <Label>Nombre del médico cirujano</Label>
        <Input
          value={form.surgeon_name}
          onChange={(e) => onChange({ surgeon_name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Especialidad</Label>
          <Input
            value={form.surgeon_specialty}
            onChange={(e) => onChange({ surgeon_specialty: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Cédula profesional</Label>
          <Input
            value={form.surgeon_license}
            onChange={(e) => onChange({ surgeon_license: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Hospital donde se realizará</Label>
        <Input
          value={form.surgery_hospital}
          onChange={(e) => onChange({ surgery_hospital: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Fecha programada</Label>
        <Input
          type="date"
          value={form.surgery_date}
          onChange={(e) => onChange({ surgery_date: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Procedimiento o tratamiento a realizar</Label>
        <Textarea
          value={form.procedure_description}
          onChange={(e) => onChange({ procedure_description: e.target.value })}
          placeholder="Describe el procedimiento quirúrgico o tratamiento"
        />
      </div>
      <div className="space-y-2">
        <Label>Costo total estimado ($)</Label>
        <Input
          type="number"
          value={form.total_cost}
          onChange={(e) => onChange({ total_cost: e.target.value })}
          placeholder="0.00"
        />
      </div>
    </div>
  );
}
