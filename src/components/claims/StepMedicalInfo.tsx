import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

export default function StepMedicalInfo({ form, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="font-medium">Causa de la reclamación</Label>
        <RadioGroup
          value={form.cause}
          onValueChange={(v) => onChange({ cause: v as ClaimFormData["cause"] })}
          className="flex gap-4 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="enfermedad" id="enfermedad" />
            <Label htmlFor="enfermedad">Enfermedad</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="accidente" id="accidente" />
            <Label htmlFor="accidente">Accidente</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="embarazo" id="embarazo" />
            <Label htmlFor="embarazo">Embarazo</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Fecha inicio de síntomas</Label>
          <Input
            type="date"
            value={form.symptom_start_date}
            onChange={(e) => onChange({ symptom_start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha primera atención</Label>
          <Input
            type="date"
            value={form.first_attention_date}
            onChange={(e) => onChange({ first_attention_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Diagnóstico</Label>
        <Input
          value={form.diagnosis}
          onChange={(e) => onChange({ diagnosis: e.target.value })}
          placeholder="Ej: Insuficiencia renal crónica"
        />
      </div>

      <div className="space-y-2">
        <Label>Descripción del tratamiento</Label>
        <Textarea
          value={form.treatment}
          onChange={(e) => onChange({ treatment: e.target.value })}
          placeholder="Describe el tratamiento recibido o requerido"
        />
      </div>

      {form.cause === "accidente" && (
        <div className="space-y-2">
          <Label>Describe cómo, cuándo y dónde ocurrió el accidente</Label>
          <Textarea
            value={form.accident_description}
            onChange={(e) => onChange({ accident_description: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Estudios de laboratorio y gabinete realizados</Label>
        <Textarea
          value={form.lab_studies}
          onChange={(e) => onChange({ lab_studies: e.target.value })}
          placeholder="Describe los estudios realizados y sus resultados"
        />
      </div>

      <div className="space-y-2">
        <Label>¿Ha presentado gastos anteriores por este padecimiento?</Label>
        <RadioGroup
          value={form.has_prior_claims ? "yes" : "no"}
          onValueChange={(v) => onChange({ has_prior_claims: v === "yes" })}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="no-prior" />
            <Label htmlFor="no-prior">No</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id="yes-prior" />
            <Label htmlFor="yes-prior">Sí</Label>
          </div>
        </RadioGroup>
        {form.has_prior_claims && (
          <Input
            value={form.prior_company}
            onChange={(e) => onChange({ prior_company: e.target.value })}
            placeholder="Nombre de la compañía"
            className="mt-2"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Notas adicionales (opcional)</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}
