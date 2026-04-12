import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

export default function StepPatientInfo({ form, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">¿El paciente es el titular de la póliza?</Label>
      <RadioGroup
        value={form.patient_is_titular ? "yes" : "no"}
        onValueChange={(v) => onChange({ patient_is_titular: v === "yes" })}
        className="flex gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id="pt-yes" />
          <Label htmlFor="pt-yes">Sí</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id="pt-no" />
          <Label htmlFor="pt-no">No</Label>
        </div>
      </RadioGroup>

      {!form.patient_is_titular && (
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <h4 className="font-medium text-sm">Datos del Paciente Afectado</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pf">Nombre(s)</Label>
              <Input id="pf" value={form.patient_first_name} onChange={(e) => onChange({ patient_first_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pps">Apellido paterno</Label>
              <Input id="pps" value={form.patient_paternal_surname} onChange={(e) => onChange({ patient_paternal_surname: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pms">Apellido materno</Label>
              <Input id="pms" value={form.patient_maternal_surname} onChange={(e) => onChange({ patient_maternal_surname: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pdob">Fecha de nacimiento</Label>
              <Input id="pdob" type="date" value={form.patient_dob} onChange={(e) => onChange({ patient_dob: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pbc">País de nacimiento</Label>
              <Input id="pbc" value={form.patient_birth_country} onChange={(e) => onChange({ patient_birth_country: e.target.value })} placeholder="México" />
            </div>
            <div>
              <Label htmlFor="pbs">Estado de nacimiento</Label>
              <Input id="pbs" value={form.patient_birth_state} onChange={(e) => onChange({ patient_birth_state: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pocc">Ocupación</Label>
              <Input id="pocc" value={form.patient_occupation} onChange={(e) => onChange({ patient_occupation: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pcert">No. de certificado</Label>
              <Input id="pcert" value={form.patient_certificate_number} onChange={(e) => onChange({ patient_certificate_number: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="prel">Parentesco con el titular</Label>
              <Input id="prel" value={form.patient_relationship} onChange={(e) => onChange({ patient_relationship: e.target.value })} placeholder="Ej: Cónyuge, Hijo(a)" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
